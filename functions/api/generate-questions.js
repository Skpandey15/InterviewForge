/**
 * Cloudflare Pages Function — real LLM interview-question generation.
 *
 * Why this exists: the portal is a static site, so it cannot hold an API key
 * (anything shipped to the browser is readable by anyone). This runs
 * server-side on Cloudflare's free tier and is the only place the key lives.
 *
 * Configure ONE of these as a secret on the Pages project (never commit them):
 *   npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=ai-interview-portal
 *   npx wrangler pages secret put OPENAI_API_KEY    --project-name=ai-interview-portal
 * Optional: AIP_LLM_MODEL to override the default model.
 *
 * With no key configured this returns 501 and the client falls back to the
 * built-in question bank — the app degrades instead of breaking.
 */

const MAX_QUESTIONS = 20;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function buildPrompt({ technology, level, difficulty, count, questionType }) {
  const mix =
    {
      mcq: 'Every question must have type "MCQ".',
      coding: 'Every question must have type "Coding".',
      scenario: 'Every question must have type "Coding" and be scenario-based.',
      mixed: 'Alternate between "MCQ" and "Coding", starting with "MCQ".',
    }[questionType] || 'Alternate between "MCQ" and "Coding", starting with "MCQ".';

  const system = [
    'You are an expert technical interviewer writing questions for a real interview.',
    'Return ONLY a JSON object. No prose, no explanation, no markdown fences.',
    'Shape: {"questions":[{"type":"MCQ"|"Coding","text":string,"options":[string,string,string,string],"correctIndex":0|1|2|3}]}',
    'Rules:',
    '- "options" (exactly 4) and "correctIndex" are REQUIRED when type is "MCQ", and MUST be omitted when type is "Coding".',
    '- Exactly one MCQ option is correct; the other three must be plausible, not filler.',
    '- Every question must be specific to the given technology. Never generic computer-science trivia.',
    '- Calibrate to the stated experience level and difficulty.',
    '- Do not number the questions or repeat a question.',
  ].join('\n');

  const user =
    `Technology: ${technology}\n` +
    `Experience level: ${level}\n` +
    `Difficulty: ${difficulty}\n` +
    `Question mix: ${mix}\n\n` +
    `Generate exactly ${count} interview questions, every one specifically about ${technology}.`;

  return { system, user };
}

async function callAnthropic(key, model, system, user) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-5',
      max_tokens: 4096,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const data = await response.json();
  return data?.content?.[0]?.text ?? '';
}

async function callOpenAI(key, model, system, user) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

/** Validate the model's output — drop anything malformed rather than trust it. */
function parseQuestions(raw, count) {
  let text = String(raw).trim();
  if (text.startsWith('```')) text = text.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();

  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list)) throw new Error('Model did not return a questions array');

  const questions = [];
  for (const q of list) {
    if (!q || typeof q.text !== 'string' || !q.text.trim()) continue;
    const type = q.type === 'MCQ' ? 'MCQ' : 'Coding';
    if (type === 'MCQ') {
      const options = Array.isArray(q.options) ? q.options.filter((o) => typeof o === 'string' && o.trim()) : [];
      const correctIndex = Number(q.correctIndex);
      // An MCQ without 4 options and a valid answer is unusable — skip it.
      if (options.length !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) continue;
      questions.push({ id: `q-${questions.length}`, type, text: q.text.trim(), options, correctIndex });
    } else {
      questions.push({ id: `q-${questions.length}`, type, text: q.text.trim() });
    }
    if (questions.length >= count) break;
  }
  if (questions.length === 0) throw new Error('No valid questions in model output');
  return questions;
}

export async function onRequestPost({ request, env }) {
  const anthropicKey = env.ANTHROPIC_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;
  if (!anthropicKey && !openaiKey) {
    return json(
      { error: 'not_configured', message: 'No LLM API key is configured for this deployment.' },
      501,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request', message: 'Expected a JSON body.' }, 400);
  }

  const technology = String(body?.technology || '').trim() || 'Software Engineering';
  const level = String(body?.level || 'Mid-level');
  const difficulty = String(body?.difficulty || 'medium');
  const questionType = String(body?.questionType || 'mixed');
  const count = Math.max(1, Math.min(MAX_QUESTIONS, Number(body?.count) || 5));

  const { system, user } = buildPrompt({ technology, level, difficulty, count, questionType });

  try {
    const raw = anthropicKey
      ? await callAnthropic(anthropicKey, env.AIP_LLM_MODEL, system, user)
      : await callOpenAI(openaiKey, env.AIP_LLM_MODEL, system, user);
    return json({ questions: parseQuestions(raw, count), provider: anthropicKey ? 'anthropic' : 'openai' });
  } catch (error) {
    return json({ error: 'upstream_failed', message: String(error?.message || error) }, 502);
  }
}

/** Health/diagnostics: says whether a key is configured, never what it is. */
export async function onRequestGet({ env }) {
  const provider = env.ANTHROPIC_API_KEY ? 'anthropic' : env.OPENAI_API_KEY ? 'openai' : null;
  return json({ configured: provider !== null, provider, model: env.AIP_LLM_MODEL || null });
}

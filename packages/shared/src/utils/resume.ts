import type { AtsCriterion, Resume } from '../types';

/**
 * Resume parsing + ATS scoring.
 *
 * This is real text analysis, not a simulation: everything below is derived
 * from the text actually extracted from the uploaded file. Browsers cannot read
 * text out of a binary PDF/DOCX without a parser library, so `extractText`
 * reports whether it got usable text — the UI asks for a text resume (or a
 * paste) rather than inventing an ATS score for a file it could not read.
 */

const SKILL_KEYWORDS = [
  'java', 'spring boot', 'spring', 'hibernate', 'kafka', 'rabbitmq', 'microservices',
  'react', 'angular', 'vue', 'typescript', 'javascript', 'node.js', 'node',
  'python', 'django', 'fastapi', 'go', 'golang', 'rust', 'c#', '.net',
  'sql', 'postgresql', 'mysql', 'oracle', 'mongodb', 'redis', 'elasticsearch',
  'kubernetes', 'docker', 'terraform', 'jenkins', 'ci/cd', 'aws', 'azure', 'gcp',
  'system design', 'rest', 'graphql', 'grpc', 'junit', 'git', 'linux', 'kotlin',
];

const DEGREE_PATTERNS: Array<[RegExp, string]> = [
  [/\bph\.?\s?d\b|\bdoctorate\b/i, 'PhD'],
  [/\bm\.?\s?tech\b|\bmaster of technology\b/i, 'M.Tech'],
  [/\bm\.?\s?sc\b|\bmaster of science\b/i, 'M.Sc'],
  [/\bmca\b/i, 'MCA'],
  [/\bmba\b/i, 'MBA'],
  [/\bmaster'?s?\b/i, "Master's"],
  [/\bb\.?\s?tech\b|\bbachelor of technology\b/i, 'B.Tech'],
  // Require the dot: a bare "b e" would match the ordinary word "be".
  [/\bb\.\s?e\.?\b|\bbachelor of engineering\b/i, 'B.E.'],
  [/\bbca\b/i, 'BCA'],
  [/\bb\.?\s?sc\b/i, 'B.Sc'],
  [/\bbachelor'?s?\b/i, "Bachelor's"],
];

const ROLE_PATTERNS = [
  /\b(?:senior|lead|principal|staff)?\s*(?:software|backend|frontend|full[\s-]?stack|data|devops|cloud|platform)\s+(?:engineer|developer|architect)\b/i,
  /\b(?:engineering\s+manager|tech\s+lead|team\s+lead|architect|sre)\b/i,
];

const SECTION_WORDS = ['experience', 'education', 'skills', 'projects', 'summary', 'certifications', 'achievements'];

/** Strip control/binary bytes so we can tell real text from PDF/DOCX noise. */
function clean(raw: string): string {
  return raw.replace(/[^\x09\x0A\x0D\x20-\x7E -ɏ]/g, ' ').replace(/[ \t]{2,}/g, ' ');
}

/**
 * Pull usable text out of an uploaded file. Returns `ok: false` when the file
 * is a binary format we cannot read in the browser (PDF/DOCX without a parser).
 */
export async function extractText(file: File): Promise<{ ok: boolean; text: string }> {
  let raw = '';
  try {
    raw = await file.text();
  } catch {
    return { ok: false, text: '' };
  }
  const text = clean(raw);
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  const words = text.split(/\s+/).filter((w) => /^[A-Za-z][A-Za-z'.-]{1,}$/.test(w)).length;
  // Real resumes have plenty of words; binary noise does not.
  const ok = letters >= 200 && words >= 50;
  return { ok, text: ok ? text : '' };
}

function findSkills(lower: string): string[] {
  const found = SKILL_KEYWORDS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(lower);
  });
  // Drop the generic term when a more specific one matched (spring vs spring boot).
  const refined = found.filter((s) => !(s === 'spring' && found.includes('spring boot')));
  return [...new Set(refined)].map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()));
}

function findExperienceYears(text: string): number {
  const matches = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/gi)];
  const years = matches.map((m) => Number(m[1])).filter((n) => n > 0 && n <= 45);
  return years.length > 0 ? Math.max(...years) : 0;
}

function findEducation(text: string): string {
  for (const [pattern, label] of DEGREE_PATTERNS) if (pattern.test(text)) return label;
  return '';
}

function findRole(text: string): string {
  for (const pattern of ROLE_PATTERNS) {
    const m = text.match(pattern);
    if (m) return m[0].replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return '';
}

/** Analyse extracted resume text into a structured summary + ATS score. */
export function analyzeResume(fileName: string, text: string): Resume {
  const lower = text.toLowerCase();
  const skills = findSkills(lower);
  const experienceYears = findExperienceYears(text);
  const education = findEducation(text);
  const currentRole = findRole(text);

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(?:\+?\d[\d\s-]{8,}\d)/.test(text);
  const sections = SECTION_WORDS.filter((w) => lower.includes(w));
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Each criterion scores 0-100 from what the text actually contains.
  const skillsScore = Math.min(100, Math.round((skills.length / 8) * 100));
  const experienceScore = experienceYears > 0 ? Math.min(100, 40 + experienceYears * 10) : 0;
  const educationScore = education ? 100 : 0;
  const contactScore = (hasEmail ? 60 : 0) + (hasPhone ? 40 : 0);
  const structureScore = Math.min(100, Math.round((sections.length / 5) * 100));
  const lengthScore = wordCount >= 250 && wordCount <= 1200 ? 100 : wordCount >= 120 ? 60 : 25;

  const atsBreakdown: AtsCriterion[] = [
    { key: 'skills', label: 'Skills match', score: skillsScore, hint: `${skills.length} known skills found` },
    { key: 'experience', label: 'Experience', score: experienceScore, hint: experienceYears ? `${experienceYears} years detected` : 'No years of experience found' },
    { key: 'education', label: 'Education', score: educationScore, hint: education || 'No degree found' },
    { key: 'contact', label: 'Contact details', score: contactScore, hint: [hasEmail && 'email', hasPhone && 'phone'].filter(Boolean).join(' + ') || 'Missing' },
    { key: 'structure', label: 'Structure', score: structureScore, hint: `${sections.length}/5 standard sections` },
    { key: 'length', label: 'Length', score: lengthScore, hint: `${wordCount} words` },
  ];

  // Weighted — skills and experience dominate, as in a real ATS.
  const weights: Record<string, number> = { skills: 0.3, experience: 0.25, education: 0.1, contact: 0.1, structure: 0.15, length: 0.1 };
  const atsScore = Math.round(
    atsBreakdown.reduce((sum, c) => sum + c.score * (weights[c.key] ?? 0), 0),
  );

  const summaryParts = [
    currentRole || 'Candidate',
    experienceYears ? `with ${experienceYears} years of experience` : 'with experience not stated',
    skills.length ? `across ${skills.slice(0, 5).join(', ')}` : 'with no recognised technical skills listed',
    education ? `· ${education}` : '',
  ];

  return {
    fileName,
    uploadedAt: new Date().toISOString(),
    summary: summaryParts.filter(Boolean).join(' '),
    skills,
    experienceYears,
    education,
    currentRole,
    atsScore: Math.max(0, Math.min(100, atsScore)),
    atsBreakdown,
    text,
  };
}

/** Interviews below this ATS score may be rejected by the interviewer. */
export const ATS_THRESHOLD = 70;

export function defaultRejectionMessage(name: string, atsScore: number): string {
  return (
    `Dear ${name},\n\n` +
    `Thank you for taking the time to apply and share your resume with us. ` +
    `After an initial review, your profile scored ${atsScore}% against the requirements for this role, ` +
    `which is below the bar we have set for this position at the moment.\n\n` +
    `This is not a reflection of your ability or potential — it simply means the fit for this ` +
    `particular role is not quite there today. We would genuinely welcome an application from you ` +
    `for future openings that align more closely with your strengths.\n\n` +
    `We wish you every success in your search.\n\nWarm regards,\nThe Hiring Team`
  );
}

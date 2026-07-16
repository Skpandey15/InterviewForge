import type { InterviewConfig } from '@aip/shared';

/** A generated interview question for the mock (no-backend) run screen. */
export interface MockQuestion {
  id: string;
  type: 'MCQ' | 'Coding';
  text: string;
  options?: string[]; // MCQ only
  correctIndex?: number; // MCQ only
}

interface McqSeed {
  text: string;
  options: string[];
  correctIndex: number;
}

const MCQ_BANK: Record<string, McqSeed[]> = {
  'java-backend': [
    {
      text: 'Which collection guarantees O(1) average-time lookups by key in Java?',
      options: ['ArrayList', 'HashMap', 'LinkedList', 'TreeMap'],
      correctIndex: 1,
    },
    {
      text: 'What does the `volatile` keyword primarily guarantee?',
      options: ['Atomicity of compound actions', 'Visibility of writes across threads', 'Mutual exclusion', 'Thread priority'],
      correctIndex: 1,
    },
    {
      text: 'In Spring, what is the default bean scope?',
      options: ['prototype', 'request', 'singleton', 'session'],
      correctIndex: 2,
    },
  ],
  react: [
    {
      text: 'Which hook is used to run a side effect after render?',
      options: ['useMemo', 'useEffect', 'useRef', 'useState'],
      correctIndex: 1,
    },
    {
      text: 'Why should list items have a stable `key` prop?',
      options: ['For CSS styling', 'To help React reconcile items efficiently', 'To sort the list', 'For accessibility only'],
      correctIndex: 1,
    },
  ],
  default: [
    {
      text: 'What is the time complexity of binary search on a sorted array?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correctIndex: 1,
    },
    {
      text: 'Which HTTP status code indicates a successful resource creation?',
      options: ['200 OK', '201 Created', '204 No Content', '400 Bad Request'],
      correctIndex: 1,
    },
    {
      text: 'What does idempotency mean for an API operation?',
      options: [
        'It always returns the same status code',
        'Repeating it has the same effect as doing it once',
        'It never fails',
        'It runs asynchronously',
      ],
      correctIndex: 1,
    },
    {
      text: 'Which data structure is best for implementing a LIFO order?',
      options: ['Queue', 'Stack', 'Heap', 'Graph'],
      correctIndex: 1,
    },
  ],
};

const OPEN_BANK: Record<string, string[]> = {
  'java-backend': [
    'Implement an LRU cache with O(1) get and put operations. Explain your approach.',
    'Explain how you would diagnose and fix a memory leak in a production Spring Boot service.',
    'Design a rate limiter for an API handling 10k requests per second.',
  ],
  react: [
    'Write a custom `useDebounce` hook and explain when you would use it.',
    'How would you optimise a React list rendering 10,000 rows? Describe the techniques.',
  ],
  default: [
    'Write a function to detect whether a linked list has a cycle. Explain the algorithm.',
    'Describe how you would design the storage layer for a URL shortener handling 100M links/month.',
    'Explain idempotency and how you would enforce it in an event-driven system.',
    'Walk through how you would debug a service that intermittently returns 500 errors in production.',
  ],
};

/** Build the question set from the candidate's chosen config (deterministic). */
export function generateQuestions(config: InterviewConfig): MockQuestion[] {
  const count = Math.max(1, Number(config.questionCount) || 5);
  const mcqPool = [...(MCQ_BANK[config.technology] ?? []), ...MCQ_BANK.default];
  const openPool = [...(OPEN_BANK[config.technology] ?? []), ...OPEN_BANK.default];

  const wantMcq = (index: number): boolean => {
    switch (config.questionType) {
      case 'mcq':
        return true;
      case 'coding':
      case 'scenario':
        return false;
      case 'mixed':
      default:
        return index % 2 === 0;
    }
  };

  const questions: MockQuestion[] = [];
  let mcqIndex = 0;
  let openIndex = 0;
  for (let i = 0; i < count; i += 1) {
    if (wantMcq(i) && mcqPool.length > 0) {
      const seed = mcqPool[mcqIndex % mcqPool.length];
      mcqIndex += 1;
      questions.push({ id: `q-${i}`, type: 'MCQ', text: seed.text, options: seed.options, correctIndex: seed.correctIndex });
    } else {
      const text = openPool[openIndex % openPool.length];
      openIndex += 1;
      questions.push({ id: `q-${i}`, type: 'Coding', text });
    }
  }
  return questions;
}

/** Score answers 0–100: MCQ by correctness, open questions by a substantive answer. */
export function scoreAnswers(
  questions: MockQuestion[],
  answers: Record<string, string | number>,
): number {
  if (questions.length === 0) return 0;
  let points = 0;
  for (const q of questions) {
    const answer = answers[q.id];
    if (q.type === 'MCQ') {
      if (typeof answer === 'number' && answer === q.correctIndex) points += 1;
    } else {
      const text = typeof answer === 'string' ? answer.trim() : '';
      // Substantive answer → most credit; a short attempt → partial.
      if (text.length >= 40) points += 0.9;
      else if (text.length >= 10) points += 0.5;
    }
  }
  return Math.max(0, Math.min(100, Math.round((points / questions.length) * 100)));
}

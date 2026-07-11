import type {
  ActivityItem,
  AdminStats,
  AnalyticsData,
  BankQuestion,
  Candidate,
  InterviewTemplate,
  SelectOption,
} from '../types';

export const ADMIN_STATS: AdminStats = {
  totalCandidates: 0,
  interviewsScheduled: 0,
  interviewsCompleted: 0,
  passRate: 0,
  aiTokensUsed: '0',
  aiAccuracy: 0,
};

/** Clean slate — activity feed populates from real admin actions. */
export const RECENT_ACTIVITY: ActivityItem[] = [];

/** Clean slate — no seeded candidates. Add or import your own. */
export const SEED_CANDIDATES: Candidate[] = [];

/** Clean slate — no seeded questions. Add manually or generate with AI. */
export const SEED_QUESTIONS: BankQuestion[] = [];

/** Clean slate — no seeded interviews. Build and publish your own. */
export const SEED_TEMPLATES: InterviewTemplate[] = [];

export const ANALYTICS_DATA: AnalyticsData = {
  ranking: [],
  techPerformance: [],
  difficultyAnalysis: [],
  aiAccuracy: 0,
};

export const PROGRAMMING_LANGUAGES: SelectOption[] = [
  { value: 'java', label: 'Java' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'csharp', label: 'C#' },
];

export const EDITOR_THEMES: SelectOption[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'high-contrast', label: 'High Contrast' },
];

export const QUESTION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'MCQ', label: 'MCQ' },
  { value: 'Coding', label: 'Coding' },
  { value: 'System Design', label: 'System Design' },
  { value: 'Behavioral', label: 'Behavioral' },
];

export const BANK_DIFFICULTIES: SelectOption[] = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
  { value: 'Expert', label: 'Expert' },
];

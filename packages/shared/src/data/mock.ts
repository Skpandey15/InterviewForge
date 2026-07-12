import type {
  DashboardData,
  InterviewResult,
  InterviewSummary,
  SelectOption,
  User,
} from '../types';

/** Seeded demo accounts — shown as hints on the login screen. */
export const DEMO_CREDENTIALS = {
  email: 'sunil@demo.com',
  password: 'Demo@123',
} as const;

export const ADMIN_DEMO_CREDENTIALS = {
  email: 'admin@demo.com',
  password: 'Admin@123',
} as const;

export const INTERVIEWER_DEMO_CREDENTIALS = {
  email: 'interviewer@demo.com',
  password: 'Interview@123',
} as const;

export const DEMO_USER: User = {
  id: 'usr-demo-001',
  name: 'Sunil Kumar',
  email: DEMO_CREDENTIALS.email,
  mobile: '+91 98765 43210',
  role: 'candidate',
};

export const ADMIN_DEMO_USER: User = {
  id: 'usr-admin-001',
  name: 'Priya Sharma',
  email: ADMIN_DEMO_CREDENTIALS.email,
  mobile: '+91 99887 76655',
  role: 'admin',
};

export const INTERVIEWER_DEMO_USER: User = {
  id: 'usr-int-001',
  name: 'Rahul Mehta',
  email: INTERVIEWER_DEMO_CREDENTIALS.email,
  mobile: '+91 98111 22334',
  role: 'interviewer',
};

/** Clean slate — no seeded interview history. Real runs are stored per-user. */
export const RECENT_INTERVIEWS: InterviewSummary[] = [];

export const DASHBOARD_DATA: DashboardData = {
  stats: {
    upcomingInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    skillProgress: 0,
  },
  recentInterviews: RECENT_INTERVIEWS,
};

export const SEED_RESULT: InterviewResult = {
  id: 'ivw-1005',
  technology: 'Java Backend',
  level: 'Senior (8-12 yrs)',
  completedAt: '2025-05-09T14:30:00.000Z',
  overallScore: 87,
  passed: true,
  performanceLabel: 'Excellent Performance',
  breakdown: [
    { key: 'technical', label: 'Technical Skills', score: 90, color: 'var(--c-success)' },
    { key: 'problem-solving', label: 'Problem Solving', score: 85, color: 'var(--c-primary)' },
    { key: 'communication', label: 'Communication', score: 82, color: 'var(--c-purple)' },
    { key: 'system-design', label: 'System Design', score: 91, color: 'var(--c-orange)' },
  ],
  strengths: [
    'Strong in Spring Boot & Microservices',
    'Good understanding of Kafka',
    'Excellent in System Design',
  ],
  improvements: [
    'Improve DSA problem solving speed',
    'Work on Kubernetes & Networking',
    'Practice more on Low Level Design',
  ],
};

export const TECHNOLOGIES: SelectOption[] = [
  { value: 'java-backend', label: 'Java Backend' },
  { value: 'spring-boot', label: 'Spring Boot' },
  { value: 'react', label: 'React' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'system-design', label: 'System Design' },
  { value: 'kafka', label: 'Kafka' },
  { value: 'kubernetes', label: 'Kubernetes' },
  { value: 'aws', label: 'AWS' },
  { value: 'data-engineering', label: 'Data Engineering' },
];

export const EXPERIENCE_LEVELS: SelectOption[] = [
  { value: 'junior', label: 'Junior (0-2 yrs)' },
  { value: 'mid', label: 'Mid-level (3-5 yrs)' },
  { value: 'senior-5-8', label: 'Senior (5-8 yrs)' },
  { value: 'senior-8-12', label: 'Senior (8-12 yrs)' },
  { value: 'principal', label: 'Principal (12+ yrs)' },
];

export const DIFFICULTY_LEVELS: SelectOption[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
];

export const DURATIONS: SelectOption[] = [
  { value: '15', label: '15 Minutes' },
  { value: '30', label: '30 Minutes' },
  { value: '45', label: '45 Minutes' },
  { value: '60', label: '60 Minutes' },
  { value: '90', label: '90 Minutes' },
];

export const QUESTION_COUNTS: SelectOption[] = [
  { value: '5', label: '5 Questions' },
  { value: '10', label: '10 Questions' },
  { value: '15', label: '15 Questions' },
  { value: '20', label: '20 Questions' },
  { value: '30', label: '30 Questions' },
];

export const QUESTION_TYPES: SelectOption[] = [
  { value: 'mcq', label: 'MCQ Only' },
  { value: 'coding', label: 'Coding Only' },
  { value: 'mixed', label: 'Mixed (MCQ + Coding)' },
  { value: 'scenario', label: 'Scenario Based' },
];

const STRENGTH_POOL: Record<string, string[]> = {
  default: [
    'Clear and structured communication',
    'Good grasp of core fundamentals',
    'Handles follow-up questions confidently',
    'Strong debugging methodology',
  ],
  'java-backend': [
    'Strong in Spring Boot & Microservices',
    'Good understanding of Kafka',
    'Excellent in System Design',
  ],
  react: [
    'Solid understanding of hooks & rendering lifecycle',
    'Great component composition instincts',
    'Good knowledge of state management trade-offs',
  ],
  'system-design': [
    'Excellent capacity estimation',
    'Strong trade-off analysis (CAP, consistency models)',
    'Clear diagram-driven communication',
  ],
};

const IMPROVEMENT_POOL: Record<string, string[]> = {
  default: [
    'Improve DSA problem solving speed',
    'Work on Kubernetes & Networking',
    'Practice more on Low Level Design',
    'Elaborate answers with real project examples',
  ],
  react: [
    'Deepen knowledge of React Server Components',
    'Practice performance profiling & memoization',
    'Strengthen accessibility (a11y) fundamentals',
  ],
};

export function getStrengthsFor(technology: string): string[] {
  return (STRENGTH_POOL[technology] ?? STRENGTH_POOL.default).slice(0, 3);
}

export function getImprovementsFor(technology: string): string[] {
  return (IMPROVEMENT_POOL[technology] ?? IMPROVEMENT_POOL.default).slice(0, 3);
}

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
  totalCandidates: 128,
  interviewsScheduled: 24,
  interviewsCompleted: 342,
  passRate: 68,
  aiTokensUsed: '1.2M',
  aiAccuracy: 94,
};

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: 'act-1', text: 'Sunil Kumar completed "Java Backend — Senior" with 87%', time: '12 min ago', kind: 'interview' },
  { id: 'act-2', text: 'Interview "React — Mid-level Screening" published', time: '1 h ago', kind: 'system' },
  { id: 'act-3', text: 'Ananya Iyer was assigned "System Design — Senior"', time: '2 h ago', kind: 'candidate' },
  { id: 'act-4', text: '14 candidates imported from campus-drive.csv', time: '5 h ago', kind: 'candidate' },
  { id: 'act-5', text: 'Rahul Verma completed "Kafka — Intermediate" with 58%', time: 'Yesterday', kind: 'interview' },
  { id: 'act-6', text: 'AI generated 20 new questions for "Kubernetes"', time: 'Yesterday', kind: 'system' },
];

export const SEED_CANDIDATES: Candidate[] = [
  { id: 'cnd-001', name: 'Sunil Kumar', email: 'sunil@demo.com', technology: 'Java Backend', assignedInterview: 'Java Backend — Senior', status: 'Active', progress: 'Completed', score: 87, lastActivity: '2026-07-09' },
  { id: 'cnd-002', name: 'Ananya Iyer', email: 'ananya.iyer@mail.com', technology: 'System Design', assignedInterview: 'System Design — Senior', status: 'Active', progress: 'In Progress', lastActivity: '2026-07-09' },
  { id: 'cnd-003', name: 'Rahul Verma', email: 'rahul.verma@mail.com', technology: 'Kafka', assignedInterview: 'Kafka — Intermediate', status: 'Active', progress: 'Completed', score: 58, lastActivity: '2026-07-08' },
  { id: 'cnd-004', name: 'Meera Nair', email: 'meera.nair@mail.com', technology: 'React', assignedInterview: 'React — Mid-level Screening', status: 'Active', progress: 'Not Started', lastActivity: '2026-07-07' },
  { id: 'cnd-005', name: 'Arjun Singh', email: 'arjun.singh@mail.com', technology: 'Python', status: 'Active', progress: 'Not Started', lastActivity: '2026-07-06' },
  { id: 'cnd-006', name: 'Divya Patel', email: 'divya.patel@mail.com', technology: 'Spring Boot', assignedInterview: 'Spring Boot — Senior', status: 'Active', progress: 'Completed', score: 82, lastActivity: '2026-07-05' },
  { id: 'cnd-007', name: 'Karthik Rao', email: 'karthik.rao@mail.com', technology: 'AWS', status: 'Disabled', progress: 'Not Started', lastActivity: '2026-06-28' },
  { id: 'cnd-008', name: 'Sneha Gupta', email: 'sneha.gupta@mail.com', technology: 'Node.js', assignedInterview: 'Node.js — Junior', status: 'Active', progress: 'Completed', score: 74, lastActivity: '2026-07-02' },
];

export const SEED_QUESTIONS: BankQuestion[] = [
  { id: 'q-001', text: 'Explain how HashMap works internally in Java. What changed in Java 8?', technology: 'Java Backend', type: 'MCQ', difficulty: 'Medium', tags: ['collections', 'core-java'], timesUsed: 42, source: 'Manual' },
  { id: 'q-002', text: 'Design a rate limiter for a public REST API handling 10k RPS.', technology: 'System Design', type: 'System Design', difficulty: 'Hard', tags: ['scalability', 'api'], timesUsed: 31, source: 'Manual' },
  { id: 'q-003', text: 'Implement an LRU cache with O(1) get and put operations.', technology: 'Java Backend', type: 'Coding', difficulty: 'Hard', tags: ['dsa', 'cache'], timesUsed: 56, source: 'Imported' },
  { id: 'q-004', text: 'What happens when a Kafka consumer group rebalances? How do you minimize disruption?', technology: 'Kafka', type: 'MCQ', difficulty: 'Medium', tags: ['streaming', 'consumer-groups'], timesUsed: 18, source: 'AI Generated' },
  { id: 'q-005', text: 'Tell me about a time you disagreed with a technical decision. How did you handle it?', technology: 'Behavioral', type: 'Behavioral', difficulty: 'Easy', tags: ['teamwork', 'conflict'], timesUsed: 88, source: 'Manual' },
  { id: 'q-006', text: 'Why do React keys matter in lists? What bugs appear when using array indexes?', technology: 'React', type: 'MCQ', difficulty: 'Easy', tags: ['rendering', 'hooks'], timesUsed: 64, source: 'Manual' },
  { id: 'q-007', text: 'Write a function to detect a cycle in a directed graph (adjacency list input).', technology: 'Python', type: 'Coding', difficulty: 'Medium', tags: ['dsa', 'graphs'], timesUsed: 27, source: 'Imported' },
  { id: 'q-008', text: 'Design the storage layer for a URL shortener with 100M new links per month.', technology: 'System Design', type: 'System Design', difficulty: 'Expert', tags: ['databases', 'sharding'], timesUsed: 22, source: 'AI Generated' },
  { id: 'q-009', text: 'Explain Kubernetes liveness vs readiness probes with a failure scenario for each.', technology: 'Kubernetes', type: 'MCQ', difficulty: 'Medium', tags: ['probes', 'reliability'], timesUsed: 15, source: 'AI Generated' },
  { id: 'q-010', text: 'Describe a production incident you owned end-to-end. What did you change afterwards?', technology: 'Behavioral', type: 'Behavioral', difficulty: 'Medium', tags: ['ownership', 'incidents'], timesUsed: 47, source: 'Manual' },
];

export const SEED_TEMPLATES: InterviewTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Java Backend — Senior',
    technology: 'java-backend',
    experienceLevel: 'senior-8-12',
    difficulty: 'expert',
    durationMinutes: 60,
    distribution: { mcq: 10, coding: 5, systemDesign: 2, behavioral: 3 },
    aiSettings: {
      followUpQuestions: true,
      adaptiveDifficulty: true,
      webcamMonitoring: true,
      micMonitoring: true,
      tabSwitchDetection: true,
      randomizeQuestions: true,
      autoSubmit: true,
    },
    codingSettings: {
      language: 'java',
      editorTheme: 'dark',
      allowedLibraries: 'java.util.*, java.time.*',
      testCasesPerQuestion: 5,
      timeLimitMinutes: 20,
    },
    evaluationWeights: {
      technicalSkills: 30,
      communication: 15,
      problemSolving: 25,
      confidence: 10,
      grammar: 5,
      codeQuality: 15,
    },
    status: 'Published',
    updatedAt: '2026-07-08T09:30:00.000Z',
  },
  {
    id: 'tpl-002',
    name: 'React — Mid-level Screening',
    technology: 'react',
    experienceLevel: 'mid',
    difficulty: 'medium',
    durationMinutes: 45,
    distribution: { mcq: 12, coding: 3, systemDesign: 1, behavioral: 2 },
    aiSettings: {
      followUpQuestions: true,
      adaptiveDifficulty: false,
      webcamMonitoring: true,
      micMonitoring: true,
      tabSwitchDetection: true,
      randomizeQuestions: true,
      autoSubmit: false,
    },
    codingSettings: {
      language: 'typescript',
      editorTheme: 'light',
      allowedLibraries: 'react, lodash',
      testCasesPerQuestion: 3,
      timeLimitMinutes: 15,
    },
    evaluationWeights: {
      technicalSkills: 35,
      communication: 15,
      problemSolving: 25,
      confidence: 10,
      grammar: 5,
      codeQuality: 10,
    },
    status: 'Draft',
    updatedAt: '2026-07-09T07:10:00.000Z',
  },
];

export const ANALYTICS_DATA: AnalyticsData = {
  ranking: [
    { rank: 1, name: 'Sunil Kumar', technology: 'Java Backend', score: 87, interviews: 8 },
    { rank: 2, name: 'Divya Patel', technology: 'Spring Boot', score: 82, interviews: 5 },
    { rank: 3, name: 'Sneha Gupta', technology: 'Node.js', score: 74, interviews: 4 },
    { rank: 4, name: 'Ananya Iyer', technology: 'System Design', score: 71, interviews: 3 },
    { rank: 5, name: 'Rahul Verma', technology: 'Kafka', score: 58, interviews: 6 },
  ],
  techPerformance: [
    { technology: 'Java Backend', avgScore: 79, interviews: 96 },
    { technology: 'React', avgScore: 74, interviews: 61 },
    { technology: 'System Design', avgScore: 68, interviews: 44 },
    { technology: 'Spring Boot', avgScore: 77, interviews: 52 },
    { technology: 'Kafka', avgScore: 62, interviews: 29 },
    { technology: 'Kubernetes', avgScore: 59, interviews: 21 },
  ],
  difficultyAnalysis: [
    { bucket: 'Easy', correctRate: 86, questions: 320 },
    { bucket: 'Medium', correctRate: 71, questions: 540 },
    { bucket: 'Hard', correctRate: 52, questions: 280 },
    { bucket: 'Expert', correctRate: 34, questions: 90 },
  ],
  aiAccuracy: 94,
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

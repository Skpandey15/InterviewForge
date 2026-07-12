export type UserRole = 'admin' | 'candidate' | 'interviewer';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
}

export type FeedbackVerdict = 'Selected' | 'Not Selected';

/** Interviewer's evaluation of a candidate — generated via (mock) LLM, editable. */
export interface CandidateFeedback {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  verdict: FeedbackVerdict;
  by: string; // interviewer name
  at: string; // ISO datetime
}

export interface Interviewer {
  id: string;
  name: string;
  email: string;
  expertise: string;
}

export interface Technology {
  id: string;
  name: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export type InterviewLevel = 'Junior' | 'Intermediate' | 'Senior';
export type InterviewStatus = 'Completed' | 'In Progress';

export interface InterviewSummary {
  id: string;
  technology: string;
  level: string;
  date: string; // ISO date
  status: InterviewStatus;
  score: number; // 0-100
}

export interface DashboardStats {
  upcomingInterviews: number;
  completedInterviews: number;
  averageScore: number; // 0-100
  skillProgress: number; // 0-100
}

export interface DashboardData {
  stats: DashboardStats;
  recentInterviews: InterviewSummary[];
}

export type AiVoice = 'male' | 'female';

export interface InterviewConfig {
  technology: string;
  experienceLevel: string;
  difficulty: string;
  durationMinutes: number;
  questionCount: number;
  questionType: string;
  aiVoice: AiVoice;
  webcamEnabled: boolean;
  micEnabled: boolean;
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  score: number; // 0-100
  color: string; // css color token value
}

export interface InterviewResult {
  id: string;
  technology: string;
  level: string;
  completedAt: string; // ISO datetime
  overallScore: number; // 0-100
  passed: boolean;
  performanceLabel: string;
  breakdown: ScoreBreakdownItem[];
  strengths: string[];
  improvements: string[];
  /** Real backend only: SUBMITTED/EVALUATING mean "poll again". Absent in mock mode. */
  status?: string;
}

/* ---------- Real interview session (backend mode) ---------- */

export interface SessionQuestion {
  index: number;
  text: string;
  sourceRefs: string[];
  idealAnswerPoints: string[];
}

export interface InterviewSessionData {
  id: string;
  status: string;
  technology: string;
  level: string;
  difficulty: string;
  questionSource: string;
  questions: SessionQuestion[];
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

/* ---------- Admin portal ---------- */

export type CandidateStatus = 'Active' | 'Disabled';
export type CandidateProgress = 'Not Started' | 'In Progress' | 'Completed';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  technology: string;
  assignedInterview?: string;
  assignedInterviewer?: string;
  feedback?: CandidateFeedback;
  status: CandidateStatus;
  progress: CandidateProgress;
  score?: number;
  lastActivity: string; // ISO date
}

export interface AdminStats {
  totalCandidates: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
  passRate: number; // %
  aiTokensUsed: string; // e.g. "1.2M"
  aiAccuracy: number; // %
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string; // humanized, e.g. "2h ago"
  kind: 'interview' | 'candidate' | 'system';
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentActivity: ActivityItem[];
}

export type QuestionType = 'MCQ' | 'Coding' | 'System Design' | 'Behavioral';

export interface BankQuestion {
  id: string;
  text: string;
  technology: string;
  type: QuestionType;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  tags: string[];
  timesUsed: number;
  source: 'Manual' | 'Imported' | 'AI Generated';
}

export interface QuestionDistribution {
  mcq: number;
  coding: number;
  systemDesign: number;
  behavioral: number;
}

export interface AiSettings {
  followUpQuestions: boolean;
  adaptiveDifficulty: boolean;
  webcamMonitoring: boolean;
  micMonitoring: boolean;
  tabSwitchDetection: boolean;
  randomizeQuestions: boolean;
  autoSubmit: boolean;
}

export interface CodingSettings {
  language: string;
  editorTheme: string;
  allowedLibraries: string;
  testCasesPerQuestion: number;
  timeLimitMinutes: number;
}

export interface EvaluationWeights {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  confidence: number;
  grammar: number;
  codeQuality: number;
}

export type InterviewTemplateStatus = 'Draft' | 'Published';

export interface InterviewTemplate {
  id: string;
  name: string;
  technology: string;
  experienceLevel: string;
  difficulty: string;
  durationMinutes: number;
  distribution: QuestionDistribution;
  aiSettings: AiSettings;
  codingSettings: CodingSettings;
  evaluationWeights: EvaluationWeights;
  status: InterviewTemplateStatus;
  updatedAt: string; // ISO datetime
}

export interface TechPerformance {
  technology: string;
  avgScore: number;
  interviews: number;
}

export interface DifficultyBucket {
  bucket: string;
  correctRate: number;
  questions: number;
}

export interface RankedCandidate {
  rank: number;
  name: string;
  technology: string;
  score: number;
  interviews: number;
}

export interface AnalyticsData {
  ranking: RankedCandidate[];
  techPerformance: TechPerformance[];
  difficultyAnalysis: DifficultyBucket[];
  aiAccuracy: number;
}

import { EXPERIENCE_LEVELS, TECHNOLOGIES } from '../data/mock';
import { authStore } from '../auth/store';
import { ApiError } from './errors';
import { AUTH_BASE_URL, INTERVIEW_BASE_URL, http } from './http';
import type {
  AuthSession,
  DashboardData,
  InterviewConfig,
  InterviewResult,
  InterviewSessionData,
  InterviewSummary,
  RegisterPayload,
  ScoreBreakdownItem,
  User,
  UserRole,
} from '../types';

/** Real transport: auth-service (:8083) + interview-platform (:8082). */

interface BackendUser {
  id: string;
  email: string;
  name: string;
  mobile?: string;
  role: 'ADMIN' | 'CANDIDATE';
}

interface BackendLoginResponse {
  token: string;
  user: BackendUser;
}

interface BackendCriterion {
  key: string;
  label: string;
  score: number;
}

interface BackendResult {
  id: string;
  status: string;
  technology: string;
  level: string;
  createdAt?: string;
  overallScore: number | null;
  passed: boolean | null;
  performanceLabel: string | null;
  criteria: BackendCriterion[];
  strengths: string[];
  improvements: string[];
}

const CRITERION_COLORS: Record<string, string> = {
  technical: 'var(--c-success)',
  'problem-solving': 'var(--c-primary)',
  communication: 'var(--c-purple)',
  depth: 'var(--c-orange)',
};

function toUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    mobile: user.mobile,
    role: user.role.toLowerCase() as UserRole,
  };
}

function labelOf(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function toSummary(result: BackendResult): InterviewSummary {
  return {
    id: result.id,
    technology: labelOf(TECHNOLOGIES, result.technology),
    level: labelOf(EXPERIENCE_LEVELS, result.level),
    date: (result.createdAt ?? new Date().toISOString()).slice(0, 10),
    status: result.status === 'EVALUATED' ? 'Completed' : 'In Progress',
    score: result.overallScore ?? 0,
  };
}

function toResult(result: BackendResult): InterviewResult {
  const breakdown: ScoreBreakdownItem[] = result.criteria.map((c) => ({
    key: c.key,
    label: c.label,
    score: c.score,
    color: CRITERION_COLORS[c.key] ?? 'var(--c-primary)',
  }));
  return {
    id: result.id,
    technology: labelOf(TECHNOLOGIES, result.technology),
    level: labelOf(EXPERIENCE_LEVELS, result.level),
    completedAt: result.createdAt ?? new Date().toISOString(),
    overallScore: result.overallScore ?? 0,
    passed: result.passed ?? false,
    performanceLabel: result.performanceLabel ?? 'Evaluating…',
    breakdown,
    strengths: result.strengths,
    improvements: result.improvements,
    status: result.status,
  };
}

export const realApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await http<BackendLoginResponse>(AUTH_BASE_URL, '/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    const session: AuthSession = { token: response.token, user: toUser(response.user) };
    authStore.setSession(session);
    return session;
  },

  async register(payload: RegisterPayload): Promise<User> {
    const user = await http<BackendUser>(AUTH_BASE_URL, '/api/v1/auth/register', {
      method: 'POST',
      body: payload,
      auth: false,
    });
    return toUser(user);
  },

  async logout(): Promise<void> {
    // Stateless JWT: discarding the token ends the session.
    authStore.clearSession();
  },

  async updateProfile(fullName: string, mobile: string): Promise<User> {
    const updated = await http<BackendUser>(AUTH_BASE_URL, '/api/v1/auth/me', {
      method: 'PUT',
      body: { fullName, mobile },
    });
    const user = toUser(updated);
    const session = authStore.getSession();
    if (session) authStore.setSession({ ...session, user });
    return user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http<void>(AUTH_BASE_URL, '/api/v1/auth/me/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },

  async getDashboard(): Promise<DashboardData> {
    const history = await http<BackendResult[]>(INTERVIEW_BASE_URL, '/api/v1/interviews/history');
    const evaluated = history.filter((r) => r.status === 'EVALUATED' && r.overallScore != null);
    const pending = history.filter((r) => r.status !== 'EVALUATED');
    const avg = (rows: BackendResult[]) =>
      rows.length ? Math.round(rows.reduce((sum, r) => sum + (r.overallScore ?? 0), 0) / rows.length) : 0;

    return {
      stats: {
        upcomingInterviews: pending.length,
        completedInterviews: evaluated.length,
        averageScore: avg(evaluated),
        skillProgress: avg(evaluated.slice(0, 3)), // recent-form trend
      },
      recentInterviews: history.slice(0, 6).map(toSummary),
    };
  },

  async getInterviewHistory(): Promise<InterviewSummary[]> {
    const history = await http<BackendResult[]>(INTERVIEW_BASE_URL, '/api/v1/interviews/history');
    return history.map(toSummary);
  },

  /** Mock-mode-only entry point; the interview MFE branches before calling it. */
  async completeInterview(_config: InterviewConfig, _labels: { technology: string; level: string }): Promise<string> {
    throw new ApiError('completeInterview is mock-mode only; use interviewApi in real mode.', 500);
  },

  async getResult(id?: string): Promise<InterviewResult> {
    if (!id || id === 'latest') {
      const history = await http<BackendResult[]>(INTERVIEW_BASE_URL, '/api/v1/interviews/history');
      if (history.length === 0) {
        throw new ApiError('No interviews yet — take your first one!', 404);
      }
      return toResult(history[0]);
    }
    return toResult(await http<BackendResult>(INTERVIEW_BASE_URL, `/api/v1/interviews/${id}/result`));
  },
};

/** Session flow (real mode only) — consumed by the interview MFE. */
export const interviewApi = {
  async start(config: InterviewConfig): Promise<InterviewSessionData> {
    return http<InterviewSessionData>(INTERVIEW_BASE_URL, '/api/v1/interviews', {
      method: 'POST',
      body: {
        technology: config.technology,
        level: config.experienceLevel,
        difficulty: config.difficulty,
        questionCount: Math.min(config.questionCount, 8), // Phase 1 KB depth
      },
    });
  },

  async submit(sessionId: string, answers: Array<{ index: number; text: string }>): Promise<InterviewResult> {
    const result = await http<BackendResult>(INTERVIEW_BASE_URL, `/api/v1/interviews/${sessionId}/submit`, {
      method: 'POST',
      body: { answers },
    });
    return toResult(result);
  },
};

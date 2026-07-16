import {
  ADMIN_DEMO_CREDENTIALS,
  ADMIN_DEMO_USER,
  DASHBOARD_DATA,
  DEMO_CREDENTIALS,
  DEMO_USER,
  INTERVIEWER_DEMO_CREDENTIALS,
  INTERVIEWER_DEMO_USER,
  RECENT_INTERVIEWS,
  SEED_RESULT,
  getImprovementsFor,
  getStrengthsFor,
} from '../data/mock';
import { authStore } from '../auth/store';
import type {
  AuthSession,
  DashboardData,
  InterviewConfig,
  InterviewResult,
  RegisterPayload,
  ScoreBreakdownItem,
  User,
} from '../types';

import { ApiError } from './errors';
import { API_MODE } from './http';
import { realApi } from './real';

export { ApiError } from './errors';
export { API_MODE, AUTH_BASE_URL, INTERVIEW_BASE_URL } from './http';
export { interviewApi } from './real';

/**
 * Simulated API layer (default). Mirrors the REST surface of the real
 * backend; VITE_API_MODE=real swaps in the HTTP transport (./real.ts)
 * behind the same facade — a transport change, not a UI change.
 */

const USERS_KEY = 'aip.users';
const RESULTS_KEY = 'aip.results';
const LATENCY_MS = 550;

/**
 * One-time data reset. Bump SEED_VERSION whenever the seed data changes and
 * existing visitors should start from a clean slate: on next load we drop the
 * stale `aip.*` data keys (but never the auth session), so localStorage is
 * re-seeded from the current mock data instead of the version cached earlier.
 */
const SEED_VERSION = '2026-07-12-clean-slate';
const SEED_VERSION_KEY = 'aip.seed.version';
const RESETTABLE_KEYS = [
  USERS_KEY,
  RESULTS_KEY,
  'aip.admin.candidates',
  'aip.admin.questions',
  'aip.admin.templates',
  'aip.admin.technologies',
];
if (API_MODE === 'mock') {
  try {
    if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
      RESETTABLE_KEYS.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    }
  } catch {
    /* localStorage unavailable — nothing to reset */
  }
}

function delay(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StoredUser extends User {
  password: string;
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function issueToken(userId: string): string {
  return `mock-jwt.${userId}.${Date.now().toString(36)}`;
}

function scoreFor(base: number, spread: number): number {
  return Math.min(99, Math.max(35, Math.round(base + (Math.random() - 0.5) * spread)));
}

/** Locally-stored results (newest first) merged ahead of the seeded history. */
function storedSummaries(extra: InterviewResult[]) {
  const summaries = extra
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .map((r) => ({
      id: r.id,
      technology: r.technology,
      level: r.level,
      date: r.completedAt.slice(0, 10),
      status: 'Completed' as const,
      score: r.overallScore,
    }));
  return [...summaries, ...DASHBOARD_DATA.recentInterviews];
}

const mockApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    await delay();
    const normalized = email.trim().toLowerCase();

    if (normalized === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      const session = { token: issueToken(DEMO_USER.id), user: DEMO_USER };
      authStore.setSession(session);
      return session;
    }

    if (normalized === ADMIN_DEMO_CREDENTIALS.email && password === ADMIN_DEMO_CREDENTIALS.password) {
      const session = { token: issueToken(ADMIN_DEMO_USER.id), user: ADMIN_DEMO_USER };
      authStore.setSession(session);
      return session;
    }

    if (normalized === INTERVIEWER_DEMO_CREDENTIALS.email && password === INTERVIEWER_DEMO_CREDENTIALS.password) {
      const session = { token: issueToken(INTERVIEWER_DEMO_USER.id), user: INTERVIEWER_DEMO_USER };
      authStore.setSession(session);
      return session;
    }

    const users = readStore<StoredUser[]>(USERS_KEY, []);
    const match = users.find((u) => u.email === normalized && u.password === password);
    if (!match) {
      throw new ApiError('Invalid email or password. Try the demo accounts below.', 401);
    }
    const { password: _pw, ...user } = match;
    // Accounts stored before roles existed default to candidate.
    const session = { token: issueToken(user.id), user: { ...user, role: user.role ?? 'candidate' } };
    authStore.setSession(session);
    return session;
  },

  async register(payload: RegisterPayload): Promise<User> {
    await delay();
    const email = payload.email.trim().toLowerCase();
    const users = readStore<StoredUser[]>(USERS_KEY, []);

    if (
      email === DEMO_CREDENTIALS.email ||
      email === ADMIN_DEMO_CREDENTIALS.email ||
      email === INTERVIEWER_DEMO_CREDENTIALS.email ||
      users.some((u) => u.email === email)
    ) {
      throw new ApiError('An account with this email already exists.', 409);
    }

    const user: StoredUser = {
      id: `usr-${Date.now().toString(36)}`,
      name: payload.fullName.trim(),
      email,
      mobile: payload.mobile.trim(),
      role: 'candidate',
      password: payload.password,
    };
    writeStore(USERS_KEY, [...users, user]);
    const { password: _pw, ...publicUser } = user;
    return publicUser;
  },

  async logout(): Promise<void> {
    authStore.clearSession();
  },

  async updateProfile(fullName: string, mobile: string): Promise<User> {
    await delay();
    const session = authStore.getSession();
    if (!session) throw new ApiError('Not logged in.', 401);
    const user: User = { ...session.user, name: fullName.trim(), mobile: mobile.trim() };
    const users = readStore<StoredUser[]>(USERS_KEY, []);
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], name: user.name, mobile: user.mobile };
      writeStore(USERS_KEY, users);
    }
    authStore.setSession({ ...session, user });
    return user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await delay();
    const session = authStore.getSession();
    if (!session) throw new ApiError('Not logged in.', 401);
    if (session.user.email === DEMO_CREDENTIALS.email || session.user.email === ADMIN_DEMO_CREDENTIALS.email) {
      throw new ApiError('Demo account passwords cannot be changed in mock mode.', 403);
    }
    const users = readStore<StoredUser[]>(USERS_KEY, []);
    const index = users.findIndex((u) => u.id === session.user.id);
    if (index === -1 || users[index].password !== currentPassword) {
      throw new ApiError('Current password is incorrect.', 400);
    }
    users[index] = { ...users[index], password: newPassword };
    writeStore(USERS_KEY, users);
  },

  async getDashboard(): Promise<DashboardData> {
    await delay(400);
    const extra = readStore<InterviewResult[]>(RESULTS_KEY, []);
    return {
      stats: {
        ...DASHBOARD_DATA.stats,
        completedInterviews: DASHBOARD_DATA.stats.completedInterviews + extra.length,
      },
      recentInterviews: storedSummaries(extra).slice(0, 6),
    };
  },

  async getInterviewHistory() {
    await delay(400);
    return storedSummaries(readStore<InterviewResult[]>(RESULTS_KEY, []));
  },

  /**
   * Simulates running the full interview + evaluation pipeline and
   * returns the persisted result id.
   */
  /**
   * @param scorePercent when the candidate actually answered a question set, the
   *   real 0-100 score — the result is centred on it instead of being simulated.
   */
  async completeInterview(
    config: InterviewConfig,
    labels: { technology: string; level: string },
    scorePercent?: number,
  ): Promise<string> {
    await delay(300);

    const difficultyBase: Record<string, number> = { easy: 88, medium: 82, hard: 76, expert: 72 };
    const answered = scorePercent != null;
    const base = answered
      ? Math.max(0, Math.min(100, Math.round(scorePercent)))
      : difficultyBase[config.difficulty] ?? 80;
    // Answered runs vary around the real score; simulated runs use the old curve.
    const pick = (offset: number, spread: number): number =>
      answered
        ? Math.max(0, Math.min(100, Math.round(base + (Math.random() - 0.5) * spread)))
        : scoreFor(base + offset, spread);

    const breakdown: ScoreBreakdownItem[] = [
      { key: 'technical', label: 'Technical Skills', score: pick(4, 14), color: 'var(--c-success)' },
      { key: 'problem-solving', label: 'Problem Solving', score: pick(0, 16), color: 'var(--c-primary)' },
      { key: 'communication', label: 'Communication', score: pick(-2, 12), color: 'var(--c-purple)' },
      { key: 'system-design', label: 'System Design', score: pick(2, 16), color: 'var(--c-orange)' },
    ];
    const overall = answered
      ? base
      : Math.round(breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length);
    const passed = overall >= 60;

    const result: InterviewResult = {
      id: `ivw-${Date.now().toString(36)}`,
      technology: labels.technology,
      level: labels.level,
      completedAt: new Date().toISOString(),
      overallScore: overall,
      passed,
      performanceLabel:
        overall >= 85 ? 'Excellent Performance' : overall >= 70 ? 'Strong Performance' : overall >= 60 ? 'Fair Performance' : 'Needs Improvement',
      breakdown,
      strengths: getStrengthsFor(config.technology),
      improvements: getImprovementsFor(config.technology),
    };

    const results = readStore<InterviewResult[]>(RESULTS_KEY, []);
    writeStore(RESULTS_KEY, [...results, result]);
    return result.id;
  },

  async getResult(id?: string): Promise<InterviewResult> {
    await delay(400);
    const results = readStore<InterviewResult[]>(RESULTS_KEY, []);

    if (!id || id === 'latest') {
      const latest = results.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      return latest ?? SEED_RESULT;
    }
    const match = results.find((r) => r.id === id) ?? (id === SEED_RESULT.id ? SEED_RESULT : undefined);
    if (match) return match;

    // Seeded history rows have no stored result — synthesize a stable one
    // from the summary so drill-down always works with dummy data.
    const summary = RECENT_INTERVIEWS.find((s) => s.id === id);
    if (!summary) {
      throw new ApiError(`Interview result "${id}" was not found.`, 404);
    }
    const overall = summary.score;
    return {
      ...SEED_RESULT,
      id: summary.id,
      technology: summary.technology,
      level: summary.level,
      completedAt: `${summary.date}T10:00:00.000Z`,
      overallScore: overall,
      passed: overall >= 60,
      performanceLabel:
        overall >= 85 ? 'Excellent Performance' : overall >= 70 ? 'Strong Performance' : 'Fair Performance',
      breakdown: SEED_RESULT.breakdown.map((item, index) => ({
        ...item,
        score: Math.min(99, Math.max(40, overall + [3, -2, -5, 4][index])),
      })),
    };
  },
};

/** Facade: real transport when the app was built with VITE_API_MODE=real. */
export const api: typeof mockApi = API_MODE === 'real' ? realApi : mockApi;

import {
  ADMIN_STATS,
  ANALYTICS_DATA,
  RECENT_ACTIVITY,
  SEED_CANDIDATES,
  SEED_QUESTIONS,
  SEED_TEMPLATES,
} from '../data/adminMock';
import { ApiError } from './index';
import type {
  AdminDashboardData,
  AnalyticsData,
  BankQuestion,
  Candidate,
  InterviewTemplate,
  QuestionType,
} from '../types';

/**
 * Simulated admin API. Collections are seeded from mock data on first use
 * and persisted to localStorage so admin actions survive refreshes.
 */

const CANDIDATES_KEY = 'aip.admin.candidates';
const QUESTIONS_KEY = 'aip.admin.questions';
const TEMPLATES_KEY = 'aip.admin.templates';
const LATENCY_MS = 450;

function delay(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCollection<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    /* fall through to seed */
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed.slice();
}

function writeCollection(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const AI_QUESTION_TEMPLATES: Record<QuestionType, string[]> = {
  MCQ: [
    'Which statement about {tech} garbage collection / resource cleanup is correct under high load?',
    'What is the primary trade-off when tuning {tech} for throughput over latency?',
  ],
  Coding: [
    'Implement a bounded worker pool in {tech} that processes jobs with retry and backoff.',
    'Write a {tech} function that merges K sorted streams with O(N log K) complexity.',
  ],
  'System Design': [
    'Design a multi-region deployment strategy for a {tech} based service with 99.95% SLA.',
    'Design an event-driven audit pipeline around {tech} handling 50k events/sec.',
  ],
  Behavioral: [
    'Describe a situation where you had to defend a {tech} architecture decision to non-engineers.',
    'Tell me about mentoring a junior engineer through their first {tech} production issue.',
  ],
};

export const adminApi = {
  async getDashboard(): Promise<AdminDashboardData> {
    await delay(350);
    const candidates = readCollection<Candidate>(CANDIDATES_KEY, SEED_CANDIDATES);
    return {
      stats: { ...ADMIN_STATS, totalCandidates: 120 + candidates.length },
      recentActivity: RECENT_ACTIVITY,
    };
  },

  /* ---------- Candidates ---------- */

  async getCandidates(): Promise<Candidate[]> {
    await delay(350);
    return readCollection<Candidate>(CANDIDATES_KEY, SEED_CANDIDATES);
  },

  async addCandidate(input: Pick<Candidate, 'name' | 'email' | 'technology'>): Promise<Candidate> {
    await delay();
    const candidates = readCollection<Candidate>(CANDIDATES_KEY, SEED_CANDIDATES);
    if (candidates.some((c) => c.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new ApiError('A candidate with this email already exists.', 409);
    }
    const candidate: Candidate = {
      id: newId('cnd'),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      technology: input.technology,
      status: 'Active',
      progress: 'Not Started',
      lastActivity: new Date().toISOString().slice(0, 10),
    };
    writeCollection(CANDIDATES_KEY, [candidate, ...candidates]);
    return candidate;
  },

  /** rows: parsed CSV rows (name,email,technology). Returns imported count. */
  async importCandidates(rows: Array<{ name: string; email: string; technology: string }>): Promise<number> {
    await delay(700);
    const candidates = readCollection<Candidate>(CANDIDATES_KEY, SEED_CANDIDATES);
    const existing = new Set(candidates.map((c) => c.email.toLowerCase()));
    const fresh = rows
      .filter((r) => r.name && r.email && !existing.has(r.email.toLowerCase()))
      .map<Candidate>((r) => ({
        id: newId('cnd'),
        name: r.name.trim(),
        email: r.email.trim().toLowerCase(),
        technology: r.technology?.trim() || 'General',
        status: 'Active',
        progress: 'Not Started',
        lastActivity: new Date().toISOString().slice(0, 10),
      }));
    writeCollection(CANDIDATES_KEY, [...fresh, ...candidates]);
    return fresh.length;
  },

  async assignInterview(candidateId: string, templateName: string): Promise<Candidate> {
    await delay();
    const candidates = readCollection<Candidate>(CANDIDATES_KEY, SEED_CANDIDATES);
    const index = candidates.findIndex((c) => c.id === candidateId);
    if (index === -1) throw new ApiError('Candidate not found.', 404);
    candidates[index] = {
      ...candidates[index],
      assignedInterview: templateName,
      progress: 'Not Started',
      lastActivity: new Date().toISOString().slice(0, 10),
    };
    writeCollection(CANDIDATES_KEY, candidates);
    return candidates[index];
  },

  async toggleCandidateStatus(candidateId: string): Promise<Candidate> {
    await delay(300);
    const candidates = readCollection<Candidate>(CANDIDATES_KEY, SEED_CANDIDATES);
    const index = candidates.findIndex((c) => c.id === candidateId);
    if (index === -1) throw new ApiError('Candidate not found.', 404);
    candidates[index] = {
      ...candidates[index],
      status: candidates[index].status === 'Active' ? 'Disabled' : 'Active',
    };
    writeCollection(CANDIDATES_KEY, candidates);
    return candidates[index];
  },

  /* ---------- Question bank ---------- */

  async getQuestions(): Promise<BankQuestion[]> {
    await delay(350);
    return readCollection<BankQuestion>(QUESTIONS_KEY, SEED_QUESTIONS);
  },

  async addQuestion(input: Omit<BankQuestion, 'id' | 'timesUsed' | 'source'> & { source?: BankQuestion['source'] }): Promise<BankQuestion> {
    await delay();
    const questions = readCollection<BankQuestion>(QUESTIONS_KEY, SEED_QUESTIONS);
    const question: BankQuestion = {
      ...input,
      id: newId('q'),
      timesUsed: 0,
      source: input.source ?? 'Manual',
    };
    writeCollection(QUESTIONS_KEY, [question, ...questions]);
    return question;
  },

  async generateAiQuestion(technology: string, type: QuestionType): Promise<BankQuestion> {
    await delay(1100); // "the model is thinking"
    const pool = AI_QUESTION_TEMPLATES[type];
    const text = pool[Math.floor(Math.random() * pool.length)].replace('{tech}', technology);
    return this.addQuestion({
      text,
      technology,
      type,
      difficulty: 'Medium',
      tags: ['ai-generated', technology.toLowerCase().replace(/\s+/g, '-')],
      source: 'AI Generated',
    });
  },

  async deleteQuestion(id: string): Promise<void> {
    await delay(300);
    const questions = readCollection<BankQuestion>(QUESTIONS_KEY, SEED_QUESTIONS);
    writeCollection(QUESTIONS_KEY, questions.filter((q) => q.id !== id));
  },

  /* ---------- Interview templates (builder) ---------- */

  async getTemplates(): Promise<InterviewTemplate[]> {
    await delay(300);
    return readCollection<InterviewTemplate>(TEMPLATES_KEY, SEED_TEMPLATES);
  },

  async saveTemplate(
    template: Omit<InterviewTemplate, 'id' | 'updatedAt' | 'status'> & { id?: string },
    status: InterviewTemplate['status'],
  ): Promise<InterviewTemplate> {
    await delay();
    const templates = readCollection<InterviewTemplate>(TEMPLATES_KEY, SEED_TEMPLATES);
    const saved: InterviewTemplate = {
      ...template,
      id: template.id ?? newId('tpl'),
      status,
      updatedAt: new Date().toISOString(),
    };
    const index = templates.findIndex((t) => t.id === saved.id);
    if (index === -1) templates.unshift(saved);
    else templates[index] = saved;
    writeCollection(TEMPLATES_KEY, templates);
    return saved;
  },

  /* ---------- Analytics ---------- */

  async getAnalytics(): Promise<AnalyticsData> {
    await delay(400);
    return ANALYTICS_DATA;
  },
};

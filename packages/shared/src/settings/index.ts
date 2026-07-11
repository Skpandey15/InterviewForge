import type { AiVoice } from '../types';

/**
 * Per-user client preferences, persisted locally. Interview defaults are
 * consumed by the setup screen; notification toggles gate the (future)
 * email adapter in notification-service.
 */

export interface InterviewDefaults {
  technology: string;
  experienceLevel: string;
  difficulty: string;
  duration: string;
  questionCount: string;
  questionType: string;
  aiVoice: AiVoice;
  webcamEnabled: boolean;
  micEnabled: boolean;
}

export interface UserSettings {
  emailNotifications: boolean;
  interviewReminders: boolean;
  defaults: InterviewDefaults;
}

export const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  interviewReminders: true,
  defaults: {
    technology: 'java-backend',
    experienceLevel: 'senior-8-12',
    difficulty: 'expert',
    duration: '60',
    questionCount: '20',
    questionType: 'mixed',
    aiVoice: 'female',
    webcamEnabled: true,
    micEnabled: true,
  },
};

const keyFor = (userId: string) => `aip.settings.${userId}`;

export function getSettings(userId: string | undefined): UserSettings {
  if (!userId) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      defaults: { ...DEFAULT_SETTINGS.defaults, ...(parsed.defaults ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(userId: string, settings: UserSettings): void {
  localStorage.setItem(keyFor(userId), JSON.stringify(settings));
}

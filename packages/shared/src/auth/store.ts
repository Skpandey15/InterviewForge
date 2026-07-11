import { useSyncExternalStore } from 'react';
import type { AuthSession, User } from '../types';

/**
 * Cross-microfrontend auth store.
 *
 * State lives in localStorage so every remote (even a duplicated module
 * instance) reads the same source of truth; a DOM CustomEvent keeps all
 * mounted MFEs reactive to changes. This avoids relying on module-federation
 * singleton semantics for correctness.
 */
const SESSION_KEY = 'aip.session';
const AUTH_EVENT = 'aip:auth-changed';

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

let cache: AuthSession | null = readSession();
let cacheRaw: string | null = localStorage.getItem(SESSION_KEY);

function snapshot(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = readSession();
  }
  return cache;
}

function notify(): void {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export const authStore = {
  getSession: snapshot,

  setSession(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    notify();
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    notify();
  },

  subscribe(listener: () => void): () => void {
    window.addEventListener(AUTH_EVENT, listener);
    window.addEventListener('storage', listener); // cross-tab sync
    return () => {
      window.removeEventListener(AUTH_EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  },
};

export function useAuth(): { session: AuthSession | null; user: User | null } {
  const session = useSyncExternalStore(authStore.subscribe, authStore.getSession);
  return { session, user: session?.user ?? null };
}

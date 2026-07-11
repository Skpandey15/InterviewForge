import { authStore } from '../auth/store';
import { ApiError } from './errors';

/**
 * Transport config. Mode is decided at build time per app:
 *   VITE_API_MODE=real  → talk to the Spring/FastAPI backend
 *   (default) mock      → localStorage simulation
 * Base URLs are overridable for deployed environments.
 */
const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env) ?? {};

export const API_MODE: 'real' | 'mock' = env.VITE_API_MODE === 'real' ? 'real' : 'mock';
// Phase 2: everything enters through the Spring Cloud Gateway (:8080).
// Direct-service URLs remain overridable for gateway-less debugging.
export const AUTH_BASE_URL = env.VITE_API_BASE_AUTH ?? 'http://127.0.0.1:8080';
export const INTERVIEW_BASE_URL = env.VITE_API_BASE_INTERVIEW ?? 'http://127.0.0.1:8080';

interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function http<T>(baseUrl: string, path: string, options: HttpOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = authStore.getSession()?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Backend unreachable. Is it running?', 503);
  }

  if (response.status === 401 && options.auth !== false) {
    // Expired/invalid token: drop the session; route guards send the user to login.
    authStore.clearSession();
    throw new ApiError('Your session has expired. Please login again.', 401);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.message ?? payload.detail ?? payload.error ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

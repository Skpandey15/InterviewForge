import { datadogRum } from '@datadog/browser-rum';

/**
 * Datadog RUM (Real User Monitoring) — browser telemetry for the deployed app.
 *
 * Env-driven and INERT unless a RUM Application ID + Client Token are provided
 * at build time, so committing this is safe and it activates the moment the
 * credentials are configured (no telemetry leaves the browser otherwise).
 *
 * Build-time env (VITE_-prefixed so Vite inlines them). Get the first two from
 * Datadog → Digital Experience → RUM → Applications → New Application (Browser):
 *   VITE_DD_RUM_APPLICATION_ID
 *   VITE_DD_RUM_CLIENT_TOKEN
 *   VITE_DD_SITE      (default datadoghq.com; e.g. datadoghq.eu, us5.datadoghq.com)
 *   VITE_DD_ENV       (default production)
 *   VITE_DD_SERVICE   (default ai-interview-portal)
 *   VITE_DD_VERSION   (default 1.0.0)
 *   VITE_DD_SESSION_REPLAY_SAMPLE_RATE (default 0 — opt in to Session Replay)
 */
export function initDatadog(): void {
  const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env) ?? {};
  const applicationId = env.VITE_DD_RUM_APPLICATION_ID;
  const clientToken = env.VITE_DD_RUM_CLIENT_TOKEN;

  if (!applicationId || !clientToken) {
    return; // Not configured → no-op.
  }

  datadogRum.init({
    applicationId,
    clientToken,
    site: env.VITE_DD_SITE ?? 'datadoghq.com',
    service: env.VITE_DD_SERVICE ?? 'ai-interview-portal',
    env: env.VITE_DD_ENV ?? 'production',
    version: env.VITE_DD_VERSION ?? '1.0.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: Number(env.VITE_DD_SESSION_REPLAY_SAMPLE_RATE ?? '0'),
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    // Masks values typed into inputs (emails, passwords) before they leave the browser.
    defaultPrivacyLevel: 'mask-user-input',
  });
}

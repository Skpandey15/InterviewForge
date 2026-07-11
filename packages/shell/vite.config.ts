import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

/**
 * Remote entry URLs are overridable per environment so the shell can point
 * at deployed remotes (CDN/k8s ingress) without a code change.
 */
const remote = (envKey: string, port: number): string =>
  process.env[envKey] ?? `http://localhost:${port}/remoteEntry.js`;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        mfe_auth: {
          type: 'module',
          name: 'mfe_auth',
          entry: remote('REMOTE_AUTH_URL', 3001),
        },
        mfe_dashboard: {
          type: 'module',
          name: 'mfe_dashboard',
          entry: remote('REMOTE_DASHBOARD_URL', 3002),
        },
        mfe_interview: {
          type: 'module',
          name: 'mfe_interview',
          entry: remote('REMOTE_INTERVIEW_URL', 3003),
        },
        mfe_results: {
          type: 'module',
          name: 'mfe_results',
          entry: remote('REMOTE_RESULTS_URL', 3004),
        },
        mfe_admin: {
          type: 'module',
          name: 'mfe_admin',
          entry: remote('REMOTE_ADMIN_URL', 3005),
        },
      },
      filename: 'remoteEntry.js',
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router': { singleton: true },
      },
    }),
  ],
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  build: { target: 'chrome89' },
});

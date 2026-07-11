/**
 * Build every microfrontend in mock mode into a single combined static
 * directory (dist-deploy/) suitable for a $0 static host (Cloudflare Pages).
 *
 *   shell            -> /                (host + landing + routing)
 *   mfe-auth         -> /mfe-auth/       (federated remote)
 *   mfe-dashboard    -> /mfe-dashboard/
 *   mfe-interview    -> /mfe-interview/
 *   mfe-results      -> /mfe-results/
 *   mfe-admin        -> /mfe-admin/
 *
 * Everything is served from ONE origin, so there is no CORS to configure and
 * the shell points at its remotes with same-origin absolute paths — which work
 * regardless of the final *.pages.dev (or custom) domain.
 *
 * Usage:  node scripts/build-static.mjs
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'dist-deploy');

const remotes = ['mfe-auth', 'mfe-dashboard', 'mfe-interview', 'mfe-results', 'mfe-admin'];

function build(app, base, extraEnv) {
  console.log(`\n=== building ${app} (base=${base}) ===`);
  execSync(`npx vite build --base=${base}`, {
    cwd: join(root, 'packages', app),
    stdio: 'inherit',
    env: { ...process.env, VITE_API_MODE: 'mock', ...extraEnv },
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1) Remotes — each under its own base path.
for (const app of remotes) {
  build(app, `/${app}/`);
  cpSync(join(root, 'packages', app, 'dist'), join(OUT, app), { recursive: true });
}

// 2) Shell — at root, wired to the remotes above via same-origin paths.
build('shell', '/', {
  REMOTE_AUTH_URL: '/mfe-auth/remoteEntry.js',
  REMOTE_DASHBOARD_URL: '/mfe-dashboard/remoteEntry.js',
  REMOTE_INTERVIEW_URL: '/mfe-interview/remoteEntry.js',
  REMOTE_RESULTS_URL: '/mfe-results/remoteEntry.js',
  REMOTE_ADMIN_URL: '/mfe-admin/remoteEntry.js',
});
cpSync(join(root, 'packages', 'shell', 'dist'), OUT, { recursive: true });

// 3) SPA fallback so client-side routes (/admin, /dashboard, ...) resolve to the
//    shell. Real files (remoteEntry.js, /assets/*) are served before this rule.
writeFileSync(join(OUT, '_redirects'), '/* /index.html 200\n');

console.log(`\nDone. Combined static site is in: ${OUT}`);

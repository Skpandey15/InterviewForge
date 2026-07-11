# Deploying the free-tier demo (Cloudflare Pages)

This deploys the **frontend in mock mode** — all 6 microfrontends compiled to
static files and served from one origin. It's a fully working, shareable demo
(landing, login, candidate portal, simulated AI interview, PDF report, and the
whole admin portal) running entirely in the browser via `localStorage`. **No
backend, no database, no cost** — Cloudflare Pages' free tier hosts it
indefinitely with no cold starts.

> The real backend (Java services, Python AI gateway, Kafka, Postgres, Redis,
> MinIO, Grafana) is **not** part of this deploy — it needs always-on paid
> compute and can't run on a free tier. This ships the UX demo only.

## One-time setup

```bash
npm install            # if you haven't already
npx wrangler login     # opens your browser — authorize Cloudflare (free account)
```

## Deploy

```bash
npm run deploy
```

That runs `scripts/build-static.mjs` (builds all 6 apps into `dist-deploy/`),
then `wrangler pages deploy`. The first run creates a Pages project named
`ai-interview-portal` (from `wrangler.toml`) and prints your live URL, e.g.
`https://ai-interview-portal.pages.dev`. Every later `npm run deploy` publishes
a new version to the same URL.

**Demo logins** (or register a new candidate — stored in your browser):

| Portal    | Email             | Password   |
|-----------|-------------------|------------|
| Candidate | `sunil@demo.com`  | `Demo@123` |
| Admin     | `admin@demo.com`  | `Admin@123`|

## How the build is laid out

One origin, no CORS. The shell is the host; each remote sits under its own path
and is loaded at runtime via Module Federation:

```
dist-deploy/
  index.html, remoteEntry.js, assets/   <- shell  (served at /)
  mfe-auth/       remoteEntry.js, ...    <- /mfe-auth/
  mfe-dashboard/  ...                    <- /mfe-dashboard/
  mfe-interview/  ...                    <- /mfe-interview/
  mfe-results/    ...                    <- /mfe-results/
  mfe-admin/      ...                    <- /mfe-admin/
  _redirects                             <- SPA fallback: /* -> /index.html 200
```

The shell references its remotes with same-origin absolute paths
(`/mfe-auth/remoteEntry.js`, …), so the build is independent of the final
domain — it works on `*.pages.dev` or any custom domain with no rebuild.

## Alternative: deploy from GitHub (auto-deploy on push)

Instead of the CLI you can connect the repo in the Cloudflare dashboard
(Workers & Pages → Create → Pages → Connect to Git):

- **Build command:** `npm run build:static`
- **Build output directory:** `dist-deploy`
- **Node version:** 20 or newer

Cloudflare then rebuilds and redeploys on every push to the branch.

## Test the production build locally first (optional)

```bash
npm run build:static
npx serve -s dist-deploy -l 4173   # open http://localhost:4173
```

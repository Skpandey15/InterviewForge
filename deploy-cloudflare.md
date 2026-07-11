# Cloudflare Pages — Deploy Commands

Copy-paste command reference for deploying the static (mock-mode) frontend to
Cloudflare Pages' free tier. Run everything from the repo root.

- **Project name:** `ai-interview-portal`
- **Production URL:** https://ai-interview-portal.pages.dev
- **Build output:** `dist-deploy/` (all 6 microfrontends combined, one origin)

---

## 0. One-time setup (first time only)

```bash
# Install dependencies (includes wrangler as a dev dependency)
npm install

# Authenticate wrangler with your Cloudflare account (opens a browser)
npx wrangler login

# Create the Pages project (only needed once)
npx wrangler pages project create ai-interview-portal --production-branch=main
```

---

## 1. Deploy (the everyday command)

```bash
# Builds all 6 apps into dist-deploy/, then uploads to Cloudflare Pages
npm run deploy
```

`npm run deploy` runs `build:static` + `wrangler pages deploy --force`. It prints a
per-deployment URL (e.g. `https://<hash>.ai-interview-portal.pages.dev`) and
updates the production URL above.

### Equivalent, run manually (if you don't use the npm script)

```bash
# a) Build the combined static site
npm run build:static           # = node scripts/build-static.mjs

# b) Upload it to Cloudflare Pages
npx wrangler pages deploy --force --project-name=ai-interview-portal --branch=main --commit-dirty=true
```

> **Why `--force`?** The repo root is an npm workspace, which trips Cloudflare's
> new auto-detection. `--force` uses the classic Pages direct-upload path.
> **Why `--commit-dirty=true`?** Silences the "uncommitted changes" warning when
> deploying without committing first (optional).

---

## 2. Test the production build locally (optional, before deploying)

```bash
npm run build:static
npx serve -s dist-deploy -l 4173     # open http://localhost:4173
```

---

## 3. Verify / manage after deploy

```bash
# Who am I logged in as?
npx wrangler whoami

# List your Pages projects
npx wrangler pages project list

# List deployments for this project
npx wrangler pages deployment list --project-name=ai-interview-portal

# Tail live request logs
npx wrangler pages deployment tail --project-name=ai-interview-portal
```

---

## 4. Demo logins on the deployed site

| Portal    | Email             | Password    |
|-----------|-------------------|-------------|
| Candidate | `sunil@demo.com`  | `Demo@123`  |
| Admin     | `admin@demo.com`  | `Admin@123` |

---

## 5. Custom domain (optional)

Add it in the dashboard: **Workers & Pages → ai-interview-portal → Custom domains
→ Set up a domain**. No rebuild needed — the shell references its remotes with
same-origin paths, so it works on any domain.

---

## 6. Alternative: auto-deploy from GitHub (no CLI)

Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, then set:

- **Build command:** `npm run build:static`
- **Build output directory:** `dist-deploy`
- **Node version:** 20+

Cloudflare rebuilds and redeploys on every push to the branch.

---

## 7. CI/CD with Jenkins

A ready-to-use declarative pipeline lives in [`Jenkinsfile`](Jenkinsfile). It
checks out, installs, typechecks, builds `dist-deploy/`, and (on `main`) deploys
to Cloudflare Pages.

CI can't run the interactive `wrangler login`, so it authenticates with a
**Cloudflare API token** instead:

1. Create the token: Cloudflare dashboard → My Profile → API Tokens → Create
   Token → permission **Account → Cloudflare Pages → Edit**.
2. Add it to Jenkins as a **Secret text** credential with ID `cloudflare-api-token`.
3. Ensure the Pages project exists once:
   `npx wrangler pages project create ai-interview-portal --production-branch=main`.

The pipeline then runs (equivalent to the commands above, non-interactively):

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run build:static
npx wrangler pages deploy dist-deploy --force --project-name=ai-interview-portal --branch=main --commit-dirty=true
```

The pipeline targets a **Windows Jenkins host running the build inside a Linux
Docker container** (Docker Desktop or Rancher Desktop in Linux-container mode).
Because steps run inside the Linux container they use `sh`, not `bat`. Requires
the **Docker** + **Docker Pipeline** plugins and a `docker` CLI reachable by the
Jenkins agent's account. See the `Jenkinsfile` header for the full host
requirements and a fallback if the workspace mount misbehaves.

---

## Log out (if ever needed)

```bash
npx wrangler logout
```

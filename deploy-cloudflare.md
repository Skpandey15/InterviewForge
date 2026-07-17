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

## 6. Auto-deploy from GitHub (recommended — no CLI, no local build)

Cloudflare builds and deploys on every push to `main`. Nothing runs on your
machine, so there's no Docker/RAM cost.

> **Note:** the existing `ai-interview-portal` project was created via **Direct
> Upload** (wrangler). Cloudflare can't add a Git connection to a Direct-Upload
> project, so the Git route uses a **new** project. To keep the same
> `ai-interview-portal.pages.dev` URL, delete the old project first
> (Workers & Pages → ai-interview-portal → Settings → Delete) and name the new
> Git project `ai-interview-portal`. Otherwise pick any name and you'll get a
> new `<name>.pages.dev` URL.

**Steps (Cloudflare dashboard):**

1. **Workers & Pages → Create → Pages → Connect to Git.**
2. Authorize Cloudflare's GitHub app and select the repo **`Skpandey15/InterviewForge`**.
3. **Set up builds and deployments:**
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `npm run build:static`
   - **Build output directory:** `dist-deploy`
4. **Save and Deploy.**

The repo is already prepped: `.node-version` pins Node 22 and `wrangler.toml`
sets `pages_build_output_dir = "dist-deploy"`. After the first build, every push
to `main` auto-deploys and pull requests get preview URLs.

Since Cloudflare builds on push, you don't need Jenkins — the `Jenkinsfile` can
stay unused or be removed.

---

## 10. CI/CD with Jenkins

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

## 8. Real LLM question generation (Pages Function)

Interview questions are generated by a real LLM via a Cloudflare Pages Function
(`functions/api/generate-questions.js`). The API key lives **only** on the
server side — a static site cannot hold a key safely, since anything shipped to
the browser is readable by anyone.

Set **one** key as a secret on the Pages project (never commit it):

```bash
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=ai-interview-portal
#   or
npx wrangler pages secret put OPENAI_API_KEY    --project-name=ai-interview-portal
```

Optional: `AIP_LLM_MODEL` to override the model (defaults: `claude-sonnet-5` /
`gpt-4o-mini`). For GitHub-integration builds you can add the same values under
Pages → Settings → Environment variables (encrypted).

Check whether a key is configured (it never reveals the key itself):

```bash
curl https://ai-interview-portal.pages.dev/api/generate-questions
# {"configured":true,"provider":"anthropic","model":null}
```

**Without a key** the endpoint returns `501 not_configured` and the app falls
back to the built-in curated question bank, so interviews still work — they are
just less tailored.

---

## 9. Datadog RUM (Real User Monitoring)

The frontend ships the Datadog RUM SDK (`packages/shell/src/observability/datadog.ts`),
wired at startup. It is **inert until you supply credentials**, so nothing is
sent to Datadog unless configured.

To activate: Datadog → Digital Experience → RUM → Applications → **New
Application** (Browser). Copy the **Application ID** and **Client Token**, then
build/deploy with these env vars set:

```bash
VITE_DD_RUM_APPLICATION_ID=<app-id> \
VITE_DD_RUM_CLIENT_TOKEN=<client-token> \
VITE_DD_SITE=datadoghq.com \
VITE_DD_ENV=production \
npm run deploy
```

For the GitHub-integration build (§6), set the same `VITE_DD_*` variables in the
Cloudflare Pages project → Settings → Environment variables. Optional:
`VITE_DD_SITE` (regional, e.g. `datadoghq.eu`), `VITE_DD_SERVICE`,
`VITE_DD_VERSION`, `VITE_DD_SESSION_REPLAY_SAMPLE_RATE` (0–100, default 0).

> Datadog **backend** monitoring (APM traces / metrics / logs from the Java &
> Python services) is separate from RUM and does not run on Cloudflare — it
> needs a Datadog Agent + `DD_API_KEY` alongside the services.

---

## Log out (if ever needed)

```bash
npx wrangler logout
```

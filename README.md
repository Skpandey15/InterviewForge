# AI Interview Portal — React Microfrontends

Production-grade UX implementation of the AI Interview Portal, built as a
**Module Federation microfrontend platform** with dummy data — a public landing
page plus **two role-based portals** (Candidate + Admin). Frontend companion to
the platform described in [DESIGN.md](DESIGN.md).

## Flow

```
Landing (/) ──► Login ──┬── admin ────► Admin Portal   (/admin/*)
                        │              dashboard · candidates · builder ·
                        │              question bank · analytics · reports
                        └── candidate ► Candidate Portal
                                       dashboard · interview setup ·
                                       AI interview (simulated) · result
```

## Architecture

```
                 ┌──────────────────────────────────────────────────┐
                 │              shell  (host, :3000)                │
                 │  landing · routing · role guards · boundaries    │
                 └──┬────────┬─────────┬─────────┬─────────┬────────┘
                    │        │         │         │         │   Module Federation
             ┌──────▼───┐ ┌──▼──────┐ ┌▼───────┐ ┌▼───────┐ ┌▼──────────────┐
             │ mfe-auth │ │  mfe-   │ │  mfe-  │ │  mfe-  │ │   mfe-admin   │
             │  :3001   │ │dashboard│ │interview│ │results │ │     :3005     │
             │ Login    │ │  :3002  │ │  :3003 │ │ :3004  │ │ owns /admin/* │
             │ Register │ └──┬──────┘ └───┬────┘ └──┬─────┘ │ + own routing │
             └─────┬────┘    │            │         │       └───────┬───────┘
                   └─────────┴─────┬──────┴─────────┴───────────────┘
                          ┌────────▼────────┐
                          │   @aip/shared   │  design system · mock APIs ·
                          │ (workspace lib) │  auth store · types · pdf util
                          └─────────────────┘
```

| Package | Port | Exposes | Screens |
|---|---|---|---|
| `@aip/shell` | 3000 | host | Landing page, app frame, role guards, placeholders |
| `@aip/mfe-auth` | 3001 | `./LoginPage`, `./RegisterPage` | Login · Registration (role-aware redirect) |
| `@aip/mfe-dashboard` | 3002 | `./DashboardPage` | Candidate dashboard |
| `@aip/mfe-interview` | 3003 | `./InterviewSetupPage` | Interview setup + simulated run |
| `@aip/mfe-results` | 3004 | `./ResultPage` | Interview result + PDF report |
| `@aip/mfe-admin` | 3005 | `./AdminApp` | Admin dashboard · Candidate management (add / CSV import / assign / disable) · **Interview Builder** (distribution, AI/coding/evaluation settings, draft/preview/publish) · Question bank (+AI generate) · Analytics (+PDF/CSV export) · Reports |
| `@aip/shared` | — | imported lib | Design system, mock API + admin API, auth store, toast, PDF util |

**Stack:** React 19 · TypeScript 5.8 (strict) · Vite 6 · `@module-federation/vite` ·
React Router 7 · npm workspaces. No UI-kit dependency — the design system in
`@aip/shared` is hand-rolled (tokens, components, icons) to match the mockup.

## Getting started

**One command (Windows):**

```powershell
.\start-all.ps1     # containers + 4 Java services + ai-gateway + frontend (real mode)
.\stop-all.ps1      # stop app processes (-Containers to also stop Docker)
```

`start-all.ps1` is idempotent (healthy services are left alone), builds jars /
creates the Python venv / runs npm install when missing (`-Rebuild`,
`-NoFrontend` switches), and writes each service's output to `logs/`.

**Frontend only (mock mode, zero dependencies):**

```bash
npm install
npm run dev        # starts all 6 frontend apps → open http://localhost:3000
```

### Backend (Phase 1 walking skeleton — see ARCHITECTURE.md)

```bash
docker compose -f infrastructure/docker-compose.yml up -d   # Postgres+pgvector, Redis, Kafka (KRaft), MinIO

cd backend && mvn -DskipTests package                       # Java 17+, Maven 3.9+
java -jar auth-service/target/auth-service-1.0.0-SNAPSHOT.jar --spring.profiles.active=local   # :8083
java -jar interview-platform/target/interview-platform-1.0.0-SNAPSHOT.jar                      # :8082

cd ai/ai-gateway && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --port 8090                                       # :8090
```

Verified flow: login (`POST :8083/api/v1/auth/login`) → start interview
(`POST :8082/api/v1/interviews`, grounded questions with KB citations from the
ai-gateway, curated fallback bank if it refuses/is down) → submit answers →
**transactional outbox → Kafka `interview.session-submitted` → ai-gateway judge
→ Kafka `evaluation.score-calculated` → idempotent consumer** → poll
`GET /api/v1/interviews/{id}/result` until `EVALUATED`. The default provider is
a deterministic mock (no API key needed); set `AIP_LLM_PROVIDER=openai` +
`OPENAI_API_KEY` for a real model. Port note: auth runs on **8083** because
8081 is taken by the local k3d Traefik ingress on this machine.

### Frontend against the real backend

```bash
npm run dev:real     # same UI, real HTTP transport (VITE_API_MODE=real)
```

Real mode swaps the localStorage mock for the HTTP client in
`packages/shared/src/api/real.ts` behind the same `api` facade: real login/JWT,
dashboard computed from `/interviews/history`, and the results page **polls
until the Kafka evaluation lands**. The admin portal stays on mock data until
its backend exists. `npm run dev` remains the zero-dependency mock experience.

### Live AI Interview Screen (real mode)

Starting an interview in real mode opens the **live screen**: a streaming chat
with the AI interviewer (token-by-token SSE), webcam self-view (graceful
placeholder when denied/absent), elapsed timer, question progress, and
**tab-switch detection** — the proctoring toggle from the admin builder, made
real. The interviewer asks **grounded follow-ups**: if your answer misses a
rubric point, it probes exactly that point (max one follow-up per question,
enforced by Java, not the model). The wire path is ARCHITECTURE.md §5's
synchronous lane: browser ⇄ `POST /api/v1/interviews/{id}/turns` (SSE via
`SseEmitter`) ⇄ ai-gateway `/v1/interview-turns` — Kafka never sits in the
candidate's latency path; it only carries the final evaluation after the
last answer auto-submits through the same outbox pipeline.

### Phase 2 — gateway, observability, first extraction (verified)

```bash
docker compose -f infrastructure/docker-compose.yml up -d   # now also Prometheus :9090, Grafana :3300, Jaeger :16686
java -jar backend/gateway-service/target/gateway-service-1.0.0-SNAPSHOT.jar        # :8080 — single API entry
java -jar backend/notification-service/target/notification-service-1.0.0-SNAPSHOT.jar  # :8084 — Kafka consumer
```

- **Spring Cloud Gateway (:8080)** is the only URL the frontend talks to now:
  routes to auth/interviews/notifications, centralized CORS, Redis-backed
  per-user rate limiting. SSE streams through it (verified live turns).
- **Distributed tracing**: micrometer-tracing (Java) + OTel SDK (Python) →
  Jaeger via OTLP. The event envelope carries `traceparent`, so the async
  Kafka evaluation **joins the original request's trace** — verified: one
  13-span trace across gateway-service → interview-platform → ai-gateway.
- **Metrics**: every service exposes Prometheus metrics; the ai-gateway adds
  the AI-quality series (`ai_tokens_total` by operation/direction,
  `ai_turn_duration_seconds`, `ai_evaluations_total`, groundedness,
  grounded-or-refuse refusal counts). Grafana auto-provisions the
  "AIP — Platform & AI Quality" dashboard (:3300, anonymous viewer).
- **notification-service** demonstrates the extraction pattern: own
  deployable, own consumer group, own DB schema, idempotent — it turns
  `evaluation.score-calculated` into per-user notifications
  (`GET /api/v1/notifications` via the gateway).
- Deferred within Phase 2 (see ARCHITECTURE.md): Debezium CDC (outbox table
  is already CDC-shaped) and `analytics-service` (same pattern as notifications).

### Containers & Kubernetes

Dockerfiles: [backend/Dockerfile](backend/Dockerfile) (parameterized per Java
module), [ai/ai-gateway/Dockerfile](ai/ai-gateway/Dockerfile),
[Dockerfile.frontend](Dockerfile.frontend) (parameterized per MFE, nginx).
k3d/ArgoCD deployment — namespaces, data tier, services, ingress on
`*.aip.localtest.me:8081`, app-of-apps — lives in [k8s/](k8s/README.md).

**Demo logins** (or register a new candidate account — stored in localStorage):

| Portal | Email | Password |
|---|---|---|
| Candidate | `sunil@demo.com` | `Demo@123` |
| Admin | `admin@demo.com` | `Admin@123` |

Other scripts:

```bash
npm run build      # typecheck + production build of every app
npm run preview    # serve the production builds (all 5 ports)
npm run typecheck  # tsc across all workspaces
```

Each microfrontend also runs standalone (`npm run dev -w @aip/mfe-auth` → :3001),
which is the day-to-day workflow for a team owning a single MFE.

## Key design decisions

- **Runtime composition via Module Federation.** The shell lazy-loads each remote
  and wraps it in `RemoteBoundary` (Suspense + error boundary), so a dead remote
  degrades to a friendly retry panel instead of breaking the app.
- **Singleton shared deps** — `react`, `react-dom`, `react-router` are negotiated
  at runtime so all MFEs share one React and one router context. Imports use
  `react-router` (the v7 canonical package); the `react-router-dom` re-export shim
  does not survive federation share wrapping.
- **The admin remote owns its routing.** The shell mounts `AdminApp` at
  `/admin/*`; adding an admin section never requires a shell deploy. Links inside
  it are absolute on purpose — relative links under a splat-mounted `<Routes>`
  resolve against the splat-matched URL and accumulate segments.
- **Role-based access** — `RequireAdmin` guards `/admin/*`; login redirects by
  role; a candidate forcing `/admin` is bounced to their dashboard.
- **Framework-agnostic cross-MFE state.** Auth session lives in localStorage with
  a CustomEvent bridge (`useSyncExternalStore`), so every remote stays reactive to
  login/logout regardless of module duplication. Toasts use the same event-bus
  pattern.
- **Simulated API layer** (`@aip/shared/src/api`) mirrors the REST surface planned
  in DESIGN.md (§7) with latency, errors, and localStorage persistence — swapping
  to the real Spring Boot backend is a transport change, not a UI rewrite.
- **Env-overridable remote URLs** in the shell (`REMOTE_AUTH_URL`, …) so deployed
  environments can point at CDN/ingress-hosted remotes without a code change.
- **Report download** generates a real (dependency-free) PDF from the result data.

## Project layout

```
packages/
  shared/          # design tokens (styles/global.css), components, Icon set,
                   # types, mock data, candidate + admin APIs, auth store,
                   # toast bus, dependency-free PDF generator
  shell/           # host: landing page, App.tsx routes, role guards,
                   # AppLayout sidebar, RemoteBoundary
  mfe-auth/        # LoginPage, RegisterPage, validation, hero illustration
  mfe-dashboard/   # stats cards, quick actions, recent-interviews table
  mfe-interview/   # setup form + simulated interview-run overlay
  mfe-results/     # donut score, breakdown bars, verdict, PDF report
  mfe-admin/       # dark-sidebar admin portal: dashboard, candidates,
                   # interview builder, question bank, analytics, reports
```

## User flows

**Candidate:** `/login` → `/dashboard` → **Start Interview** → `/interview/setup`
→ simulated run (question generation → AI interviewer → evaluation) →
`/results/:id` with score breakdown, strengths and improvement areas → retake or
back to dashboard. Completed runs persist across refreshes (localStorage).

**Admin:** `/login` → `/admin` (pipeline stats + activity feed) → **Interview
Builder** (name, technology, level, difficulty, duration, question distribution
MCQ/Coding/System-Design/Behavioral, AI proctoring settings, coding settings,
evaluation weights that must total 100%) → save draft / preview / **publish** →
**Candidates** (add, import from CSV `name,email,technology`, assign the
published interview, disable) → **Analytics** (ranking, tech performance,
difficulty analysis, AI accuracy, PDF/CSV export) → **Reports** (candidate /
company / monthly / hiring PDF downloads generated from live mock data).

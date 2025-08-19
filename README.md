# Agent5 (Deliveriii) — Real‑time Delivery Management System

Agent5 is a mobile‑first, real‑time delivery management platform. Admins create and assign packages, drivers scan and update status in the field, and stakeholders observe live progress with sub‑second sync and robust offline support.

Repository layout:
- `apps/web`: React 18 + TypeScript + Vite PWA (Tailwind, shadcn/ui, React Router, Zustand, ZXing‑js, Socket.IO client)
- `apps/api`: Fastify (Node.js), Prisma/Postgres, Redis, Elasticsearch, S3 presign, Socket.IO server
- `packages/shared`: shared DTOs/types

## Overview

Agent5 orchestrates package lifecycle end‑to‑end:
- Admins manage packages and drivers in a web UI.
- Drivers scan packages on mobile using the device camera (ZXing‑js) with offline queueing.
- The API persists state (Postgres via Prisma), indexes to Elasticsearch, emits Socket.IO events, and writes audit trails.
- Ops teams monitor health via Prometheus/Grafana and enforce performance/security budgets in CI.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Zustand, ZXing‑js, PWA (Service Worker + Background Sync)
- Realtime: Socket.IO (client/server) with Redis adapter for scale
- Backend: Node.js (Fastify), Zod validation, Prisma ORM, JWT (jsonwebtoken) in HttpOnly cookies, bcrypt, Elasticsearch client, AWS SDK S3 presign
- Data/Infra: Postgres, Redis, Elasticsearch, S3‑compatible (MinIO), Docker Compose, Kubernetes, Helm
- Observability: Prometheus metrics (/metrics), Grafana dashboards (JSON), structured logging (Pino via Fastify logger)
- Security: Helmet CSP, CORS, rate limiting, RBAC guards, MFA stubs, CSRF token, IP allowlist, strict cookies
- Performance/QA: Lighthouse CI, WebPageTest, npm audit/Snyk (optional), Vitest (unit)

## How It Works

1. Admin creates a package, assigns a driver.
2. Driver scans barcode in the web app (camera via ZXing‑js). If offline, scans are queued with Background Sync.
3. API validates input (Zod), updates Postgres in a transaction, writes `AuditEntry` + `DeliveryEvent`, and write‑through indexes to Elasticsearch.
4. API emits realtime events to Socket.IO rooms (`admin`, `driver:{id}`, `package:{id}`) via Redis adapter; web clients update instantly.
5. Service worker flushes queued scans when connectivity resumes.

## Setup & Development

Prereqs: Node.js 18+, pnpm, Docker Desktop.

Environment:
- Copy `apps/api/.env.example` to `apps/api/.env` and adjust if needed.

Local services and dev servers (example PowerShell commands):

```powershell
# Install deps
pnpm i

# Start infra (Postgres, Redis, Elasticsearch, MinIO)
docker-compose up -d

# Migrate & seed
pnpm db:migrate
pnpm db:seed

# Run dev servers
pnpm dev:api
pnpm dev:web
```

## Remote run over HTTPS + Live Preview (Windows PowerShell)

Goal: run web and API locally and expose a single public HTTPS URL that proxies `/api/*` to the API and supports WebSockets for realtime and camera access.

1) Start backing services

```powershell
docker compose up -d
```

2) Migrate + seed database

```powershell
pnpm db:migrate
pnpm db:seed
```

3) Run API and Web (two terminals)

Terminal A (API):

```powershell
$env:NODE_ENV = 'development'
$env:WEB_ORIGIN = 'http://localhost:5173'   # will update to tunnel URL later
$env:CSRF_ENABLED = 'true'
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/deliveryapp?schema=public'
$env:REDIS_URL = 'redis://localhost:6379'
pnpm dev:api
# API on http://localhost:3000
```

Terminal B (Web):

```powershell
pnpm dev:web -- --host
# Web on http://localhost:5173
```

Vite is configured to proxy `/api/*` and `/socket.io` to `http://localhost:3000`, so the web app can call relative paths and use same-origin WebSockets when tunneled.

4) Expose with HTTPS (choose one)

- Cloudflare Tunnel (recommended):
	- Install cloudflared and login: `cloudflared tunnel login`
	- Quick temp URL: `cloudflared tunnel --url http://localhost:5173`
		- Copy the printed `https://*.trycloudflare.com` and set it as the public origin.
	- Or create a named tunnel and DNS route to your domain following Cloudflare docs.

- ngrok (fastest):
	- `ngrok config add-authtoken <YOUR_TOKEN>`
	- Expose web: `ngrok http 5173 --host-header=rewrite`
	- Expose API (second ngrok): `ngrok http 3000 --host-header=rewrite`

5) Wire env to the public URL

If using a single origin (Cloudflare with path routing `/api/*`):

```powershell
# In API terminal, stop and restart with:
$env:WEB_ORIGIN = 'https://<your-public-host>'
pnpm dev:api

# In web terminal, if needed (custom API origin):
# $env:VITE_API_BASE = 'https://<your-public-host>/api'
# Restart web dev server if you set envs.
```

If using two ngrok URLs, set on the web side:

```powershell
$env:VITE_API_BASE = 'https://<api-public-host>'
pnpm dev:web -- --host
```

6) Verify Socket.IO

- In browser DevTools → Network, the `socket.io/` request should upgrade to WebSocket (not long-polling).
- Realtime updates should reflect within ~200ms.

7) Acceptance checklist

- Open the public HTTPS URL on mobile; PWA install prompt appears.
- Camera permission granted; scanner opens; first decode < 1s.
- Two browsers (admin + driver) show realtime scan status changes.
- `/api/metrics` is accessible locally at `http://localhost:3000/metrics`; do not route it publicly in your tunnel.
- Lighthouse (local): `pnpm lh:ci` meets budgets (FCP < 1.5s, LCP < 2.5s, CLS < 0.1).

8) Stop

```powershell
# Stop tunnels: Ctrl+C in tunnel terminals
docker compose down
```

Endpoints:
- API Swagger UI: `http://localhost:3000/docs`
- API health: `http://localhost:3000/healthz`
- API metrics (Prometheus): `http://localhost:3000/metrics`
- Web dev: `http://localhost:5173/`

## Deployment

- CI/CD: build Docker images, run DB migrations, deploy via Helm (`charts/`) to Kubernetes.
- Strategies: blue‑green or canary. Keep Socket.IO behind sticky sessions or use the Redis adapter for scale.
- Config: environment variables mirror `.env.example` (JWT secrets, DB/Redis/ES/S3 endpoints, CORS origin, CSRF toggle, IP allowlist).
- Observability: scrape `/metrics`; import Grafana dashboards from `charts/grafana/dashboards`.

## Documentation

- API docs: OpenAPI served at `/docs` (source `apps/api/src/openapi.yaml`).
- Components: shadcn/ui primitives; Tailwind design tokens.
- Architecture: monorepo (web/api/shared); eventing via Socket.IO; search write‑through to Elasticsearch; service worker offline queue.
- Runbooks: infra services (Postgres, Redis, ES, MinIO), log/metric collection, token rotation.
- Compliance: cookies are HttpOnly/SameSite=Strict; CSRF token for state‑changing requests; rate limits; audit trail.
- Grafana: dashboards in `charts/grafana/dashboards`.

## Testing

- Unit: Vitest for isolated logic (state, utils).
- Integration: API route handlers with a test DB and Redis stub.
- E2E: browser tests (Playwright/Cypress – to be added) covering auth, scan, realtime updates.
- Performance: Lighthouse CI (`lighthouserc.json`) and WebPageTest (`webpagetest.json`).
- Security: `pnpm audit --prod` in CI; Snyk optional; consider OWASP ZAP for dynamic scans.

## KPIs & Metrics

- Uptime: 99.9% (SLO).
- Latency: API p95 < 500ms; Web FCP < 1.5s, LCP < 2.5s, CLS < 0.1 on mid‑range mobile.
- Error rate: < 0.1% (5xx/total).
- Bundle size: initial gzipped JS < 500KB (code‑splitting, dynamic imports for ZXing).

## Developer Iteration Notes

See `DEV_NOTES.md` for a detailed iteration journal and design tradeoffs.

Monitoring:
- API exposes Prometheus metrics at `/metrics`.
- Grafana dashboards are in `charts/grafana/dashboards`.
- Lighthouse CI config at `lighthouserc.json`; run `pnpm lh:ci` after building.

Security:
- See `SECURITY.md` for posture and STRIDE-lite model.

## Admin Item Templates and Dynamic Metadata

Admins can define reusable "Item Templates" that enforce custom fields on package creation.

- Create/edit under Web → Admin → Templates → Item Templates.
- A template has a JSON schema (v1) describing fields like select, checkbox, number, textarea, date, phone, email, photo-count, and signature-toggle, each with id, label, required, and extras.
- Publish the template to make it selectable in the New Package dialog.
- The Admin → New Package form lets you pick a published template; dynamic fields render inline. On submit, the API validates `metadata` against the template. If invalid, the server returns 422 with per-field errors which the UI maps to each field.

Seed data includes a published template "Standard Intake" so you can try this out immediately after `pnpm db:seed`.

### E2E quickstart (Cypress)

Prereqs: dev servers running (web on 5173, api on 3000), DB seeded.

```powershell
# from repo root
pnpm --filter @deliveryapp/web i  # ensure cypress is installed in web package
pnpm --filter @deliveryapp/web e2e:open
```

This opens Cypress. Run the spec "new-package-item-template.cy.ts". The test:
- Opens Admin dashboard, clicks New.
- Selects "Standard Intake" template.
- Submits with missing required metadata to trigger server validation.
- Fixes the field and submits successfully.


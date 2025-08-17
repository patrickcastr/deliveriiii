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


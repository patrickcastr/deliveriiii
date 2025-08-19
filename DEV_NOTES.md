# Developer Iteration Notes — Agent5 (Deliveriii)

This journal captures design decisions, tradeoffs, and implementation details across iterations.

## Iteration 1: Project Scaffolding & Architecture

Placeholder for dev notes.

- Monorepo initialization with pnpm workspaces (`apps/*`, `packages/*`).
- Base TypeScript config, ESLint/Prettier, Husky/lint-staged.
- Vite React app skeleton, Fastify API skeleton.
- Docker Compose for Postgres, Redis, Elasticsearch, MinIO.
- Helm chart skeletons for Kubernetes.

## Iteration 2: Data Model & Core Entities

Placeholder for dev notes.

- Prisma schema (`User`, `Package`, `AuditEntry`, `DeliveryEvent`, `Attachment`), enums, and indexes.
- Seed data and smoke tests.

## Iteration 3: Security, Auth, RBAC

Placeholder for dev notes.

- JWT in HttpOnly cookies (access/refresh with rotation via Redis), RBAC guards, rate limits, Zod validation, CORS + Helmet CSP.
- MFA stubs (server-side togglable).

## Iteration 4: API: Packages, Audit, Attachments

Placeholder for dev notes.

## Iteration 6: Web App UI (PWA, Scanner)

Placeholder for dev notes.
- ZXing-js camera scanner overlay; batch/manual modes; haptics/beep.
- Service worker caches GETs and queues POST `/api/v1/scan` for background sync.
- Zustand slices for auth, packages, scanner, realtime; theme toggle.

Placeholder for dev notes.


### What I changed

- Dashboards: Added Grafana JSON dashboards for API and Socket metrics under `charts/grafana/dashboards`.
- Lighthouse CI: Added `lighthouserc.json` and root script to run against `apps/web` preview; WebPageTest config added.
- DB indexes: Added `@@index([driverId, status])` to `Package` and `@@index([createdAt])` to `Attachment`; Prisma middleware to time queries with `db_query_duration_seconds` histogram.

- Edited: `apps/api/src/index.ts`, `apps/api/src/realtime.ts`, `apps/api/src/config.ts`, `apps/api/src/routes/v1/{scan.ts,packages.ts,attachments.ts,audit.ts}`, `apps/api/prisma/schema.prisma`, `apps/api/.env.example`, `apps/web/src/scanner/ScannerOverlay.tsx`, `apps/web/public/sw.js`, root `README.md`, root `package.json`, `apps/web/package.json`.

### What I ran and results

 **Prisma models**: `PackageRequirementTemplate`, `PackageChecklist` (+ links on `Package`).
 **Rules schema** in API (`RequirementRulesSchema`) covering:
- Installed API deps: `prom-client`, `ip-cidr`; root dev deps: `wait-on`, `@lhci/cli`.
- API build: PASS (tsc). Web build: PASS (Vite). Production audit: PASS (no known vulnerabilities for prod deps).
 **Templates CRUD**: `/api/v1/requirements/templates` (GET/POST/PUT/DELETE).
 **Checklist creation** on package creation with `rulesHash` and empty progress.
 **Enforcement middleware** on scan/status:

### How to use it
 **Web UI**:

- Prometheus: Scrape `http://<api-host>:3000/metrics`; import Grafana dashboards from `charts/grafana/dashboards`.
- IP allowlist: Set `IP_ALLOWLIST_CIDRS` (comma-separated CIDRs) to enable allowlist gating.
 **Realtime**: `requirements.progress_updated` events update UI live.
 **Seed**: `Standard Delivery` template (photo@delivery=1, signature=true, no backsteps).
- CSRF: Client must send `X-CSRF-Token` header equal to `csrf_token` cookie for non-GET requests. Web scanner and SW already handle this.
- Lighthouse CI: From repo root, run `pnpm build` then `pnpm lh:ci` to assert budgets; see `lighthouserc.json`.
### Requirements coverage

- Metrics & dashboards: Implemented and exposed; dashboards included.
- Security defenses: CSRF, brute-force, IP allowlist, strict cookies, Helmet CSP.
- Performance budgets: Lighthouse CI and WebPageTest config added.
- DB performance: Key indexes added; query timings via Prisma middleware.
- Deliverables: `/metrics`, Grafana dashboards, Lighthouse CI config, `SECURITY.md` provided.
### Next steps

- Add Snyk scanning in CI; configure alerts in Grafana (p95 > 500ms, error rate > 0.1%).
- E2E test suite (Playwright) for auth/scan/realtime; integration tests for API routes.
- Helm values for Prometheus scrape and Grafana provisioning.
- PgBouncer deployment and connection tuning guidance.

---

## Iteration 9: Package Requirements Templates + Enforcement
- **Rules schema** in API (`RequirementRulesSchema`) covering:
	- requiredStages, requirePhotoAtStages, requireSignatureAtDelivery,
	- disallowStatusBackwards, requiredFields, geofence, labelFormat, maxWeightKg (extensible).
- **Templates CRUD**: `/api/v1/requirements/templates` (GET/POST/PUT/DELETE).
- **Checklist creation** on package creation with `rulesHash` and empty progress.
- **Enforcement middleware** on scan/status:
	- Blocks invalid transitions and delivery if requirements unmet (422 with reasons).
	- Updates checklist progress; emits `requirements.progress_updated`.
- **Web UI**:
	- Admin Settings → Package Requirements (list + create/edit).
	- New Package dialog: select template (+ summary pill).
	- Driver view: checklist progress; disable “Mark Delivered” until satisfied; surface reasons.
- **Realtime**: `requirements.progress_updated` events update UI live.
- **Seed**: `Standard Delivery` template (photo@delivery=1, signature=true, no backsteps).

### Files touched
- API:
	- `domain/requirements.ts`, `routes/v1/requirements.ts`,
	- `middleware/enforceRequirements.ts`, `routes/v1/packages.ts` (create link),
	- Prisma schema & migration.
- Web:
	- `routes/admin-requirements.tsx` (new settings page),
	- `components/NewPackageDialog.tsx` (template select),
	- `routes/driver/*.tsx` (checklist display & gating),
	- `components/SignaturePad.tsx` (if required).
- Realtime:
	- server emit helpers + client subscriptions.

### How it works
1) Admin defines a template (rules JSON).  
2) When a package is created with that template, a `PackageChecklist` is instantiated (immutable rules via `rulesHash`).  
3) Scans/status updates call the enforcement middleware → progress updated or request blocked with explicit reasons.  
4) Delivery only succeeds once all requirements are met (photo/signature/geofence/etc.).  
5) UI reflects progress live via Socket.IO.

### Acceptance
- Cannot mark delivered if required photo/signature/geofence missing (422 with reasons).
- After meeting requirements, delivery completes and events broadcast to admin/driver rooms.
- New Package dialog supports template selection; Settings page manages templates.

### Acceptance criteria (dev)

Templates can be created/edited and are validated by Zod on both client and server.

Creating a package with a template creates a checklist.

Attempts to deliver without satisfying requirements are blocked with helpful messages.

Driver UI shows unmet requirements and updates in real time as they are satisfied.

DEV_NOTES.md contains Iteration 9 exactly as above.

## Iteration 10: NewPackageDialog stable hooks + RHF/Zod

What changed

- Rewrote `apps/web/src/components/NewPackageDialog.tsx` to ensure hooks execute in the same order every render.
- Introduced `react-hook-form` with a memoized Zod resolver for dynamic validation based on the selected template.
- Added a form remount key that bumps on schema changes to avoid conditional hooks.
- Kept all effects unconditional with internal guards; no hooks inside conditionals.
- Optimistic insert on submit with rollback on failure; CSRF header preserved.

Files touched

- `apps/web/src/components/NewPackageDialog.tsx` (full refactor)
- `apps/api/package.json` (pin `@fastify/helmet` to `^12.0.0` so workspace install succeeds)

Notes

- Web build now compiles with the updated dialog. If Vite warns about API proxy WS errors, start the API or ignore during UI-only work.
- Dependencies added to `apps/web/package.json`: `react-hook-form`, `@hookform/resolvers`.

### Iteration X: Stabilize Vite HMR + Dev CSP

- Vite HMR configured with explicit `host`, `port`, `protocol`, and `path` to prevent WS failures.
- Dev CSP updated to allow `connect-src` to `ws://localhost:5173` and API; avoided blocking HMR.
- Startup order documented: API first, then Web.
- Cleared node_modules and Vite caches to remove stale HMR states.
- Result: no HMR WS errors; no 500 on module load; dialog works end-to-end.

### Iteration X: Form schema types (API + Web)

- Added TypeScript form schema types for dynamic forms:
	- Field union: `text | textarea | number | select | checkbox | date | phone | email | photo-count | signature-toggle`.
	- Wrapper: `{ version: 1; fields: Field[] }`.
- API: `apps/api/src/types/forms.ts`.
- Shared for Web/API: `packages/shared/src/forms.ts` and re-exported from `packages/shared/src/index.ts`.

### Iteration X: API CRUD for Item Templates

- Added Fastify routes under `/api/v1/items/templates`:
	- GET `/api/v1/items/templates?status=draft|published|archived` — list
	- POST `/api/v1/items/templates` — create draft
	- PUT `/api/v1/items/templates/:id` — update name/description/schema
	- POST `/api/v1/items/templates/:id/publish` — set status to `published`
	- DELETE `/api/v1/items/templates/:id` — soft-archive (status `archived`)
- Validation: server-side Zod schema for dynamic form JSON (`version:1`, fields union: text, textarea, number, select, checkbox, date, phone, email, photo-count, signature-toggle).
- Security: `requireAuth('admin')` guard on all routes.
- Auditing: create/update/publish/archive actions write `AuditEntry` records.
- Wiring: registered module in `apps/api/src/index.ts`; ambient typing added to allow route-level `rateLimit` config without TS errors.

### Iteration X: Metadata validation on package creation

- `POST /api/v1/packages` now supports `itemTemplateId`.
- If provided, the API loads the published form template, verifies schema shape, builds a runtime Zod validator, and validates `metadata`.
- On validation failure: responds `422 { error: 'invalid_metadata', fields: { [fieldId]: [messages...] } }`.
- On success: persists validated `metadata` and links `itemTemplateId` to the Package.
- Unit tests cover the Zod builder for a few field types in `apps/api/test/packages.metadata.test.ts`.

### Iteration X: Admin UI for Form Templates

- New page: `apps/web/src/routes/admin-items.tsx`.
- Lists form templates; create/edit drafts with a minimal schema JSON editor and a helper to add fields with constraints.
- Actions: Save Draft (create/update), Publish, Archive via API.

## Iteration UI-8: Copy rewrite and a11y basics

- Plain-English labels across New Package dialog: “Recipient name”, “Phone”, “Delivery address”, “Driver ID (optional)”, “Item template”, “Requirement template”, and primary action “Save”.
- Every input/select/textarea now has an associated `<label>` via `htmlFor`/`id`.
- Error/help text is linked using `aria-describedby` and `aria-invalid` for screen readers.
- The New Package modal is a proper `role="dialog"` with `aria-modal` and a simple focus trap; Escape closes; click outside closes; focus restores to the opener.
- Buttons and interactive elements have visible focus outlines and meet color contrast (AA) with blue-600 on white and hover blue-700.
- Dynamic schema fields (`RenderDynamicFields`) now include proper labels and error associations for WCAG AA basics.
- Linked from Admin dashboard (Configuration card) and routed at `/admin/forms`.

### Iteration X: Dynamic Form Rendering in New Package

- NewPackageDialog now fetches published item templates and renders fields dynamically.
- Added `RenderDynamicFields` component to render form fields bound to `metadata.<id>` via react-hook-form.
- On API 422 `invalid_metadata`, a message prompts to fix fields; per-field errors are displayed when provided.
- Stable hooks ensured via useMemo and a form remount key on schema change.

### Iteration X: Seeded Example Template

- Seed adds a published item template “Standard Intake” with fields:
	- serviceLevel (select: standard, express, overnight) [required]
	- fragile (checkbox)
	- instructions (textarea, maxLength 500)
	- maxWeightKg (number, 0–100)
	- Extras: photos (photo-count, min 1), signature (signature-toggle, required)
- Visible in Admin → Item Templates and selectable in New Package dialog.


## Iteration UI-6: Scanner overlay polish (guidance, success, manual entry)

- Full-screen camera with soft overlay frame and micro-copy: “Align barcode in the frame”.
- Configurable feedback: Beep and haptic toggles in bottom controls.
- Success sheet: “Scanned • PKG-XXXX” with primary action “Update status” and secondary “View”.
- Manual entry: Toggle link opens inline form at bottom; submits to same /api/v1/scan endpoint.
- Keeps batch capability via “Scan another”.

XXXX” with primary action “Update status” and secondary “View”.
- Manual entry: Toggle link opens inline form at bottom; submits to same /api/v1/scan endpoint.
- Keeps batch capability via “Scan another”.
cess sheet: “Scanned • PKG-XXXX” with primary action “Update status” and secondary “View”.
- Manual entry: Toggle link opens inline form at bottom; submits to same /api/v1/scan endpoint.
- Keeps batch capability via “Scan another”.


## Iteration X: Fixed Husky pre-commit hook

- Removed deprecated Husky v10 bootstrap lines from `.husky/pre-commit`.
- Hook now runs only `npx lint-staged`.
- Validated by running lint-staged manually and an empty test commit.

## Iteration X+1: Synced project to GitHub with CI workflow scaffold

- Added `.github/workflows/ci.yml` to build the monorepo (Node 20, pnpm 9, frozen lockfile, recursive build).
- Configured CI to run on push and pull_request events.
- Pushed repository to GitHub remote `patrickcastr/deliveriiii`.


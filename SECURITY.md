# Security Overview

This document summarizes our security posture and a STRIDE-lite threat model for DeliveryApp.

## Checklist
- TLS everywhere in production (HTTP->HTTPS redirect).
- Strict cookies: HttpOnly, Secure, SameSite=Strict, scoped to '/'.
- JWT rotation: short-lived access, refresh in HttpOnly cookie; server-side revocation list in Redis.
- MFA (TOTP) support togglable; enforced when secret present.
- Input validation with Zod on all endpoints.
- CORS locked to configured web origin; preflight validated.
- Helmet with strict CSP (no inline except nonce), no object/embed, restricted base-uri.
- Rate limiting per-IP and per-endpoint; stronger limits on auth.
- Brute-force protection on login via Redis counters.
- Optional IP allowlist (CIDR) gate before routing.
- CSRF defense-in-depth: double-submit cookie token for state-changing requests.
- Central error handler with safe messages and structured logs.
- Secrets via env; no secrets in VCS.
- Dependency scanning with npm audit (CI) and Snyk (optional). Dev-only vulns documented if ignored.
- DB least privilege; Prisma prepared statements; parameterized queries only; field-level selection.
- Backups and logs retention defined outside this repo.

## STRIDE-lite
- Spoofing: JWT in HttpOnly cookies; verify signature and audience; Socket auth via cookie; MFA optional.
- Tampering: Zod validation, Prisma transactions, audit trail of critical changes; S3 presigned with short TTL.
- Repudiation: AuditEntry model records actor, action, timestamps, old/new state; logs include correlation IDs.
- Information Disclosure: TLS, minimal data in JWT, cookie HttpOnly; CORS restricted; S3 restricts buckets.
- Denial of Service: rate limits, Redis adapter, backpressure on Socket.IO; body size limits; authentication cache.
- Elevation of Privilege: RBAC guards; server-side checks; no trust in client-provided role/IDs.

## Monitoring & Metrics
- Prometheus metrics exposed at /metrics with HTTP latency, RPS, 5xx, and WS connection gauges.
- Grafana dashboards shipped under charts/grafana/dashboards.

## Performance Targets
- Web: FCP < 1.5s, LCP < 2.5s, CLS < 0.1 on mid-range mobile. Lighthouse CI asserts in lighthouserc.json.
- API: 95th percentile response < 500ms; error rate < 0.1%.

## Incident Response
- Rollback via deployments; logs and metrics retained; keys can be rotated by updating env and restarting.

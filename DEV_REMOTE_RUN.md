# Agent5 — Remote Run (HTTPS) + Live Preview

This guide runs the web (Vite) and API (Fastify) locally and exposes them over a secure public URL with WebSocket support for realtime and HTTPS for camera access.

Prereqs: Node 18+, pnpm, Docker Desktop, and either Cloudflare Tunnel (cloudflared) or ngrok.

0) Prep

- Repo root has `apps/web`, `apps/api`, `docker-compose.yml`.
- Copy `apps/api/.env.example` to `apps/api/.env` (optional for local defaults).
- Services used: PostgreSQL + Redis (via docker compose).

1) Start backing services

```powershell
docker compose up -d
```

2) Migrate + seed database

```powershell
pnpm db:migrate
pnpm db:seed
```

3) Local run (two terminals)

Terminal A — API:

```powershell
$env:NODE_ENV = 'development'
$env:WEB_ORIGIN = 'http://localhost:5173'
$env:CSRF_ENABLED = 'true'
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/deliveryapp?schema=public'
$env:REDIS_URL = 'redis://localhost:6379'
pnpm dev:api
# API on http://localhost:3000
```

Terminal B — Web:

```powershell
pnpm dev:web -- --host
# Web on http://localhost:5173
```

4) Expose with HTTPS (choose ONE)

Option A — Cloudflare Tunnel (recommended)

```powershell
cloudflared tunnel login

# Temporary tunnel URL
cloudflared tunnel --url http://localhost:5173
# Copy the https://<hash>.trycloudflare.com URL
```

If you own a domain on Cloudflare and want a named tunnel with path routing, create `~/.cloudflared/config.yml` similar to:

```
tunnel: agent5-dev
credentials-file: ~/.cloudflared/agent5-dev.json
ingress:
  - hostname: agent5-dev.yourdomain.com
    service: http://localhost:5173
    originRequest:
      connectTimeout: 10s
      noTLSVerify: true
  - hostname: agent5-dev.yourdomain.com
    path: /api/*
    service: http://localhost:3000
    originRequest:
      http2Origin: true
      connectTimeout: 10s
      noTLSVerify: true
  - service: http_status:404
```

Run the tunnel:

```powershell
cloudflared tunnel route dns agent5-dev agent5-dev.yourdomain.com
cloudflared tunnel run agent5-dev
```

Option B — ngrok

```powershell
ngrok config add-authtoken <YOUR_TOKEN>

# Expose web
ngrok http 5173 --host-header=rewrite
# Copy the https public URL as __PUBLIC_HTTPS_URL__

# (second terminal) expose API with WebSockets
ngrok http 3000 --host-header=rewrite
# Copy api URL as __PUBLIC_API_HTTPS_URL__
```

5) Wire CORS, CSRF, and Socket.IO to the public URL

API terminal (restart API after setting):

```powershell
$env:WEB_ORIGIN = 'https://<your-public-host>'  # or your ngrok URL
$env:CSRF_ENABLED = 'true'
pnpm dev:api
```

Web app (Vite) env (restart web if you set these):

```powershell
$env:VITE_API_BASE = 'https://<your-public-host>/api'
# Optional: if using separate API URL
# $env:VITE_API_BASE = 'https://<api-public-host>/api'
```

Socket.IO verification:

- Browser DevTools → Network → `socket.io/` shows protocol “WebSocket” after upgrade.

6) Security knobs for the preview

- Cloudflare: add Zero Trust Access policy (OTP email) for your host if needed.
- ngrok: run with `-auth "user:pass"` to gate the preview.
- Keep `/api/metrics` un-routed publicly; access it locally at `http://localhost:3000/metrics`.

7) Acceptance checklist

- Public URL loads on mobile; PWA prompt shows.
- Camera permission granted; scanner opens; first decode < 1s.
- Two browsers (admin + driver) get realtime updates within ~200ms.
- Lighthouse local: `pnpm lh:ci` meets budgets.

8) Stop

- Stop tunnels: Ctrl+C in the tunnel terminal(s).
- Stop services: `docker compose down`.

Deliverable: a single public HTTPS URL that loads the web app, proxies `/api/*` to the local API, supports WebSockets, and allows camera access for barcode scanning.

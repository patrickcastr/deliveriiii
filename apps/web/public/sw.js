self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches if needed
});

const API_ORIGIN = self.location.origin.replace(/5173$/, '3000');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Cache-only for GET requests for faster initial loads
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open('app-cache-v1');
      const cached = await cache.match(req);
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone()).catch(()=>{});
        return fresh;
      } catch {
        if (cached) return cached;
        return new Response('offline', { status: 200 });
      }
    })());
    return;
  }
  // Background sync queue for POST /api/v1/scan
  if (req.method === 'POST' && url.pathname.endsWith('/api/v1/scan')) {
    event.respondWith((async () => {
      try {
        return await fetch(req.clone());
      } catch {
        const body = await req.clone().json().catch(()=>null);
        const queue = await caches.open('scan-queue');
        const key = new Request(`queue://scan/${Date.now()}`);
        await queue.put(key, new Response(JSON.stringify(body)));
        if ('sync' in self.registration) {
          try { await self.registration.sync.register('flush-scan-queue'); } catch {}
        }
        return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      }
    })());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-scan-queue') {
    event.waitUntil((async () => {
      const queue = await caches.open('scan-queue');
      const keys = await queue.keys();
      for (const key of keys) {
        const res = await queue.match(key);
        const body = await res.json();
        try {
          let csrf = '';
          try { const c = await cookieStore.get('csrf_token'); csrf = (c && c.value) || ''; } catch {}
          await fetch(`${API_ORIGIN}/api/v1/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body) });
          await queue.delete(key);
        } catch {}
      }
    })());
  }
});

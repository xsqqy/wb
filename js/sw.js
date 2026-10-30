// sw.js — 自动更新 + 版本控制
// ⚠️ 每次修改 HTML 或 SW 后，把 VERSION 改成新值（例如日期+序号），旧缓存会自动清
const VERSION = '2026-10-30-2';
const CACHE = 'litot-tail-' + VERSION;

self.addEventListener('install', () => {
  // 不自动 skipWaiting，等待前端通知后再激活
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate =
    req.mode === 'navigate'
    || req.destination === 'document'
    || url.pathname === '/'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.html');

  if (isNavigate) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE);
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch (e) {
          const cached = await caches.match(req);
          return cached || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const netPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => null);
      return cached || (await netPromise) || new Response('Offline', { status: 503 });
    })()
  );
});

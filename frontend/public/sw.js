const CACHE_SHELL = 'flowy-shell-v3';
const CACHE_API = 'flowy-api-v1';
const SYNC_TAG = 'flowy-offline-sync';

// Runner-related API paths that require network (no offline support)
const RUNNER_PATHS = [
  '/api/runners',
  '/api/tasks/', // only for /assign, /run, /logs subpaths — handled below
];

function isRunnerOnlyRequest(url) {
  const path = url.pathname;
  // Runner list and management
  if (path === '/api/runners' || path.startsWith('/api/runners/')) return true;
  // Task assign, run, and logs (runner-dependent operations)
  if (/^\/api\/tasks\/[^/]+\/assign$/.test(path)) return true;
  if (/^\/api\/tasks\/[^/]+\/run$/.test(path)) return true;
  if (/^\/api\/tasks\/[^/]+\/logs$/.test(path)) return true;
  return false;
}

// API paths that support offline caching
const CACHEABLE_API_PATHS = [
  '/api/lists',
  '/api/tasks',
  '/api/labels',
  '/api/skills',
  '/api/stats',
  '/api/sessions',
  '/api/settings',
];

function isCacheableApiRequest(url) {
  const path = url.pathname;
  if (isRunnerOnlyRequest(url)) return false;
  return CACHEABLE_API_PATHS.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

// ── Install: precache app shell ──────────────────────────────────────────────

const PRECACHE_URLS = [
  '/',
  '/today', // start_url — ensures the PWA's launch URL is always cached
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);

      // Per-URL precache so a single 404 doesn't fail the whole install
      await Promise.allSettled(
        PRECACHE_URLS.map((url) => cachePut(cache, url)),
      );

      // Fetch the app shell HTML and cache every JS/CSS/asset it references.
      // Without this step, the SW only has the HTML — so when it serves the
      // cached shell offline, the hashed bundle requests fail and the page
      // renders blank.
      const indexAssets = await extractShellAssets('/');
      await Promise.allSettled(
        indexAssets.map((url) => cachePut(cache, url)),
      );

      await self.skipWaiting();
    })(),
  );
});

async function cachePut(cache, url) {
  try {
    const res = await fetch(url, { cache: 'reload' });
    if (res.ok || res.type === 'opaque') {
      await cache.put(url, res);
    }
  } catch (err) {
    console.warn('[sw] precache failed for', url, err);
  }
}

async function extractShellAssets(htmlUrl) {
  try {
    const res = await fetch(htmlUrl, { cache: 'reload' });
    if (!res.ok) return [];
    const html = await res.text();
    const urls = new Set();
    // <script src="...">
    for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
      urls.add(m[1]);
    }
    // <link href="..." rel="stylesheet|modulepreload|preload|icon">
    for (const m of html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)) {
      urls.add(m[1]);
    }
    // Same-origin only
    return [...urls].filter((u) => u.startsWith('/'));
  } catch {
    return [];
  }
}

// ── Activate: clean old caches, claim clients ────────────────────────────────

self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_SHELL, CACHE_API];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ──────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Non-GET mutations: let them pass through (sync queue handles offline)
  if (request.method !== 'GET') return;

  // Runner-only APIs: network only, fail gracefully offline
  if (isRunnerOnlyRequest(url)) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — runner functions require internet' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Cacheable API requests: network-first with cache fallback
  if (isCacheableApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_API).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || new Response(JSON.stringify({ error: 'Offline — using cached data' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
          )
        )
    );
    return;
  }

  // Other API requests (auth, health): network only
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: cache-first for instant loading (app shell)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Hashed JS/CSS bundles: cache-first (immutable by hash)
  if (/\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_SHELL).then((c) => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Static assets (fonts, images): cache-first
  if (/\.(woff2?|png|svg|ico|webp|jpg|jpeg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_SHELL).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
  }
});

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_SHELL);

  // Try cache first for instant paint; fall back through shell entries
  const cached =
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match('/today')) ||
    (await cache.match('/'));

  if (cached) {
    // Stale-while-revalidate: refresh cache in the background
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          cache.put(request, res.clone());
          cache.put('/', res.clone());
        }
      })
      .catch(() => {});
    return cached;
  }

  // No cached shell yet — try the network
  try {
    const res = await fetch(request);
    if (res.ok) {
      cache.put('/', res.clone());
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Offline · Flowy</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f8fc;color:#1a1a1a}main{text-align:center;max-width:340px;padding:24px}h1{margin:0 0 8px;font-size:18px}p{margin:0;color:#666;font-size:14px}</style>
      <main><h1>Flowy is offline</h1><p>The app shell hasn't been cached yet. Reconnect once and reopen.</p></main>`,
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

// ── Background Sync: replay queued mutations ─────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayOfflineQueue());
  }
});

async function replayOfflineQueue() {
  const db = await openSyncDb();
  const tx = db.transaction('queue', 'readwrite');
  const store = tx.objectStore('queue');
  const items = await idbGetAll(store);

  for (const item of items) {
    try {
      const init = {
        method: item.method,
        headers: item.headers,
        credentials: 'include',
      };
      if (item.body) init.body = item.body;

      const res = await fetch(item.url, init);
      if (res.ok || res.status === 409 || res.status === 404) {
        // Success or conflict/not-found — remove from queue
        const delTx = db.transaction('queue', 'readwrite');
        delTx.objectStore('queue').delete(item.id);
        await idbTxDone(delTx);
      } else if (res.status >= 500) {
        // Server error, retry later
        break;
      }
    } catch {
      // Network still down, stop replaying
      break;
    }
  }
}

// ── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Flowy', body: event.data.text() };
  }

  const { title = 'Flowy', body, icon, tag, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192-maskable.png',
      tag: tag || 'flowy-notification',
      data,
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/today';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ── Message handler: queue offline mutations from the client ──────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'QUEUE_MUTATION') {
    event.waitUntil(queueMutation(event.data.payload));
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function queueMutation(payload) {
  const db = await openSyncDb();
  const tx = db.transaction('queue', 'readwrite');
  tx.objectStore('queue').put({
    id: payload.id || Date.now() + '-' + Math.random().toString(36).slice(2),
    url: payload.url,
    method: payload.method,
    headers: payload.headers,
    body: payload.body,
    timestamp: Date.now(),
  });
  await idbTxDone(tx);

  // Try to trigger background sync
  if (self.registration.sync) {
    try {
      await self.registration.sync.register(SYNC_TAG);
    } catch {
      // Fallback: try replaying immediately
      await replayOfflineQueue();
    }
  } else {
    // No background sync support, try immediately
    await replayOfflineQueue();
  }
}

// ── IndexedDB helpers for the sync queue ─────────────────────────────────────

function openSyncDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('flowy-sync', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbTxDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

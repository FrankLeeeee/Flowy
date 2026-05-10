const CACHE_SHELL = 'flowy-shell-v5';
const CACHE_API = 'flowy-api-v1';
const SYNC_TAG = 'flowy-offline-sync';

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

function parseShellAssetUrls(html) {
  const urls = new Set();
  // <script src="...">
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    urls.add(m[1]);
  }
  // <link href="...">
  for (const m of html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)) {
    urls.add(m[1]);
  }
  // Same-origin only: must start with a single "/", never "//" which is a
  // protocol-relative cross-origin URL.
  return [...urls].filter((u) => u.startsWith('/') && !u.startsWith('//'));
}

async function extractShellAssets(htmlUrl) {
  try {
    const res = await fetch(htmlUrl, { cache: 'reload' });
    if (!res.ok) return [];
    return parseShellAssetUrls(await res.text());
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
        keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
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

  // Everything else (JS, CSS, manifest, fonts, images, ...): cache-first
  // with auto-cache on network success. A single generic rule avoids the
  // trap where a request that matches no narrow URL pattern silently falls
  // through to the network and fails offline.
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_SHELL);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok && res.type !== 'opaque') {
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    // No cache and no network — return a 504 the caller can detect
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_SHELL);

  // Try cache first for instant paint; fall back through shell entries
  const cached =
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match('/today')) ||
    (await cache.match('/'));

  if (cached) {
    // Stale-while-revalidate: refresh the shell AND any new bundles it
    // references. Without the asset re-precache, a redeploy would update
    // the cached HTML but leave its new bundle hashes unfetched, so the
    // next offline open would render a blank page until two online loads.
    fetch(request)
      .then(async (res) => {
        if (!res || !res.ok) return;
        await cache.put(request, res.clone());
        await cache.put('/', res.clone());
        const html = await res.clone().text();
        const assets = parseShellAssetUrls(html);
        await Promise.allSettled(assets.map((u) => cachePut(cache, u)));
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
  const items = await readQueueItemsSorted(db);
  if (items.length === 0) return;

  let processed = 0;
  for (const item of items) {
    try {
      const init = {
        method: item.method,
        headers: item.headers,
        credentials: 'include',
      };
      if (item.body) init.body = item.body;

      const res = await fetch(item.url, init);
      if (res.status >= 500) {
        // Transient server error — leave the item in the queue and stop.
        break;
      }
      // Anything else (2xx success, 4xx including 404/409 from a duplicate
      // replay) is terminal — drop the item so we don't retry forever.
      await deleteQueueItem(db, item.id);
      processed += 1;
    } catch {
      // Still offline; stop and try again next time.
      break;
    }
  }

  if (processed > 0) {
    await notifyClientsSyncComplete(processed);
  }
}

async function readQueueItemsSorted(db) {
  const tx = db.transaction('queue', 'readonly');
  const items = await idbGetAll(tx.objectStore('queue'));
  // Replay in the order the user made the changes.
  return items.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

async function deleteQueueItem(db, id) {
  const tx = db.transaction('queue', 'readwrite');
  tx.objectStore('queue').delete(id);
  await idbTxDone(tx);
}

async function notifyClientsSyncComplete(count) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_COMPLETE', count });
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

  const { title = 'Flowy', body, icon, tag, data, requireInteraction } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192-maskable.png',
      tag: tag || 'flowy-notification',
      renotify: true,
      requireInteraction: requireInteraction || false,
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
  if (event.data && event.data.type === 'PENDING_COUNT') {
    event.waitUntil(replyPendingCount(event));
  }
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    event.waitUntil(replayOfflineQueue());
  }
});

async function replyPendingCount(event) {
  const db = await openSyncDb();
  const tx = db.transaction('queue', 'readonly');
  const count = await new Promise((resolve, reject) => {
    const req = tx.objectStore('queue').count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (event.source && 'postMessage' in event.source) {
    event.source.postMessage({ type: 'PENDING_COUNT_RESULT', count });
  }
}

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

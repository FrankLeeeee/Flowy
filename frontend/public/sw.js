const CACHE_SHELL = 'flowy-shell-v2';
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) =>
      cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/favicon.ico',
        '/icon-192.png',
        '/icon-512.png',
        '/icon-192-maskable.png',
        '/icon-512-maskable.png',
      ])
    ).then(() => self.skipWaiting())
  );
});

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
    event.respondWith(
      caches.match('/').then((cached) => {
        // Serve cached shell immediately for instant paint
        const networkFetch = fetch(request)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE_SHELL).then((c) => c.put('/', clone));
            return res;
          })
          .catch(() => null);

        if (cached) {
          // Update cache in background, serve cached immediately
          networkFetch;
          return cached;
        }
        // No cache yet, wait for network
        return networkFetch.then((res) => res || new Response('Offline', { status: 503 }));
      })
    );
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

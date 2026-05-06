import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './lib/theme';
import { startSyncListener } from './lib/syncQueue';
import { SYNC_REFRESH_EVENT } from './hooks/useSyncStatus';
import './index.css';

// In dev, the SW caches Vite's index.html with its specific module URLs.
// After any HMR or restart those URLs change, but the SW keeps serving the
// stale shell — the page renders blank on refresh. Skip registration in dev
// and unregister any leftover SW from previous dev sessions.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          console.info('[sw] registered, scope:', reg.scope);

          // Auto-update: skip waiting when a new SW is installed
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[sw] registration failed:', err);
        });

      // Reload once when a new SW takes control to pick up fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // When the SW finishes replaying queued offline mutations, ask any
      // listening components to refetch so temp IDs get replaced by real ones.
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          window.dispatchEvent(new CustomEvent(SYNC_REFRESH_EVENT, { detail: event.data }));
        }
      });
    });
  }
}

// Start listening for online/offline to trigger background sync
startSyncListener();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

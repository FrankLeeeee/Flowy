import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './lib/theme';
import { startSyncListener } from './lib/syncQueue';
import { SYNC_REFRESH_EVENT } from './hooks/useSyncStatus';
import './index.css';

// Register the service worker in both dev and prod so PWA features (offline
// shell, background sync, push) can be exercised locally. The SW only caches
// hashed bundles and static assets, so it won't interfere with Vite HMR.
if ('serviceWorker' in navigator) {
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

// Start listening for online/offline to trigger background sync
startSyncListener();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

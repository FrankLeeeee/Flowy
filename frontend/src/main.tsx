import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './lib/theme';
import { startSyncListener } from './lib/syncQueue';
import './index.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Register immediately (not on load) for faster SW activation on first visit
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    // Auto-update: when a new SW is waiting, tell it to activate
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });
  });

  // Reload when a new SW takes over to get fresh assets
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
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

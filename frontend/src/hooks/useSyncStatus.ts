import { useEffect, useState } from 'react';

export const SYNC_REFRESH_EVENT = 'flowy:sync-refresh';

/**
 * Surface the SW's pending-queue size so the offline banner can show
 * "N changes pending" while the user is offline. Listens for queue
 * updates dispatched from main.tsx.
 */
export function usePendingMutationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const ask = () => {
      const sw = navigator.serviceWorker?.controller;
      if (!sw) return;
      sw.postMessage({ type: 'PENDING_COUNT' });
    };

    const onMessage = (event: MessageEvent) => {
      if (cancelled) return;
      if (event.data?.type === 'PENDING_COUNT_RESULT' && typeof event.data.count === 'number') {
        setCount(event.data.count);
      }
    };

    navigator.serviceWorker?.addEventListener('message', onMessage);
    ask();
    const interval = setInterval(ask, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  return count;
}

/**
 * Run `callback` once when the SW reports queued mutations have synced or
 * when the browser comes back online. Components use this to refetch their
 * data so temp-IDs get replaced by real server IDs.
 */
export function useReconnectRefresh(callback: () => void): void {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener(SYNC_REFRESH_EVENT, handler);
    window.addEventListener('online', handler);
    return () => {
      window.removeEventListener(SYNC_REFRESH_EVENT, handler);
      window.removeEventListener('online', handler);
    };
  }, [callback]);
}

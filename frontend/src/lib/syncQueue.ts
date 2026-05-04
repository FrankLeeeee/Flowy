export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export async function queueMutation(
  url: string,
  method: string,
  body?: unknown,
): Promise<void> {
  const payload: QueuedMutation = {
    id: crypto.randomUUID(),
    url,
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
    timestamp: Date.now(),
  };

  const sw = navigator.serviceWorker?.controller;
  if (sw) {
    sw.postMessage({ type: 'QUEUE_MUTATION', payload });
  } else {
    // Fallback: store directly in IndexedDB if SW not ready
    await storeInQueue(payload);
  }
}

async function storeInQueue(item: QueuedMutation): Promise<void> {
  const db = await openSyncDb();
  const tx = db.transaction('queue', 'readwrite');
  tx.objectStore('queue').put(item);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function openSyncDb(): Promise<IDBDatabase> {
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

export async function getPendingCount(): Promise<number> {
  const db = await openSyncDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const req = tx.objectStore('queue').count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function triggerSync(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      if ('sync' in reg) {
        (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('flowy-offline-sync');
      }
    });
  }
}

let onlineHandler: (() => void) | null = null;

export function startSyncListener(): void {
  if (onlineHandler) return;
  onlineHandler = () => {
    triggerSync();
  };
  window.addEventListener('online', onlineHandler);
}

export function stopSyncListener(): void {
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
}

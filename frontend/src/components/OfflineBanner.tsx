import { Cloud, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePendingMutationCount, SYNC_REFRESH_EVENT } from '../hooks/useSyncStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const pending = usePendingMutationCount();

  // After a sync completes, briefly show a confirmation that the queue
  // drained so the user isn't left wondering whether their changes landed.
  const [justSynced, setJustSynced] = useState(false);
  useEffect(() => {
    const handler = () => {
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 4000);
      return () => clearTimeout(t);
    };
    window.addEventListener(SYNC_REFRESH_EVENT, handler);
    return () => window.removeEventListener(SYNC_REFRESH_EVENT, handler);
  }, []);

  if (!online) {
    return (
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          You're offline.{' '}
          {pending > 0
            ? `${pending} pending change${pending === 1 ? '' : 's'} will sync when reconnected.`
            : 'Changes will sync when connection is restored.'}
        </span>
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
        <span>Syncing {pending} pending change{pending === 1 ? '' : 's'}…</span>
      </div>
    );
  }

  if (justSynced) {
    return (
      <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
        <Cloud className="h-4 w-4 shrink-0" />
        <span>Offline changes synced.</span>
      </div>
    );
  }

  return null;
}

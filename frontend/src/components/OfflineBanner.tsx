import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You're offline. Changes will sync when connection is restored.</span>
    </div>
  );
}

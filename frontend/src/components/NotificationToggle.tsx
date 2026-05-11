import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function NotificationToggle() {
  const { permission, subscribed, loading, support, subscribe, unsubscribe } = usePushNotifications();

  if (support !== 'supported') {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Notifications blocked by browser</span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
      title={subscribed ? 'Disable notifications' : 'Enable notifications'}
    >
      {subscribed ? (
        <>
          <Bell className="h-4 w-4 text-emerald-500" />
          <span>Notifications on</span>
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          <span>Enable notifications</span>
        </>
      )}
    </button>
  );
}

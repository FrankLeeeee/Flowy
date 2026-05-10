import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor, KeyRound, LogOut, Bell, BellOff, ArrowLeft } from 'lucide-react';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
] as const;

function NotificationButton() {
  const { permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
    return (
      <p className="px-1 text-[13px] text-muted-foreground/60">Not supported in this browser.</p>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground">
        <BellOff className="h-4 w-4 shrink-0" />
        <span>Blocked by browser settings</span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] font-medium transition-colors disabled:opacity-50',
        subscribed
          ? 'bg-emerald-500/[0.08] text-emerald-600 active:bg-emerald-500/[0.14] dark:text-emerald-400'
          : 'bg-muted/40 text-foreground active:bg-muted/60',
      )}
    >
      {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      {subscribed ? 'Notifications enabled' : 'Enable notifications'}
    </button>
  );
}

export default function MobileSettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 active:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <h1 className="text-[18px] font-bold tracking-tight text-foreground">Settings</h1>
        </div>
      </div>

      <div className="flex flex-col gap-8 px-4 py-5">
        {/* Appearance */}
        <section>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Appearance</h2>
          <div className="flex items-center rounded-xl border border-border/60 bg-background/80 p-1">
            {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                  theme === value
                    ? 'bg-primary/10 text-primary shadow-soft'
                    : 'text-muted-foreground/75 active:bg-muted/40',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Notifications</h2>
          <NotificationButton />
        </section>

        {/* Security */}
        <section>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Security</h2>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="flex w-full items-center gap-3 rounded-xl bg-muted/40 px-4 py-3.5 text-[14px] font-medium text-foreground transition-colors active:bg-muted/60"
            >
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              Change password
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center gap-3 rounded-xl bg-destructive/[0.06] px-4 py-3.5 text-[14px] font-medium text-destructive transition-colors active:bg-destructive/[0.12]"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </section>
      </div>

      <ChangePasswordDialog open={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </div>
  );
}

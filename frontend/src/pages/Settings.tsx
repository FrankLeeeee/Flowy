import { useState } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Monitor, KeyRound, LogOut, Bell, BellOff } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

function NotificationSection() {
  const { permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
    return (
      <p className="text-[13px] text-muted-foreground/70">Push notifications are not supported in this browser.</p>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Notifications are blocked by your browser. Update your browser settings to enable them.</span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 disabled:opacity-50',
        subscribed
          ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-600 hover:bg-emerald-500/[0.1] dark:text-emerald-400'
          : 'border-border/70 bg-background/80 text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
      )}
    >
      {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      {subscribed ? 'Notifications enabled' : 'Enable notifications'}
    </button>
  );
}

const THEME_OPTIONS = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
] as const;

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="p-6 sm:p-10">
      <PageTitle icon={SettingsIcon} title="Settings" />

      <div className="mt-8 flex flex-col gap-10">
        {/* Appearance */}
        <section>
          <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Appearance</h2>
          <p className="mb-4 text-[13px] text-muted-foreground/60">Choose how Flowy looks on your device.</p>
          <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/80 p-1">
            {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors duration-150',
                  theme === value
                    ? 'bg-primary/10 text-primary shadow-soft'
                    : 'text-muted-foreground/75 hover:text-foreground',
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
          <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Notifications</h2>
          <p className="mb-4 text-[13px] text-muted-foreground/60">Manage push notification preferences.</p>
          <NotificationSection />
        </section>

        {/* Security */}
        <section>
          <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Security</h2>
          <p className="mb-4 text-[13px] text-muted-foreground/60">Manage your password and session.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="inline-flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/80 px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/[0.04] px-4 py-2.5 text-[13px] font-medium text-destructive/80 transition-colors duration-150 hover:bg-destructive/[0.08] hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </section>
      </div>

      <ChangePasswordDialog open={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </div>
  );
}

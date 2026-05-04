import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Wand2,
  Tags,
  BarChart2,
  ChevronRight,
  Settings as SettingsIcon,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import NotificationToggle from "@/components/NotificationToggle";

const SETTINGS_ITEMS = [
  {
    to: "/runners",
    icon: Bot,
    label: "Runners",
    description: "Manage connected devices and agents",
  },
  {
    to: "/skills",
    icon: Wand2,
    label: "Skills",
    description: "View and configure agent capabilities",
  },
  {
    to: "/labels",
    icon: Tags,
    label: "Labels",
    description: "Manage task labels and categories",
  },
  {
    to: "/stats",
    icon: BarChart2,
    label: "Stats",
    description: "View productivity and usage statistics",
  },
] as const;

export default function MobileSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-lg">
        <h1 className="text-[18px] font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-[11px] text-muted-foreground/75">
          Configure and manage your Flowy instance
        </p>
      </div>

      <div className="flex-1 space-y-1 py-4">
        {SETTINGS_ITEMS.map(({ to, icon: Icon, label, description }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-4 px-4 py-3 transition-colors active:bg-muted/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[14px] font-semibold text-foreground">
                {label}
              </h3>
              <p className="text-[11px] text-muted-foreground/75">
                {description}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </button>
        ))}

        {/* Notifications */}
        <div className="px-4 py-3">
          <NotificationToggle />
        </div>

        {/* Change password */}
        <button
          onClick={() => setShowChangePassword(true)}
          className="flex w-full items-center gap-4 px-4 py-3 transition-colors active:bg-muted/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-[14px] font-semibold text-foreground">Change password</h3>
            <p className="text-[11px] text-muted-foreground/75">Update your hub access password</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </button>

        {/* Sign out */}
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-4 px-4 py-3 transition-colors active:bg-muted/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-[14px] font-semibold text-destructive">
              Sign out
            </h3>
            <p className="text-[11px] text-muted-foreground/75">
              Sign out of your Flowy hub
            </p>
          </div>
        </button>
      </div>

      <ChangePasswordDialog open={showChangePassword} onClose={() => setShowChangePassword(false)} />

      {/* Footer */}
      <div className="p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/40">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <p className="mt-4 text-[11px] font-medium text-muted-foreground/50">
          Flowy v1.0.0
        </p>
      </div>
    </div>
  );
}

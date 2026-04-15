import { NavLink, useLocation } from "react-router-dom";
import { Inbox, FolderKanban, Bot, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/runners", icon: Bot, label: "Runners" },
  { to: "/labels", icon: Tags, label: "Labels" },
] as const;

function isPWAStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export default function MobileShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();

  // Highlight "Projects" tab when viewing a specific project
  const isProjectRoute = location.pathname.startsWith("/project/");

  // if it is standalone, use h-screen
  // else use h-full
  const className = isPWAStandalone() ? "h-screen" : "h-full";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col bg-background p-[env(safe-area-inset)]",
        className,
      )}
    >
      {/* Content area — flex-1 fills remaining height; pb clears the fixed tab bar */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(4rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
        {children}
      </main>

      {/* Bottom tab bar — fixed to bottom of viewport */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 pt-2 backdrop-blur-lg">
        <div className="flex items-stretch">
          {TABS.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === "/projects"
                ? location.pathname === "/projects" || isProjectRoute
                : undefined; // let NavLink handle it

            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive: navActive }) => {
                  const active = isActive ?? navActive;
                  return cn(
                    "flex h-full flex-1 flex-col items-center justify-center text-[10px] font-medium transition-colors duration-150",
                    active
                      ? "text-primary"
                      : "text-muted-foreground/70 active:text-foreground",
                  );
                }}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

import { NavLink, useLocation } from "react-router-dom";
import { Inbox, FolderKanban, MessagesSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/sessions", icon: MessagesSquare, label: "Sessions" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export default function MobileShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();

  // Highlight "Projects" tab when viewing a specific project
  const isProjectRoute = location.pathname.startsWith("/project/");

  // Highlight "Settings" tab when on sub-routes
  const isSettingsRoute = ["/runners", "/skills", "/labels", "/stats"].some(
    (path) => location.pathname.startsWith(path),
  );

  return (
    <div className="flex min-w-0 h-screen flex-col bg-background">
      {/* Content area — flex-1 fills remaining height; pb clears the fixed tab bar */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(4rem+env(safe-area-inset-bottom)*0.6)] [-webkit-overflow-scrolling:touch]">
        {children}
      </main>
      {/* Bottom tab bar — fixed to bottom of viewport */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-lg">
        <div className="flex h-12 items-stretch">
          {TABS.map(({ to, icon: Icon, label }) => {
            let isActive = undefined;
            if (to === "/projects") {
              isActive = location.pathname === "/projects" || isProjectRoute;
            } else if (to === "/settings") {
              isActive = location.pathname === "/settings" || isSettingsRoute;
            }

            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive: navActive }) => {
                  const active = isActive ?? navActive;
                  return cn(
                    "flex flex-1 flex-col items-center justify-end text-[10px] font-medium transition-colors duration-150",
                    active
                      ? "text-primary"
                      : "text-muted-foreground/70 active:text-foreground",
                  );
                }}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

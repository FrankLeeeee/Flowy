import { NavLink, useLocation } from 'react-router-dom';
import { Inbox, FolderKanban, Bot, Tags } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/inbox', icon: Inbox, label: 'Inbox' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/runners', icon: Bot, label: 'Runners' },
  { to: '/labels', icon: Tags, label: 'Labels' },
] as const;

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // Highlight "Projects" tab when viewing a specific project
  const isProjectRoute = location.pathname.startsWith('/project/');

  return (
    <div className="flex min-h-screen h-[100dvh] max-h-[100dvh] min-w-0 flex-col overflow-hidden bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Content area — fills available space above the tab bar, scrolls internally */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="z-50 shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-lg">
        <div className="flex h-[calc(3.5rem+env(safe-area-inset-bottom))] items-stretch">
          {TABS.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/projects'
              ? location.pathname === '/projects' || isProjectRoute
              : undefined; // let NavLink handle it

            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive: navActive }) => {
                  const active = isActive ?? navActive;
                  return cn(
                    'flex h-full flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors duration-150',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground/70 active:text-foreground',
                  );
                }}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

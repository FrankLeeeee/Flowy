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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Content area — fills available space above the tab bar */}
      <main className="flex-1 overflow-auto pb-[calc(env(safe-area-inset-bottom)+64px)]">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-stretch">
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
                    'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors duration-150',
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

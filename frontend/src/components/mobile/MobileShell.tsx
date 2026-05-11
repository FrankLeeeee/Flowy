import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import MobileDrawer from './MobileDrawer';
import MobileDateBar from './MobileDateBar';
import OfflineBanner from '@/components/OfflineBanner';
import { getTodayDateString } from '@/lib/dateFilter';

interface MobileShellProps {
  children: (props: { selectedDate: string; onDateChange: (d: string) => void }) => React.ReactNode;
}

export default function MobileShell({ children }: MobileShellProps) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const isHomePage = location.pathname === '/' || location.pathname === '/today';
  const hasCreateAction = !location.pathname.startsWith('/stats') && !location.pathname.startsWith('/settings');

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener('flowy:open-drawer', open);
    return () => window.removeEventListener('flowy:open-drawer', open);
  }, []);

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('flowy:mobile-create'));
  };

  return (
    <div className="relative flex h-[100dvh] flex-col bg-background">
      <OfflineBanner />
      {/* Solid backdrop behind the status bar so scrolling content can't show through */}
      <div
        className="fixed top-0 left-0 right-0 z-10 bg-background"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
      <main
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div key={location.pathname} className="motion-page h-full">
          {children({ selectedDate, onDateChange: handleDateChange })}
        </div>
      </main>

      {/* Date bar with embedded menu/create on home */}
      {isHomePage ? (
        <MobileDateBar
          currentDate={selectedDate}
          onDateChange={handleDateChange}
          onMenuClick={() => setDrawerOpen(true)}
          onCreate={handleCreate}
        />
      ) : (
        <div
          className="flex-none bg-background border-t border-border/60 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center px-3 h-14">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-muted/50"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div />
            {hasCreateAction ? (
              <button
                type="button"
                onClick={handleCreate}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft active:opacity-90"
                aria-label="Create"
              >
                <Plus className="h-5 w-5" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

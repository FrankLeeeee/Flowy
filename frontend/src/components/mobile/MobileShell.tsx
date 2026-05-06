import { useState, useCallback } from 'react';
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

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('flowy:mobile-create-task'));
  };

  return (
    <div className="relative flex h-[100dvh] flex-col bg-background">
      <OfflineBanner />
      <main
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <div key={location.pathname} className="motion-page">
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
          className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border/60 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
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
            <button
              type="button"
              onClick={handleCreate}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft active:opacity-90"
              aria-label="Create task"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

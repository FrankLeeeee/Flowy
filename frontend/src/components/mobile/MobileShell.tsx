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
    <div className="flex h-[100svh] flex-col bg-background pt-[env(safe-area-inset-top)]">
      <OfflineBanner />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(3.5rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
        {children({ selectedDate, onDateChange: handleDateChange })}
      </main>

      {/* Date bar - only on home */}
      {isHomePage && (
        <MobileDateBar currentDate={selectedDate} onDateChange={handleDateChange} />
      )}

      {/* Fixed bottom bar for non-home pages */}
      {!isHomePage && (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-[calc(env(safe-area-inset-bottom))] bg-background" />
      )}

      {/* FAB: Menu (bottom left) */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-card border border-border/60 shadow-elevated active:scale-95 transition-transform"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)' }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* FAB: Create task (bottom right) */}
      <button
        type="button"
        onClick={handleCreate}
        className="fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated active:scale-95 transition-transform"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)' }}
        aria-label="Create task"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

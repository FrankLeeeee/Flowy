import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useCallback, useState } from 'react';
import { CalendarDays, Inbox, FolderKanban, Tags, BarChart2, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MENU_ITEMS = [
  { to: '/today', icon: CalendarDays, label: 'Schedule' },
  { to: '/inbox', icon: Inbox, label: 'Inbox' },
  { to: '/lists', icon: FolderKanban, label: 'Lists' },
  { to: '/labels', icon: Tags, label: 'Labels' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

const SWIPE_CLOSE_THRESHOLD = 60;
const SWIPE_DIRECTION_DEADZONE = 12;
const DRAWER_WIDTH = 280;

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const startX = useRef(0);
  const startY = useRef(0);
  const horizontal = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    horizontal.current = false;
    setDragOffset(0);
    setDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    if (!horizontal.current) {
      if (Math.abs(dx) > SWIPE_DIRECTION_DEADZONE && Math.abs(dx) > Math.abs(dy)) {
        horizontal.current = true;
      } else if (Math.abs(dy) > SWIPE_DIRECTION_DEADZONE) {
        setDragging(false);
        return;
      }
    }
    if (horizontal.current && dx < 0) {
      setDragOffset(dx);
    }
  }, [dragging]);

  const onTouchEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (horizontal.current && dragOffset < -SWIPE_CLOSE_THRESHOLD) {
      onClose();
    }
    setDragOffset(0);
    horizontal.current = false;
  }, [dragging, dragOffset, onClose]);

  const handleNavigate = (to: string) => {
    navigate(to);
    onClose();
  };

  const drawerTranslate = open ? Math.min(0, dragOffset) : -DRAWER_WIDTH;
  const showDragStyle = open && dragging && dragOffset < 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-[61] flex w-[280px] flex-col bg-background shadow-xl',
          'pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] pl-[env(safe-area-inset-left)]',
          !showDragStyle && 'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        )}
        style={{ transform: `translateX(${drawerTranslate}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-4">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="Flowy" className="h-7 w-7" />
            <h2 className="text-[20px] font-bold tracking-tight text-foreground">Flowy</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted/50"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Menu items — vertically centered */}
        <nav className="flex flex-1 flex-col justify-center gap-1 px-3">
          {MENU_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <button
                key={to}
                type="button"
                onClick={() => handleNavigate(to)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  isActive
                    ? 'bg-primary/8 text-primary'
                    : 'text-foreground active:bg-muted/50',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[15px] font-medium">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

import { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, formatDateLabel } from '@/lib/mobileDateBar';
import { getTodayDateString } from '@/lib/dateFilter';

const SWIPE_THRESHOLD = 50;
const PULL_THRESHOLD = 60;
const PULL_VERTICAL_DEADZONE = 20;

interface MobileDateBarProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onMenuClick: () => void;
  onCreate: () => void;
}

export default function MobileDateBar({ currentDate, onDateChange, onMenuClick, onCreate }: MobileDateBarProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isDraggingUp = useRef(false);
  const pullY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);

  const dragStart = useCallback((x: number, y: number) => {
    startX.current = x;
    startY.current = y;
    isDraggingUp.current = false;
    pullY.current = 0;
    setDragging(true);
  }, []);

  const dragMove = useCallback((x: number, y: number) => {
    const dx = x - startX.current;
    const dy = startY.current - y;
    if (dy > PULL_VERTICAL_DEADZONE && Math.abs(dy) > Math.abs(dx)) {
      isDraggingUp.current = true;
      pullY.current = dy;
      setTranslateX(0);
    } else if (!isDraggingUp.current) {
      setTranslateX(dx);
      pullY.current = 0;
    }
  }, []);

  const dragEnd = useCallback(() => {
    setDragging(false);
    if (isDraggingUp.current) {
      if (pullY.current > PULL_THRESHOLD) setShowCalendar(true);
    } else if (translateX < -SWIPE_THRESHOLD) {
      onDateChange(addDays(currentDate, 1));
    } else if (translateX > SWIPE_THRESHOLD) {
      onDateChange(addDays(currentDate, -1));
    }
    setTranslateX(0);
    pullY.current = 0;
    isDraggingUp.current = false;
  }, [translateX, currentDate, onDateChange]);

  const handleCalendarSelect = (date: string) => {
    onDateChange(date);
    setShowCalendar(false);
  };

  return (
    <>
      {/* Date bar */}
      <div
        onTouchStart={(e) => dragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => dragging && dragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={dragEnd}
        onMouseDown={(e) => dragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => dragging && dragMove(e.clientX, e.clientY)}
        onMouseUp={dragEnd}
        onMouseLeave={() => { if (dragging) dragEnd(); }}
        className="flex-none bg-background border-t border-border/60 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] touch-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative grid grid-cols-[auto_1fr_auto] items-center px-3 h-14 select-none">
          {/* Left: menu */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMenuClick(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-muted/50 cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Center: drag pill flanked by chevron hints, all on the same row */}
          <div className="relative flex items-center justify-center cursor-grab active:cursor-grabbing">
            <div
              className="flex items-center gap-2.5"
              style={{
                transform: dragging ? `translateX(${translateX}px)` : undefined,
                transition: dragging ? 'none' : 'transform 0.2s ease-out',
              }}
            >
              <ChevronLeft
                className={cn(
                  'h-4 w-4 text-muted-foreground/40 transition-opacity',
                  Math.abs(translateX) > 30 ? 'opacity-0' : 'opacity-100',
                )}
              />
              <div className="h-1 w-10 rounded-full bg-foreground/20" />
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-muted-foreground/40 transition-opacity',
                  Math.abs(translateX) > 30 ? 'opacity-0' : 'opacity-100',
                )}
              />
            </div>

            {/* Active-swipe neighbor-date indicator */}
            <span
              className={cn(
                'absolute left-0 text-[12px] text-muted-foreground/60 transition-opacity pointer-events-none',
                translateX > 30 ? 'opacity-100' : 'opacity-0',
              )}
            >
              ← {formatDateLabel(addDays(currentDate, -1))}
            </span>
            <span
              className={cn(
                'absolute right-0 text-[12px] text-muted-foreground/60 transition-opacity pointer-events-none',
                translateX < -30 ? 'opacity-100' : 'opacity-0',
              )}
            >
              {formatDateLabel(addDays(currentDate, 1))} →
            </span>
          </div>

          {/* Right: create */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreate(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft active:opacity-90 cursor-pointer"
            aria-label="Create task"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar overlay */}
      {showCalendar && (
        <MiniCalendar
          selectedDate={currentDate}
          onSelect={handleCalendarSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </>
  );
}

function MiniCalendar({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const [year, month] = selectedDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDayOfWeek).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const todayStr = getTodayDateString();

  const goMonth = (offset: number) => {
    let nm = viewMonth + offset;
    let ny = viewYear;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setViewMonth(nm);
    setViewYear(ny);
  };

  const formatCell = (day: number) => {
    return `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[56] rounded-2xl bg-background border border-border/60 shadow-xl p-4 animate-in slide-in-from-bottom-4 duration-300">
        {/* Month/year nav */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted/50"
          >
            ‹
          </button>
          <span className="text-[14px] font-semibold text-foreground">
            {new Date(viewYear, viewMonth - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted/50"
          >
            ›
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground/60 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {weeks.flat().map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = formatCell(day);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelect(dateStr)}
                className={cn(
                  'mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground active:bg-muted/50',
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Today shortcut */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => onSelect(todayStr)}
            className="text-[12px] font-medium text-primary active:opacity-70"
          >
            Go to today
          </button>
        </div>
      </div>
    </>
  );
}

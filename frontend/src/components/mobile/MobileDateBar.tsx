import { useRef, useState, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, formatDateLabel } from '@/lib/mobileDateBar';

interface MobileDateBarProps {
  currentDate: string;
  onDateChange: (date: string) => void;
}

export default function MobileDateBar({ currentDate, onDateChange }: MobileDateBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDragY, setCalendarDragY] = useState(0);
  const isDraggingUp = useRef(false);
  const SWIPE_THRESHOLD = 50;
  const PULL_THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDraggingUp.current = false;
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = touchStartY.current - e.touches[0].clientY;

    if (dy > 20 && Math.abs(dy) > Math.abs(dx)) {
      isDraggingUp.current = true;
      setCalendarDragY(Math.min(dy, PULL_THRESHOLD * 1.5));
      setTranslateX(0);
    } else if (!isDraggingUp.current) {
      setTranslateX(dx);
      setCalendarDragY(0);
    }
  }, [dragging]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);

    if (isDraggingUp.current && calendarDragY > PULL_THRESHOLD) {
      setShowCalendar(true);
    }

    if (!isDraggingUp.current) {
      if (translateX < -SWIPE_THRESHOLD) {
        onDateChange(addDays(currentDate, 1));
      } else if (translateX > SWIPE_THRESHOLD) {
        onDateChange(addDays(currentDate, -1));
      }
    }

    setTranslateX(0);
    setCalendarDragY(0);
    isDraggingUp.current = false;
  }, [translateX, calendarDragY, currentDate, onDateChange]);

  const handleCalendarSelect = (date: string) => {
    onDateChange(date);
    setShowCalendar(false);
  };

  return (
    <>
      {/* Date bar */}
      <div
        ref={barRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => {
          touchStartX.current = e.clientX;
          touchStartY.current = e.clientY;
          isDraggingUp.current = false;
          setDragging(true);
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          const dx = e.clientX - touchStartX.current;
          const dy = touchStartY.current - e.clientY;
          if (dy > 20 && Math.abs(dy) > Math.abs(dx)) {
            isDraggingUp.current = true;
            setCalendarDragY(Math.min(dy, PULL_THRESHOLD * 1.5));
            setTranslateX(0);
          } else if (!isDraggingUp.current) {
            setTranslateX(dx);
            setCalendarDragY(0);
          }
        }}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => { if (dragging) handleTouchEnd(); }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border/60 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-1.5 pb-0.5">
          <div className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>

        <div className="relative flex items-center justify-center h-14 select-none touch-pan-y cursor-grab active:cursor-grabbing">
          <div
            className="flex items-center gap-1.5"
            style={{
              transform: dragging ? `translateX(${translateX}px)` : undefined,
              transition: dragging ? 'none' : 'transform 0.2s ease-out',
            }}
          >
            <ChevronUp
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                calendarDragY > 20 && '-translate-y-1',
              )}
            />
            <span className="text-[15px] font-semibold text-foreground">
              {formatDateLabel(currentDate)}
            </span>
          </div>

          {/* Swipe hint indicators */}
          <div className="absolute inset-x-0 flex items-center justify-between px-6 pointer-events-none">
            <span
              className={cn(
                'text-[12px] text-muted-foreground/60 transition-opacity',
                translateX > 30 ? 'opacity-100' : 'opacity-0',
              )}
            >
              ← {formatDateLabel(addDays(currentDate, -1))}
            </span>
            <span
              className={cn(
                'text-[12px] text-muted-foreground/60 transition-opacity',
                translateX < -30 ? 'opacity-100' : 'opacity-0',
              )}
            >
              {formatDateLabel(addDays(currentDate, 1))} →
            </span>
          </div>
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

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

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


import { formatDateYMD } from './dateFilter';

/**
 * @deprecated Use `formatDateYMD` from `@/lib/dateFilter` directly.
 * Kept as a re-export so existing callers continue to work.
 */
export const getTodayDateInputValue = formatDateYMD;

// Coerce backend / browser-supplied time values to HH:MM so <input type="time">
// renders only an hour and minute slot. Browsers fall back to an HH:MM:SS UI
// when the bound value carries seconds, even when step=60.
const TIME_HHMM_RE = /^(\d{2}):(\d{2})/;
export function normalizeScheduledTime(value: string | null | undefined): string {
  if (!value) return '';
  const match = TIME_HHMM_RE.exec(value);
  return match ? `${match[1]}:${match[2]}` : '';
}

export function formatTaskSchedule(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number);
  const formattedDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : date;

  return time ? `${formattedDate} at ${time}` : formattedDate;
}

export function formatTaskScheduleCompact(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number);
  const formattedDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : date;

  return time ? `${formattedDate} ${time}` : formattedDate;
}

import { formatIsoDate } from 'flowy-shared';
import type { Task } from '@/types';
import { formatDurationMinutes } from './taskDuration';

export function getTodayDateInputValue(date = new Date()): string {
  return formatIsoDate(date);
}

const TIME_HHMM_RE = /^(\d{2}):(\d{2})/;

/** Coerce time values to HH:MM so <input type="time"> shows only hours and minutes. */
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

export function formatTaskTimeDurationPill(
  time: string | null | undefined,
  durationMinutes: number | null | undefined,
): string | null {
  const hasTime = !!time;
  const hasDuration = durationMinutes != null && Number.isFinite(durationMinutes) && durationMinutes > 0;
  if (!hasTime && !hasDuration) return null;
  if (hasTime && hasDuration) return `${time} → ${formatDurationMinutes(durationMinutes)}`;
  if (hasTime) return time as string;
  return formatDurationMinutes(durationMinutes);
}

export function compareTasksBySchedule(a: Task, b: Task): number {
  const dateOrder = a.scheduled_date.localeCompare(b.scheduled_date);
  if (dateOrder !== 0) return dateOrder;

  return (a.scheduled_time || '00:00').localeCompare(b.scheduled_time || '00:00');
}

export function sortTasksBySchedule<T extends Task>(tasks: T[]): T[] {
  return [...tasks].sort(compareTasksBySchedule);
}

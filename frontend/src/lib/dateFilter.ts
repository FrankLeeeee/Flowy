import { formatIsoDate } from 'flowy-shared';
import { Task } from '../types';
import { sortTasksBySchedule } from './taskSchedule';

export type DateFilterMode = 'today' | 'week' | 'custom';

export interface DateFilterState {
  mode: DateFilterMode;
  /** Used only when mode === 'custom'. YYYY-MM-DD */
  startDate: string;
  /** Used only when mode === 'custom'. YYYY-MM-DD */
  endDate: string;
}

export function getTodayDateString(): string {
  return formatIsoDate(new Date());
}

export function getWeekRange(): { start: string; end: string } {
  // ISO 8601 calendar week: Monday through Sunday.
  const today = new Date();
  const dayOfWeek = today.getDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(today);
  start.setDate(today.getDate() + offsetToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: formatIsoDate(start), end: formatIsoDate(end) };
}

export function defaultDateFilter(): DateFilterState {
  const today = getTodayDateString();
  return { mode: 'today', startDate: today, endDate: today };
}

/**
 * Returns the effective [startDate, endDate] range for a filter state.
 * Both are YYYY-MM-DD strings (inclusive).
 */
export function getEffectiveDateRange(filter: DateFilterState): { start: string; end: string } {
  if (filter.mode === 'today') {
    const t = getTodayDateString();
    return { start: t, end: t };
  }
  if (filter.mode === 'week') {
    return getWeekRange();
  }
  return { start: filter.startDate, end: filter.endDate };
}

const DONE_STATUSES = new Set(['done', 'cancelled']);

/**
 * Applies date filtering to a list of tasks.
 *
 * Rules:
 *  - Every task has a scheduled_date.
 *  - Tasks are shown when their date falls within the range.
 *  - Overdue uncompleted tasks (scheduled before the range start) are
 *    included in 'today' and 'week' modes so they aren't silently hidden.
 */
export function filterTasksByDate(tasks: Task[], filter: DateFilterState): Task[] {
  const { start, end } = getEffectiveDateRange(filter);
  const includeOverdue = filter.mode === 'today' || filter.mode === 'week';

  return sortTasksBySchedule(tasks.filter((task) => {
    if (task.scheduled_date >= start && task.scheduled_date <= end) return true;
    if (includeOverdue && task.scheduled_date < start && !DONE_STATUSES.has(task.status)) return true;
    return false;
  }));
}

export function formatDateFilterLabel(filter: DateFilterState): string {
  if (filter.mode === 'today') return 'Today';
  if (filter.mode === 'week') return 'This week';
  const { startDate: start, endDate: end } = filter;
  if (start === end) return formatShortDate(start);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

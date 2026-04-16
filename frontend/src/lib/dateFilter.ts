import { Task } from '../types';

export type DateFilterMode = 'today' | 'week' | 'custom';

export interface DateFilterState {
  mode: DateFilterMode;
  /** Used only when mode === 'custom'. YYYY-MM-DD */
  startDate: string;
  /** Used only when mode === 'custom'. YYYY-MM-DD */
  endDate: string;
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
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

/**
 * Applies date filtering to a list of tasks.
 *
 * Rules:
 *  - Backlog tasks (no scheduled_at) are always included regardless of date filter.
 *  - Scheduled tasks (have scheduled_at) are shown when their date falls within the range.
 *  - Non-backlog tasks without a scheduled date (edge case: manually promoted) are always shown.
 */
export function filterTasksByDate(tasks: Task[], filter: DateFilterState): Task[] {
  const { start, end } = getEffectiveDateRange(filter);

  return tasks.filter((task) => {
    if (!task.scheduled_at) return true; // backlog or unscheduled — always show
    const taskDate = task.scheduled_at.slice(0, 10); // YYYY-MM-DD
    return taskDate >= start && taskDate <= end;
  });
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

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  DateFilterState,
  defaultDateFilter,
  filterTasksByDate,
  getEffectiveDateRange,
  getTodayDateString,
  getWeekRange,
} from '../src/lib/dateFilter';
import { Task } from '../src/types';

function makeTask(scheduled_date: string, id = scheduled_date): Task {
  return {
    id,
    list_id: 'list-1',
    task_number: 1,
    task_key: id,
    title: id,
    description: '',
    status: 'todo',
    priority: 'none',
    runner_id: null,
    ai_provider: null,
    harness_config: '{}',
    labels: '[]',
    output: null,
    scheduled_date,
    scheduled_time: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-05-07T00:00:00Z',
    updated_at: '2026-05-07T00:00:00Z',
  };
}

describe('dateFilter', () => {
  // Anchor: May 7, 2026 is a Thursday. Mon=May 4, Sun=May 10.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 7, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTodayDateString', () => {
    it('returns the current local date as YYYY-MM-DD', () => {
      expect(getTodayDateString()).toBe('2026-05-07');
    });
  });

  describe('defaultDateFilter', () => {
    it("defaults to mode='today' with startDate=endDate=today", () => {
      const filter = defaultDateFilter();
      expect(filter).toEqual({ mode: 'today', startDate: '2026-05-07', endDate: '2026-05-07' });
    });
  });

  describe('getWeekRange', () => {
    it('returns the current calendar week, Monday through Sunday', () => {
      // Today = Thursday May 7, 2026 → Mon May 4 ... Sun May 10.
      expect(getWeekRange()).toEqual({ start: '2026-05-04', end: '2026-05-10' });
    });

    it('still returns Mon-Sun when today is Sunday', () => {
      vi.setSystemTime(new Date(2026, 4, 10, 23, 0, 0)); // Sunday
      expect(getWeekRange()).toEqual({ start: '2026-05-04', end: '2026-05-10' });
    });

    it('still returns Mon-Sun when today is Monday', () => {
      vi.setSystemTime(new Date(2026, 4, 4, 0, 0, 0)); // Monday
      expect(getWeekRange()).toEqual({ start: '2026-05-04', end: '2026-05-10' });
    });

    it('handles week boundaries that span months', () => {
      // Sunday Mar 1, 2026 → its calendar week is Mon Feb 23 ... Sun Mar 1.
      vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0));
      expect(getWeekRange()).toEqual({ start: '2026-02-23', end: '2026-03-01' });
    });
  });

  describe('getEffectiveDateRange', () => {
    it("returns today's date when mode='today'", () => {
      const range = getEffectiveDateRange({
        mode: 'today',
        startDate: '2026-05-07',
        endDate: '2026-05-07',
      });
      expect(range).toEqual({ start: '2026-05-07', end: '2026-05-07' });
    });

    it("returns the calendar week when mode='week', regardless of stored startDate/endDate", () => {
      // The DateFilter UI keeps startDate/endDate at today/today even when the
      // user picks the "This week" preset; getEffectiveDateRange must rely on
      // mode, not the stored dates, so that "This week" actually expands the
      // range.
      const range = getEffectiveDateRange({
        mode: 'week',
        startDate: '2026-05-07',
        endDate: '2026-05-07',
      });
      expect(range).toEqual({ start: '2026-05-04', end: '2026-05-10' });
    });

    it("returns the custom range when mode='custom'", () => {
      const range = getEffectiveDateRange({
        mode: 'custom',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });
      expect(range).toEqual({ start: '2026-05-01', end: '2026-05-31' });
    });
  });

  describe('filterTasksByDate', () => {
    const tasks = [
      makeTask('2026-05-03'), // Sun (last week)
      makeTask('2026-05-04'), // Mon (this week)
      makeTask('2026-05-06'), // Wed (this week, before today)
      makeTask('2026-05-07'), // Thu (today)
      makeTask('2026-05-08'), // Fri (this week)
      makeTask('2026-05-10'), // Sun (this week, last day)
      makeTask('2026-05-11'), // Mon (next week)
    ];

    it("includes only today's tasks for mode='today'", () => {
      const filter: DateFilterState = {
        mode: 'today',
        startDate: '2026-05-07',
        endDate: '2026-05-07',
      };
      const result = filterTasksByDate(tasks, filter);
      expect(result.map((t) => t.scheduled_date)).toEqual(['2026-05-07']);
    });

    it("includes the entire calendar week (Mon–Sun) for mode='week'", () => {
      // Regression for the user-reported bug: switching from "Today" to
      // "This week" must surface tasks scheduled earlier in the same week
      // (e.g. Mon–Wed when today is Thursday), not just the next 7 days.
      const filter: DateFilterState = {
        mode: 'week',
        startDate: '2026-05-07',
        endDate: '2026-05-07',
      };
      const result = filterTasksByDate(tasks, filter);
      expect(result.map((t) => t.scheduled_date)).toEqual([
        '2026-05-04',
        '2026-05-06',
        '2026-05-07',
        '2026-05-08',
        '2026-05-10',
      ]);
    });

    it("expands the visible task list when switching from 'today' to 'week'", () => {
      const todayFilter: DateFilterState = {
        mode: 'today',
        startDate: '2026-05-07',
        endDate: '2026-05-07',
      };
      const weekFilter: DateFilterState = {
        mode: 'week',
        startDate: '2026-05-07',
        endDate: '2026-05-07',
      };
      const todayResult = filterTasksByDate(tasks, todayFilter);
      const weekResult = filterTasksByDate(tasks, weekFilter);
      expect(todayResult.length).toBe(1);
      expect(weekResult.length).toBeGreaterThan(todayResult.length);
      // Tasks scheduled earlier this week must be present in the "week" view.
      expect(weekResult.map((t) => t.scheduled_date)).toContain('2026-05-04');
      expect(weekResult.map((t) => t.scheduled_date)).toContain('2026-05-06');
    });

    it("respects custom range bounds for mode='custom'", () => {
      const filter: DateFilterState = {
        mode: 'custom',
        startDate: '2026-05-08',
        endDate: '2026-05-12',
      };
      const result = filterTasksByDate(tasks, filter);
      expect(result.map((t) => t.scheduled_date)).toEqual(['2026-05-08', '2026-05-10', '2026-05-11']);
    });
  });
});

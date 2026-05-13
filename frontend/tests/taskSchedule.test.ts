import { describe, expect, it } from 'vitest';
import {
  formatTaskSchedule,
  formatTaskScheduleCompact,
  formatTaskTimeDurationPill,
  getTodayDateInputValue,
  normalizeScheduledTime,
  sortTasksBySchedule,
} from '../src/lib/taskSchedule';
import type { Task } from '../src/types';

describe('taskSchedule helpers', () => {
  describe('normalizeScheduledTime', () => {
    it('returns an empty string for null, undefined, or empty input', () => {
      expect(normalizeScheduledTime(null)).toBe('');
      expect(normalizeScheduledTime(undefined)).toBe('');
      expect(normalizeScheduledTime('')).toBe('');
    });

    it('passes through values that are already HH:MM', () => {
      expect(normalizeScheduledTime('09:30')).toBe('09:30');
      expect(normalizeScheduledTime('00:00')).toBe('00:00');
      expect(normalizeScheduledTime('23:59')).toBe('23:59');
    });

    it('strips a trailing seconds component so the time picker stays HH:MM', () => {
      expect(normalizeScheduledTime('09:30:00')).toBe('09:30');
      expect(normalizeScheduledTime('14:05:42')).toBe('14:05');
    });

    it('strips sub-second precision too', () => {
      expect(normalizeScheduledTime('09:30:00.500')).toBe('09:30');
    });

    it('returns empty for malformed values rather than passing junk to the input', () => {
      expect(normalizeScheduledTime('not-a-time')).toBe('');
      expect(normalizeScheduledTime('9:30')).toBe('');
      expect(normalizeScheduledTime(':')).toBe('');
    });
  });

  describe('getTodayDateInputValue', () => {
    it('formats the supplied date as YYYY-MM-DD with zero-padding', () => {
      expect(getTodayDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(getTodayDateInputValue(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('formatTaskSchedule', () => {
    it('omits the time clause when no time is supplied', () => {
      expect(formatTaskSchedule('2026-05-05', null)).not.toMatch(/at /);
    });

    it('appends the time after "at" when a time is supplied', () => {
      expect(formatTaskSchedule('2026-05-05', '09:30')).toMatch(/ at 09:30$/);
    });

    it('falls back to the raw date string when the date is unparseable', () => {
      expect(formatTaskSchedule('not-a-date', null)).toBe('not-a-date');
    });
  });

  describe('formatTaskScheduleCompact', () => {
    it('joins date and time with a space when time is supplied', () => {
      expect(formatTaskScheduleCompact('2026-05-05', '09:30')).toMatch(/ 09:30$/);
    });

    it('returns just the formatted date when time is null', () => {
      expect(formatTaskScheduleCompact('2026-05-05', null)).not.toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatTaskTimeDurationPill', () => {
    it('returns null when neither time nor duration is set', () => {
      expect(formatTaskTimeDurationPill(null, null)).toBeNull();
      expect(formatTaskTimeDurationPill(undefined, undefined)).toBeNull();
      expect(formatTaskTimeDurationPill('', 0)).toBeNull();
      expect(formatTaskTimeDurationPill('', null)).toBeNull();
      expect(formatTaskTimeDurationPill(null, 0)).toBeNull();
    });

    it('returns just the time when only time is set', () => {
      expect(formatTaskTimeDurationPill('09:30', null)).toBe('09:30');
      expect(formatTaskTimeDurationPill('09:30', 0)).toBe('09:30');
      expect(formatTaskTimeDurationPill('09:30', undefined)).toBe('09:30');
    });

    it('returns just the duration when only duration is set', () => {
      expect(formatTaskTimeDurationPill(null, 30)).toBe('30m');
      expect(formatTaskTimeDurationPill('', 90)).toBe('1h 30m');
      expect(formatTaskTimeDurationPill(undefined, 60)).toBe('1h');
    });

    it('joins time and duration with an arrow when both are set', () => {
      expect(formatTaskTimeDurationPill('09:30', 30)).toBe('09:30 → 30m');
      expect(formatTaskTimeDurationPill('14:00', 90)).toBe('14:00 → 1h 30m');
    });

    it('treats negative or non-finite durations as not set', () => {
      expect(formatTaskTimeDurationPill('09:30', -10)).toBe('09:30');
      expect(formatTaskTimeDurationPill('09:30', Number.NaN)).toBe('09:30');
      expect(formatTaskTimeDurationPill(null, -5)).toBeNull();
    });
  });

  describe('sortTasksBySchedule', () => {
    const task = (id: string, scheduledDate: string, scheduledTime: string | null): Task => ({
      id,
      client_mutation_id: null,
      list_id: null,
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
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      recurrence_rule: null,
      started_at: null,
      completed_at: null,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    });

    it('sorts tasks by scheduled date and time ascending', () => {
      const sorted = sortTasksBySchedule([
        task('later-date', '2026-05-14', '08:00'),
        task('later-time', '2026-05-13', '09:00'),
        task('earlier-time', '2026-05-13', '08:30'),
      ]);

      expect(sorted.map((t) => t.id)).toEqual(['earlier-time', 'later-time', 'later-date']);
    });

    it('treats tasks without a scheduled time as midnight', () => {
      const sorted = sortTasksBySchedule([
        task('morning', '2026-05-13', '08:00'),
        task('empty-time', '2026-05-13', ''),
        task('no-time', '2026-05-13', null),
        task('midnight', '2026-05-13', '00:00'),
      ]);

      expect(sorted.map((t) => t.id)).toEqual(['empty-time', 'no-time', 'midnight', 'morning']);
    });
  });
});

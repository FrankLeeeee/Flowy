import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  timeAgo,
  formatLocalDateTime,
  formatElapsedTime,
  parseUtcTimestamp,
  sortByCompletedAtDesc,
  applyStatusChange,
} from '../src/lib/utils';
import type { Task } from '../src/types';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'id',
    client_mutation_id: null,
    list_id: null,
    task_number: 1,
    task_key: 'KEY-1',
    title: 't',
    description: '',
    status: 'todo',
    priority: 'none',
    runner_id: null,
    ai_provider: null,
    harness_config: '{}',
    labels: '[]',
    output: null,
    scheduled_date: '2026-01-01',
    scheduled_time: null,
    scheduled_duration_minutes: null,
    recurrence_rule: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('frontend/utils', () => {
  describe('parseUtcTimestamp', () => {
    it('re-exports from shared and parses correctly', () => {
      expect(parseUtcTimestamp('2026-01-01T00:00:00Z')).toBe(Date.parse('2026-01-01T00:00:00Z'));
    });
  });

  describe('timeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "never" for null', () => {
      expect(timeAgo(null)).toBe('never');
    });

    it('returns "unknown" for invalid timestamps', () => {
      expect(timeAgo('not-a-date')).toBe('unknown');
    });

    it('returns "just now" for timestamps less than 1 minute ago', () => {
      expect(timeAgo('2026-05-10T11:59:30Z')).toBe('just now');
    });

    it('returns minutes ago for timestamps less than 1 hour ago', () => {
      expect(timeAgo('2026-05-10T11:30:00Z')).toBe('30m ago');
    });

    it('returns hours ago for timestamps less than 1 day ago', () => {
      expect(timeAgo('2026-05-10T06:00:00Z')).toBe('6h ago');
    });

    it('returns days ago for timestamps more than 1 day ago', () => {
      expect(timeAgo('2026-05-07T12:00:00Z')).toBe('3d ago');
    });
  });

  describe('formatLocalDateTime', () => {
    it('returns "-" for null', () => {
      expect(formatLocalDateTime(null)).toBe('-');
    });

    it('returns "Invalid date" for unparseable timestamps', () => {
      expect(formatLocalDateTime('not-a-date')).toBe('Invalid date');
    });

    it('returns a locale string for valid timestamps', () => {
      const result = formatLocalDateTime('2026-05-10T12:00:00Z');
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
      expect(result).not.toBe('Invalid date');
    });
  });

  describe('formatElapsedTime', () => {
    it('returns null when startedAt is null', () => {
      expect(formatElapsedTime(null, '2026-05-10T12:00:00Z')).toBeNull();
    });

    it('returns null when completedAt is null', () => {
      expect(formatElapsedTime('2026-05-10T12:00:00Z', null)).toBeNull();
    });

    it('returns seconds for short durations', () => {
      expect(formatElapsedTime('2026-05-10T12:00:00Z', '2026-05-10T12:00:45Z')).toBe('45s');
    });

    it('returns minutes and seconds', () => {
      expect(formatElapsedTime('2026-05-10T12:00:00Z', '2026-05-10T12:05:30Z')).toBe('5m 30s');
    });

    it('returns hours and minutes', () => {
      expect(formatElapsedTime('2026-05-10T12:00:00Z', '2026-05-10T14:30:00Z')).toBe('2h 30m');
    });

    it('returns days and hours', () => {
      expect(formatElapsedTime('2026-05-10T12:00:00Z', '2026-05-13T18:00:00Z')).toBe('3d 6h');
    });

    it('returns null for negative elapsed time', () => {
      expect(formatElapsedTime('2026-05-10T12:00:00Z', '2026-05-10T11:00:00Z')).toBeNull();
    });
  });

  describe('sortByCompletedAtDesc', () => {
    it('orders tasks by completed_at descending', () => {
      const older = makeTask({ id: 'a', completed_at: '2026-05-10T10:00:00Z' });
      const newer = makeTask({ id: 'b', completed_at: '2026-05-10T12:00:00Z' });
      const middle = makeTask({ id: 'c', completed_at: '2026-05-10T11:00:00Z' });
      const sorted = sortByCompletedAtDesc([older, newer, middle]);
      expect(sorted.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    });

    it('falls back to updated_at when completed_at is null', () => {
      const withCompleted = makeTask({
        id: 'a',
        completed_at: '2026-05-10T08:00:00Z',
        updated_at: '2026-05-10T08:00:00Z',
      });
      const legacy = makeTask({
        id: 'b',
        completed_at: null,
        updated_at: '2026-05-10T12:00:00Z',
      });
      const sorted = sortByCompletedAtDesc([withCompleted, legacy]);
      expect(sorted.map((t) => t.id)).toEqual(['b', 'a']);
    });

    it('does not mutate the input array', () => {
      const tasks = [
        makeTask({ id: 'a', completed_at: '2026-05-10T10:00:00Z' }),
        makeTask({ id: 'b', completed_at: '2026-05-10T12:00:00Z' }),
      ];
      const originalOrder = tasks.map((t) => t.id);
      sortByCompletedAtDesc(tasks);
      expect(tasks.map((t) => t.id)).toEqual(originalOrder);
    });

    it('places tasks with no usable timestamp last', () => {
      const ok = makeTask({ id: 'a', completed_at: '2026-05-10T10:00:00Z' });
      const broken = makeTask({ id: 'b', completed_at: 'not-a-date', updated_at: 'not-a-date' });
      const sorted = sortByCompletedAtDesc([broken, ok]);
      expect(sorted.map((t) => t.id)).toEqual(['a', 'b']);
    });
  });

  describe('applyStatusChange', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('stamps completed_at when transitioning into done', () => {
      const task = makeTask({ status: 'todo', completed_at: null });
      const next = applyStatusChange(task, 'done');
      expect(next.status).toBe('done');
      expect(next.completed_at).toBe('2026-05-10T12:00:00.000Z');
    });

    it('does not restamp completed_at when already done', () => {
      const task = makeTask({ status: 'done', completed_at: '2026-04-01T00:00:00Z' });
      const next = applyStatusChange(task, 'done');
      expect(next.completed_at).toBe('2026-04-01T00:00:00Z');
    });

    it('clears completed_at when moving from done to a non-terminal status', () => {
      const task = makeTask({ status: 'done', completed_at: '2026-04-01T00:00:00Z' });
      const next = applyStatusChange(task, 'todo');
      expect(next.status).toBe('todo');
      expect(next.completed_at).toBeNull();
    });

    it('keeps completed_at when transitioning from done to failed', () => {
      const task = makeTask({ status: 'done', completed_at: '2026-04-01T00:00:00Z' });
      const next = applyStatusChange(task, 'failed');
      expect(next.status).toBe('failed');
      expect(next.completed_at).toBe('2026-04-01T00:00:00Z');
    });

    it('does not touch completed_at for transitions that do not involve done', () => {
      const task = makeTask({ status: 'todo', completed_at: null });
      const next = applyStatusChange(task, 'in_progress');
      expect(next.status).toBe('in_progress');
      expect(next.completed_at).toBeNull();
    });
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { timeAgo, formatLocalDateTime, formatElapsedTime, parseUtcTimestamp } from '../src/lib/utils';

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
});

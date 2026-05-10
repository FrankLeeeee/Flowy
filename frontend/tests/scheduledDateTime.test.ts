import { describe, expect, it } from 'vitest';
import {
  splitScheduledDateTime,
  combineScheduledDateTime,
  updateScheduledDate,
  updateScheduledTime,
  normalizeTimeInput,
  formatScheduledDateTime,
} from '../src/lib/scheduledDateTime';

describe('scheduledDateTime', () => {
  describe('splitScheduledDateTime', () => {
    it('returns empty strings for null', () => {
      expect(splitScheduledDateTime(null)).toEqual({ date: '', time: '' });
    });

    it('returns empty strings for undefined', () => {
      expect(splitScheduledDateTime(undefined)).toEqual({ date: '', time: '' });
    });

    it('splits UTC ISO string into local date and time', () => {
      const result = splitScheduledDateTime('2026-05-10T00:00:00.000Z');
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('splits naive datetime with T separator', () => {
      expect(splitScheduledDateTime('2026-05-10T14:30')).toEqual({ date: '2026-05-10', time: '14:30' });
    });

    it('handles date-only input', () => {
      expect(splitScheduledDateTime('2026-05-10')).toEqual({ date: '2026-05-10', time: '' });
    });
  });

  describe('combineScheduledDateTime', () => {
    it('returns empty string for empty date', () => {
      expect(combineScheduledDateTime('', '14:30')).toBe('');
    });

    it('combines date and time into ISO string', () => {
      const result = combineScheduledDateTime('2026-05-10', '14:30');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('uses midnight when time is empty', () => {
      const result = combineScheduledDateTime('2026-05-10', '');
      expect(result).toBeTruthy();
    });
  });

  describe('updateScheduledDate', () => {
    it('preserves the time while changing the date', () => {
      const result = updateScheduledDate('2026-05-10T14:30', '2026-06-15');
      const parsed = new Date(result);
      expect(parsed.getMonth()).toBe(5); // June
      expect(parsed.getDate()).toBe(15);
    });
  });

  describe('updateScheduledTime', () => {
    it('returns empty string when there is no existing date', () => {
      expect(updateScheduledTime('', '14:30')).toBe('');
    });

    it('preserves the date while changing the time', () => {
      const result = updateScheduledTime('2026-05-10T08:00', '14:30');
      expect(result).toBeTruthy();
    });
  });

  describe('normalizeTimeInput', () => {
    it('returns empty for empty string', () => {
      expect(normalizeTimeInput('')).toBe('');
    });

    it('normalizes single-digit hour', () => {
      expect(normalizeTimeInput('9')).toBe('09:00');
    });

    it('normalizes HH:MM format', () => {
      expect(normalizeTimeInput('14:30')).toBe('14:30');
    });

    it('normalizes compact 3-digit format', () => {
      expect(normalizeTimeInput('930')).toBe('09:30');
    });

    it('normalizes compact 4-digit format', () => {
      expect(normalizeTimeInput('1430')).toBe('14:30');
    });

    it('rejects invalid hours', () => {
      expect(normalizeTimeInput('25:00')).toBe('25:00');
    });

    it('rejects invalid minutes', () => {
      expect(normalizeTimeInput('12:61')).toBe('12:61');
    });

    it('handles H:MM format', () => {
      expect(normalizeTimeInput('9:05')).toBe('09:05');
    });
  });

  describe('formatScheduledDateTime', () => {
    it('returns "-" for null', () => {
      expect(formatScheduledDateTime(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatScheduledDateTime(undefined)).toBe('-');
    });

    it('formats UTC ISO string as locale string', () => {
      const result = formatScheduledDateTime('2026-05-10T14:30:00Z');
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
    });

    it('formats naive datetime', () => {
      const result = formatScheduledDateTime('2026-05-10T14:30');
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
    });
  });
});

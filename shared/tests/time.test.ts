import { describe, expect, it } from 'vitest';
import { formatWallClock, parseUtcTimestamp, utcNow, wallClockToUtcMs } from '../src/time';

describe('shared/time', () => {
  describe('parseUtcTimestamp', () => {
    it('parses ISO 8601 UTC timestamps', () => {
      expect(parseUtcTimestamp('2026-05-05T10:27:00.000Z')).toBe(Date.parse('2026-05-05T10:27:00.000Z'));
    });

    it('parses legacy SQLite timestamps without timezone as UTC', () => {
      expect(parseUtcTimestamp('2026-05-05 10:27:00')).toBe(Date.parse('2026-05-05T10:27:00Z'));
    });

    it('handles timestamps with positive timezone offset', () => {
      expect(parseUtcTimestamp('2026-05-05T10:27:00+05:30')).toBe(Date.parse('2026-05-05T10:27:00+05:30'));
    });

    it('handles timestamps with negative timezone offset', () => {
      expect(parseUtcTimestamp('2026-05-05T10:27:00-04:00')).toBe(Date.parse('2026-05-05T10:27:00-04:00'));
    });

    it('trims whitespace', () => {
      expect(parseUtcTimestamp('  2026-05-05T10:27:00Z  ')).toBe(Date.parse('2026-05-05T10:27:00Z'));
    });

    it('returns NaN for invalid input', () => {
      expect(parseUtcTimestamp('not-a-date')).toBeNaN();
    });
  });

  describe('utcNow', () => {
    it('returns a valid ISO 8601 UTC string', () => {
      expect(utcNow()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('returns a timestamp close to the current time', () => {
      const now = Date.now();
      const result = new Date(utcNow()).getTime();
      expect(Math.abs(result - now)).toBeLessThan(1000);
    });
  });

  describe('formatWallClock', () => {
    // 2026-05-11T03:10:00Z is the UTC instant for "11:10 Singapore time".
    const instant = new Date('2026-05-11T03:10:00Z');

    it('formats a Date in the given IANA timezone', () => {
      expect(formatWallClock(instant, 'Asia/Singapore')).toEqual({ date: '2026-05-11', time: '11:10' });
      expect(formatWallClock(instant, 'UTC')).toEqual({ date: '2026-05-11', time: '03:10' });
    });

    it('handles negative-offset zones with DST', () => {
      // EDT is UTC-4 in May, so 03:10 UTC = 23:10 the previous day.
      expect(formatWallClock(instant, 'America/New_York')).toEqual({ date: '2026-05-10', time: '23:10' });
    });

    it('falls back to system local time when no zone is given', () => {
      const fallback = formatWallClock(instant);
      const expected = {
        date: `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`,
        time: `${String(instant.getHours()).padStart(2, '0')}:${String(instant.getMinutes()).padStart(2, '0')}`,
      };
      expect(fallback).toEqual(expected);
    });
  });

  describe('wallClockToUtcMs', () => {
    it('resolves a wall-clock time in the given zone to the right UTC instant', () => {
      expect(wallClockToUtcMs('2026-05-11', '11:10', 'Asia/Singapore'))
        .toBe(Date.parse('2026-05-11T03:10:00Z'));
      expect(wallClockToUtcMs('2026-05-11', '11:10', 'UTC'))
        .toBe(Date.parse('2026-05-11T11:10:00Z'));
    });

    it('handles DST zones correctly across the year', () => {
      // January in New York is EST (UTC-5).
      expect(wallClockToUtcMs('2026-01-15', '09:00', 'America/New_York'))
        .toBe(Date.parse('2026-01-15T14:00:00Z'));
      // July in New York is EDT (UTC-4).
      expect(wallClockToUtcMs('2026-07-15', '09:00', 'America/New_York'))
        .toBe(Date.parse('2026-07-15T13:00:00Z'));
    });

    it('round-trips through formatWallClock', () => {
      const tz = 'Asia/Singapore';
      const ms = wallClockToUtcMs('2026-05-11', '11:10', tz);
      expect(formatWallClock(new Date(ms), tz)).toEqual({ date: '2026-05-11', time: '11:10' });
    });

    it('returns NaN for unparseable input', () => {
      expect(wallClockToUtcMs('not-a-date', '11:10', 'UTC')).toBeNaN();
      expect(wallClockToUtcMs('2026-05-11', 'oops', 'UTC')).toBeNaN();
    });
  });
});

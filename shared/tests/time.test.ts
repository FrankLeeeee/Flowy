import { describe, expect, it } from 'vitest';
import { parseUtcTimestamp, utcNow } from '../src/time';

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
});

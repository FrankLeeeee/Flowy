import { describe, expect, it } from 'vitest';
import { formatIsoDate } from '../src/dateFormat';

describe('shared/dateFormat', () => {
  describe('formatIsoDate', () => {
    it('formats a date as YYYY-MM-DD', () => {
      expect(formatIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('pads single-digit months and days', () => {
      expect(formatIsoDate(new Date(2026, 2, 9))).toBe('2026-03-09');
    });

    it('handles double-digit months and days', () => {
      expect(formatIsoDate(new Date(2026, 11, 25))).toBe('2026-12-25');
    });

    it('handles end-of-year boundary', () => {
      expect(formatIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('handles start-of-year boundary', () => {
      expect(formatIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    });
  });
});

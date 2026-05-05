import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { addDays, formatDateLabel } from '../src/lib/mobileDateBar';

describe('MobileDateBar helpers', () => {
  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2026-05-05', 1)).toBe('2026-05-06');
      expect(addDays('2026-05-05', 7)).toBe('2026-05-12');
    });

    it('subtracts days with negative values', () => {
      expect(addDays('2026-05-05', -1)).toBe('2026-05-04');
      expect(addDays('2026-05-05', -5)).toBe('2026-04-30');
    });

    it('handles month boundaries', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });

    it('handles year boundaries', () => {
      expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    });

    it('pads month and day to two digits', () => {
      expect(addDays('2026-01-01', 0)).toBe('2026-01-01');
      expect(addDays('2026-09-09', 0)).toBe('2026-09-09');
    });
  });

  describe('formatDateLabel', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 5)); // May 5, 2026
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Today" for today', () => {
      expect(formatDateLabel('2026-05-05')).toBe('Today');
    });

    it('returns "Tomorrow" for tomorrow', () => {
      expect(formatDateLabel('2026-05-06')).toBe('Tomorrow');
    });

    it('returns "Yesterday" for yesterday', () => {
      expect(formatDateLabel('2026-05-04')).toBe('Yesterday');
    });

    it('returns formatted date for other days', () => {
      const label = formatDateLabel('2026-05-10');
      expect(label).toContain('10');
    });
  });
});

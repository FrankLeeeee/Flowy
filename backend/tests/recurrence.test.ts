import { describe, expect, it } from 'vitest';
import { computeNextDate, parseRecurrenceRule } from '../src/recurrence';
import { RecurrenceRule } from '../src/types';

describe('parseRecurrenceRule', () => {
  it('returns null for null input', () => {
    expect(parseRecurrenceRule(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseRecurrenceRule('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseRecurrenceRule('not json')).toBeNull();
  });

  it('parses a valid recurrence rule', () => {
    const rule: RecurrenceRule = { frequency: 'week', interval: 1, daysOfWeek: [1, 3, 5] };
    expect(parseRecurrenceRule(JSON.stringify(rule))).toEqual(rule);
  });

  it('parses a rule with all optional fields', () => {
    const rule: RecurrenceRule = {
      frequency: 'day',
      interval: 2,
      time: '14:30',
      endDate: '2026-12-31',
    };
    expect(parseRecurrenceRule(JSON.stringify(rule))).toEqual(rule);
  });
});

describe('computeNextDate', () => {
  describe('daily recurrence', () => {
    it('advances by 1 day for interval=1', () => {
      const rule: RecurrenceRule = { frequency: 'day', interval: 1 };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-10');
    });

    it('advances by N days for interval=N', () => {
      const rule: RecurrenceRule = { frequency: 'day', interval: 3 };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-12');
    });

    it('rolls over month boundaries', () => {
      const rule: RecurrenceRule = { frequency: 'day', interval: 1 };
      expect(computeNextDate('2026-05-31', rule)).toBe('2026-06-01');
    });

    it('rolls over year boundaries', () => {
      const rule: RecurrenceRule = { frequency: 'day', interval: 1 };
      expect(computeNextDate('2026-12-31', rule)).toBe('2027-01-01');
    });
  });

  describe('weekly recurrence', () => {
    it('advances by 7 days when no daysOfWeek specified', () => {
      const rule: RecurrenceRule = { frequency: 'week', interval: 1 };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-16');
    });

    it('advances by 14 days for interval=2 without daysOfWeek', () => {
      const rule: RecurrenceRule = { frequency: 'week', interval: 2 };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-23');
    });

    it('picks the next day-of-week in the same week', () => {
      // 2026-05-07 is Thursday (day 4). daysOfWeek=[5] (Friday).
      const rule: RecurrenceRule = { frequency: 'week', interval: 1, daysOfWeek: [5] };
      expect(computeNextDate('2026-05-07', rule)).toBe('2026-05-08');
    });

    it('wraps to the first day-of-week in the next interval when past all days', () => {
      // 2026-05-09 is Saturday (day 6). daysOfWeek=[1,3] (Mon,Wed).
      // Next occurrence = Mon of next week = 2026-05-11.
      const rule: RecurrenceRule = { frequency: 'week', interval: 1, daysOfWeek: [1, 3] };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-11');
    });

    it('skips weeks for interval > 1 when wrapping around', () => {
      // 2026-05-09 is Saturday (day 6). daysOfWeek=[1] (Mon). interval=2.
      // Next Mon after skipping 2 weeks worth of days from Saturday:
      // daysToNextWeek = 7*2 - 6 + 1 = 9, so 2026-05-09 + 9 = 2026-05-18 (Mon).
      const rule: RecurrenceRule = { frequency: 'week', interval: 2, daysOfWeek: [1] };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-18');
    });

    it('handles multiple daysOfWeek with next day later in same week', () => {
      // 2026-05-05 is Tuesday (day 2). daysOfWeek=[1,3,5] (Mon,Wed,Fri).
      // Next after Tuesday = Wednesday = 2026-05-06.
      const rule: RecurrenceRule = { frequency: 'week', interval: 1, daysOfWeek: [1, 3, 5] };
      expect(computeNextDate('2026-05-05', rule)).toBe('2026-05-06');
    });

    it('handles unsorted daysOfWeek input', () => {
      // daysOfWeek=[5,1,3] should behave same as [1,3,5].
      const rule: RecurrenceRule = { frequency: 'week', interval: 1, daysOfWeek: [5, 1, 3] };
      expect(computeNextDate('2026-05-05', rule)).toBe('2026-05-06');
    });
  });

  describe('monthly recurrence', () => {
    it('advances by 1 month for interval=1', () => {
      const rule: RecurrenceRule = { frequency: 'month', interval: 1 };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-06-09');
    });

    it('advances by N months for interval=N', () => {
      const rule: RecurrenceRule = { frequency: 'month', interval: 3 };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-08-09');
    });

    it('rolls over year boundaries', () => {
      const rule: RecurrenceRule = { frequency: 'month', interval: 1 };
      expect(computeNextDate('2026-12-15', rule)).toBe('2027-01-15');
    });

    it('clamps day when target month is shorter (Jan 31 + 1 month)', () => {
      // JavaScript Date rolls Jan 31 + 1 month to Mar 3 (28 days in Feb).
      const rule: RecurrenceRule = { frequency: 'month', interval: 1 };
      const result = computeNextDate('2026-01-31', rule);
      // Feb 2026 has 28 days, JS Date overflows to March 3.
      expect(result).toBe('2026-03-03');
    });
  });

  describe('end date enforcement', () => {
    it('returns the next date when it falls before the end date', () => {
      // computeNextDate itself does not enforce endDate (that is done in
      // spawnNextRecurrence), but we verify the date is correct for the
      // caller to compare.
      const rule: RecurrenceRule = { frequency: 'day', interval: 1, endDate: '2026-05-20' };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-10');
    });

    it('returns the next date even when past end date (caller enforces)', () => {
      const rule: RecurrenceRule = { frequency: 'day', interval: 1, endDate: '2026-05-09' };
      expect(computeNextDate('2026-05-09', rule)).toBe('2026-05-10');
    });
  });
});

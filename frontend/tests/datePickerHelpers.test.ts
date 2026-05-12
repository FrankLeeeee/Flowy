import { describe, expect, it } from 'vitest';
import {
  buildCalendarGrid,
  formatTimeValue,
  isSameDay,
  parseIsoDate,
  parseTimeValue,
} from '../src/lib/datePickerHelpers';

describe('parseIsoDate', () => {
  it('parses a well-formed YYYY-MM-DD string into a local Date', () => {
    const d = parseIsoDate('2026-05-13');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getDate()).toBe(13);
  });

  it('returns null for empty, null, or undefined values', () => {
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
  });

  it('returns null for malformed strings', () => {
    expect(parseIsoDate('not-a-date')).toBeNull();
    expect(parseIsoDate('2026/05/13')).toBeNull();
    expect(parseIsoDate('2026-5-13')).toBeNull();
    expect(parseIsoDate('05-13-2026')).toBeNull();
  });

  it('rejects out-of-range months or days', () => {
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('2026-00-15')).toBeNull();
    expect(parseIsoDate('2026-05-32')).toBeNull();
    expect(parseIsoDate('2026-02-30')).toBeNull();
  });
});

describe('parseTimeValue', () => {
  it('parses HH:MM values', () => {
    expect(parseTimeValue('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeValue('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseTimeValue('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it('tolerates trailing seconds and sub-seconds (matches normalizeScheduledTime input)', () => {
    expect(parseTimeValue('14:05:42')).toEqual({ hour: 14, minute: 5 });
    expect(parseTimeValue('09:30:00.500')).toEqual({ hour: 9, minute: 30 });
  });

  it('returns null for empty or null inputs', () => {
    expect(parseTimeValue('')).toBeNull();
    expect(parseTimeValue(null)).toBeNull();
    expect(parseTimeValue(undefined)).toBeNull();
  });

  it('returns null for malformed or out-of-range values', () => {
    expect(parseTimeValue('9:30')).toBeNull();
    expect(parseTimeValue('not-a-time')).toBeNull();
    expect(parseTimeValue('24:00')).toBeNull();
    expect(parseTimeValue('12:60')).toBeNull();
  });
});

describe('formatTimeValue', () => {
  it('zero-pads single-digit components', () => {
    expect(formatTimeValue(9, 5)).toBe('09:05');
    expect(formatTimeValue(0, 0)).toBe('00:00');
    expect(formatTimeValue(23, 59)).toBe('23:59');
  });

  it('round-trips with parseTimeValue', () => {
    const parsed = parseTimeValue('14:07')!;
    expect(formatTimeValue(parsed.hour, parsed.minute)).toBe('14:07');
  });
});

describe('isSameDay', () => {
  it('treats two dates with the same local Y/M/D as equal', () => {
    const a = new Date(2026, 4, 13, 8, 30);
    const b = new Date(2026, 4, 13, 22, 59);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('treats different days as not equal', () => {
    expect(isSameDay(new Date(2026, 4, 13), new Date(2026, 4, 14))).toBe(false);
    expect(isSameDay(new Date(2026, 4, 13), new Date(2026, 5, 13))).toBe(false);
    expect(isSameDay(new Date(2026, 4, 13), new Date(2027, 4, 13))).toBe(false);
  });
});

describe('buildCalendarGrid', () => {
  it('returns 42 cells covering 6 weeks', () => {
    const grid = buildCalendarGrid(new Date(2026, 4, 1));
    expect(grid).toHaveLength(42);
  });

  it('starts on the Sunday on or before the 1st of the month', () => {
    // May 2026 starts on a Friday, so the grid starts on the prior Sunday Apr 26
    const grid = buildCalendarGrid(new Date(2026, 4, 1));
    expect(grid[0].getDay()).toBe(0);
    expect(grid[0].getFullYear()).toBe(2026);
    expect(grid[0].getMonth()).toBe(3);
    expect(grid[0].getDate()).toBe(26);
  });

  it('starts on the 1st when the month begins on a Sunday', () => {
    // February 2026 begins on a Sunday
    const grid = buildCalendarGrid(new Date(2026, 1, 1));
    expect(grid[0].getMonth()).toBe(1);
    expect(grid[0].getDate()).toBe(1);
  });

  it('always fully contains the target month', () => {
    const viewMonth = new Date(2026, 4, 1);
    const grid = buildCalendarGrid(viewMonth);
    const inMonth = grid.filter((d) => d.getMonth() === 4);
    expect(inMonth.length).toBe(31);
  });
});

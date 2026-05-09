import { describe, expect, it } from 'vitest';
import { formatDateISO, formatTimeHHMM, todayDateISO, currentTimeHHMM, parseUtcTimestamp, utcNow } from '../src/time';

describe('time helpers', () => {
  it('stores new timestamps as UTC ISO strings', () => {
    expect(utcNow()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('parses legacy SQLite timestamps as UTC', () => {
    expect(parseUtcTimestamp('2026-05-05 10:27:00')).toBe(Date.parse('2026-05-05T10:27:00Z'));
  });

  it('parses ISO timestamps without shifting them again', () => {
    expect(parseUtcTimestamp('2026-05-05T10:27:00.000Z')).toBe(Date.parse('2026-05-05T10:27:00.000Z'));
  });

  it('formatDateISO returns YYYY-MM-DD for a given date', () => {
    expect(formatDateISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateISO(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('formatTimeHHMM returns HH:MM for a given date', () => {
    const d = new Date(2026, 0, 1, 9, 5);
    expect(formatTimeHHMM(d)).toBe('09:05');
    const d2 = new Date(2026, 0, 1, 23, 59);
    expect(formatTimeHHMM(d2)).toBe('23:59');
  });

  it('todayDateISO returns a valid YYYY-MM-DD string', () => {
    expect(todayDateISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('currentTimeHHMM returns a valid HH:MM string', () => {
    expect(currentTimeHHMM()).toMatch(/^\d{2}:\d{2}$/);
  });
});

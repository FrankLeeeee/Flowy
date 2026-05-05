import { describe, expect, it } from 'vitest';
import { parseUtcTimestamp, utcNow } from '../src/time';

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
});

import { afterEach, describe, expect, it } from 'vitest';
import {
  nowAsScheduledWallClock,
  parseUtcTimestamp,
  scheduledWallClockToMs,
  utcNow,
} from '../src/time';

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

describe('schedule timezone', () => {
  const originalTz = process.env.FLOWY_SCHEDULE_TZ;

  afterEach(() => {
    if (originalTz === undefined) delete process.env.FLOWY_SCHEDULE_TZ;
    else process.env.FLOWY_SCHEDULE_TZ = originalTz;
  });

  it('interprets a UTC server instant as Singapore wall-clock when configured', () => {
    process.env.FLOWY_SCHEDULE_TZ = 'Asia/Singapore';
    // 03:10 UTC on 2026-05-11 is 11:10 Singapore time.
    expect(nowAsScheduledWallClock(new Date('2026-05-11T03:10:00Z')))
      .toEqual({ date: '2026-05-11', time: '11:10' });
  });

  it('converts a stored Singapore wall-clock to its real UTC instant', () => {
    process.env.FLOWY_SCHEDULE_TZ = 'Asia/Singapore';
    expect(scheduledWallClockToMs('2026-05-11', '11:10'))
      .toBe(Date.parse('2026-05-11T03:10:00Z'));
  });

  it('treats blank FLOWY_SCHEDULE_TZ as unset (falls back to system local)', () => {
    process.env.FLOWY_SCHEDULE_TZ = '   ';
    const now = new Date();
    const result = nowAsScheduledWallClock(now);
    expect(result.date).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    );
  });
});

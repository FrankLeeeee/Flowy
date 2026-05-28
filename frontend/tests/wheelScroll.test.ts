import { describe, expect, it } from 'vitest';
import { computeWheelScrollTop } from '../src/hooks/useWheelScroll';

describe('computeWheelScrollTop', () => {
  it('returns null when content fits (no overflow)', () => {
    expect(computeWheelScrollTop({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 }, 40)).toBeNull();
    expect(computeWheelScrollTop({ scrollTop: 0, scrollHeight: 80, clientHeight: 100 }, 40)).toBeNull();
  });

  it('advances scrollTop by the wheel delta when content overflows', () => {
    expect(computeWheelScrollTop({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 }, 40)).toBe(40);
    expect(computeWheelScrollTop({ scrollTop: 40, scrollHeight: 300, clientHeight: 100 }, 25)).toBe(65);
  });

  it('handles upward (negative) deltas', () => {
    expect(computeWheelScrollTop({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 }, -30)).toBe(70);
  });

  it('does not clamp out-of-range values (the browser clamps scrollTop)', () => {
    expect(computeWheelScrollTop({ scrollTop: 190, scrollHeight: 300, clientHeight: 100 }, 50)).toBe(240);
    expect(computeWheelScrollTop({ scrollTop: 10, scrollHeight: 300, clientHeight: 100 }, -50)).toBe(-40);
  });
});

import { describe, expect, it } from 'vitest';
import {
  REVEAL_ACTION_WIDTH,
  REVEAL_OPEN_FRACTION,
  clampRevealOffset,
  shouldStayOpen,
} from '../src/lib/swipeReveal';

describe('swipeReveal helpers', () => {
  describe('clampRevealOffset', () => {
    it('never slides right past the closed resting edge', () => {
      expect(clampRevealOffset(40)).toBe(0);
      expect(clampRevealOffset(0.5)).toBe(0);
    });

    it('never slides left past the action width', () => {
      expect(clampRevealOffset(-(REVEAL_ACTION_WIDTH + 50))).toBe(-REVEAL_ACTION_WIDTH);
      expect(clampRevealOffset(-200, 90)).toBe(-90);
    });

    it('passes through offsets inside the travel range', () => {
      expect(clampRevealOffset(-10)).toBe(-10);
      expect(clampRevealOffset(-REVEAL_ACTION_WIDTH)).toBe(-REVEAL_ACTION_WIDTH);
      expect(clampRevealOffset(0)).toBe(0);
    });
  });

  describe('shouldStayOpen', () => {
    const threshold = REVEAL_ACTION_WIDTH * REVEAL_OPEN_FRACTION;

    it('settles open once dragged past the open fraction', () => {
      expect(shouldStayOpen(-threshold)).toBe(true);
      expect(shouldStayOpen(-(threshold + 5))).toBe(true);
      expect(shouldStayOpen(-REVEAL_ACTION_WIDTH)).toBe(true);
    });

    it('settles closed when released short of the threshold', () => {
      expect(shouldStayOpen(0)).toBe(false);
      expect(shouldStayOpen(-(threshold - 1))).toBe(false);
    });

    it('is symmetric about the sign of the offset', () => {
      expect(shouldStayOpen(threshold)).toBe(shouldStayOpen(-threshold));
    });

    it('respects a custom action width and fraction', () => {
      expect(shouldStayOpen(-40, 100, 0.5)).toBe(false);
      expect(shouldStayOpen(-60, 100, 0.5)).toBe(true);
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  SWIPE_CLOSE_THRESHOLD,
  SWIPE_DIRECTION_DEADZONE,
  dismissTranslateX,
  dragOpacity,
  isHorizontalSwipe,
  shouldDismiss,
  swipeDirection,
} from '../src/lib/swipeDismiss';

describe('swipeDismiss helpers', () => {
  describe('isHorizontalSwipe', () => {
    it('is false inside the deadzone', () => {
      expect(isHorizontalSwipe({ dx: SWIPE_DIRECTION_DEADZONE, dy: 0 })).toBe(false);
      expect(isHorizontalSwipe({ dx: -5, dy: 0 })).toBe(false);
    });

    it('is true once horizontal travel clears the deadzone and dominates', () => {
      expect(isHorizontalSwipe({ dx: 40, dy: 5 })).toBe(true);
      expect(isHorizontalSwipe({ dx: -40, dy: 5 })).toBe(true);
    });

    it('is false when the gesture is more vertical than horizontal', () => {
      expect(isHorizontalSwipe({ dx: 40, dy: 60 })).toBe(false);
      expect(isHorizontalSwipe({ dx: -30, dy: -50 })).toBe(false);
    });

    it('respects a custom deadzone', () => {
      expect(isHorizontalSwipe({ dx: 20, dy: 0 }, 25)).toBe(false);
      expect(isHorizontalSwipe({ dx: 30, dy: 0 }, 25)).toBe(true);
    });
  });

  describe('shouldDismiss', () => {
    it('dismisses at or beyond the threshold in either direction', () => {
      expect(shouldDismiss(SWIPE_CLOSE_THRESHOLD)).toBe(true);
      expect(shouldDismiss(-SWIPE_CLOSE_THRESHOLD)).toBe(true);
      expect(shouldDismiss(SWIPE_CLOSE_THRESHOLD + 50)).toBe(true);
    });

    it('does not dismiss below the threshold', () => {
      expect(shouldDismiss(SWIPE_CLOSE_THRESHOLD - 1)).toBe(false);
      expect(shouldDismiss(0)).toBe(false);
      expect(shouldDismiss(-10)).toBe(false);
    });

    it('respects a custom threshold', () => {
      expect(shouldDismiss(60, 50)).toBe(true);
      expect(shouldDismiss(40, 50)).toBe(false);
    });
  });

  describe('swipeDirection', () => {
    it('maps sign of offset to direction', () => {
      expect(swipeDirection(10)).toBe(1);
      expect(swipeDirection(-10)).toBe(-1);
      expect(swipeDirection(0)).toBe(0);
    });
  });

  describe('dismissTranslateX', () => {
    it('flies out the swiped side by a full viewport width', () => {
      expect(dismissTranslateX(120, 400)).toBe(400);
      expect(dismissTranslateX(-120, 400)).toBe(-400);
    });

    it('stays put when centered', () => {
      expect(dismissTranslateX(0, 400)).toBe(0);
    });
  });

  describe('dragOpacity', () => {
    it('is fully opaque when centered', () => {
      expect(dragOpacity(0)).toBe(1);
    });

    it('fades as the drag grows but never below 0.4', () => {
      const mid = dragOpacity(SWIPE_CLOSE_THRESHOLD);
      expect(mid).toBeLessThan(1);
      expect(mid).toBeGreaterThan(0.4);
      expect(dragOpacity(SWIPE_CLOSE_THRESHOLD * 4)).toBe(0.4);
    });

    it('is symmetric for left and right swipes', () => {
      expect(dragOpacity(70)).toBe(dragOpacity(-70));
    });
  });
});

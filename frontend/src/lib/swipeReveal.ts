/**
 * Pure geometry helpers for the horizontal swipe-to-reveal gesture used by
 * mobile task cards: swiping right-to-left slides the card aside to expose a
 * delete action pinned to its trailing edge, and swiping left-to-right tucks
 * it away again. Kept free of React/DOM so the decision logic can be unit
 * tested in isolation, mirroring `swipeDismiss.ts`.
 *
 * Offset convention: the card's translateX is negative while it is pulled left
 * (revealing the action) and 0 at the resting/closed position.
 */

/** Width (px) of the trailing delete action the card slides aside to reveal. */
export const REVEAL_ACTION_WIDTH = 76;

/**
 * Fraction of the action width the card must be dragged past before releasing
 * settles it open rather than snapping closed.
 */
export const REVEAL_OPEN_FRACTION = 0.4;

/** Duration (ms) of the snap-open / snap-closed animation after release. */
export const REVEAL_SNAP_DURATION_MS = 220;

/**
 * Constrains a raw drag offset to the closed↔open travel range. The card can
 * never slide right past its resting edge (0) nor further left than the action
 * width, so the revealed action is always exactly covered — no gap, no overshoot.
 */
export function clampRevealOffset(
  rawOffset: number,
  actionWidth: number = REVEAL_ACTION_WIDTH,
): number {
  if (rawOffset > 0) return 0;
  if (rawOffset < -actionWidth) return -actionWidth;
  return rawOffset;
}

/**
 * Whether a released offset is far enough toward the open edge to settle open.
 * Works in both directions: opening from rest crosses the threshold travelling
 * left, while closing from open crosses it coming back right.
 */
export function shouldStayOpen(
  offset: number,
  actionWidth: number = REVEAL_ACTION_WIDTH,
  openFraction: number = REVEAL_OPEN_FRACTION,
): boolean {
  return Math.abs(offset) >= actionWidth * openFraction;
}

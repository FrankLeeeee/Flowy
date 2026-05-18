/**
 * Pure geometry helpers for the horizontal swipe-to-dismiss gesture used by
 * full-screen mobile dialogs. Kept free of React/DOM so the decision logic can
 * be unit tested in isolation.
 */

/**
 * Minimum horizontal travel (px) before a gesture is treated as a swipe rather
 * than a tap. The gesture must also be more horizontal than vertical so that
 * vertical scrolling inside the dialog keeps working.
 */
export const SWIPE_DIRECTION_DEADZONE = 12;

/** Horizontal travel (px) past which releasing the gesture dismisses the dialog. */
export const SWIPE_CLOSE_THRESHOLD = 90;

/** Duration (ms) of the snap-back / fly-off exit animation. */
export const SWIPE_EXIT_DURATION_MS = 200;

export interface SwipeVector {
  dx: number;
  dy: number;
}

/**
 * A gesture only becomes a horizontal swipe once it has moved further
 * horizontally than vertically and cleared the deadzone. This lets a mostly
 * vertical drag fall through to native scrolling.
 */
export function isHorizontalSwipe(
  { dx, dy }: SwipeVector,
  deadzone: number = SWIPE_DIRECTION_DEADZONE,
): boolean {
  return Math.abs(dx) > deadzone && Math.abs(dx) > Math.abs(dy);
}

/** Whether the released horizontal offset is far enough to dismiss the dialog. */
export function shouldDismiss(
  translateX: number,
  threshold: number = SWIPE_CLOSE_THRESHOLD,
): boolean {
  return Math.abs(translateX) >= threshold;
}

/** -1 when swiping left, 1 when swiping right, 0 when centered. */
export function swipeDirection(translateX: number): -1 | 0 | 1 {
  if (translateX > 0) return 1;
  if (translateX < 0) return -1;
  return 0;
}

/**
 * Off-screen X translation (px) for the exit animation, sending the dialog out
 * the same side the user swiped toward.
 */
export function dismissTranslateX(translateX: number, viewportWidth: number): number {
  return swipeDirection(translateX) * viewportWidth;
}

/**
 * Opacity while dragging — the dialog fades as it approaches (and passes) the
 * dismiss threshold, bottoming out at 0.4 so it never disappears mid-drag.
 */
export function dragOpacity(
  translateX: number,
  threshold: number = SWIPE_CLOSE_THRESHOLD,
): number {
  const progress = Math.min(Math.abs(translateX) / (threshold * 2), 1);
  return Number((1 - progress * 0.6).toFixed(4));
}

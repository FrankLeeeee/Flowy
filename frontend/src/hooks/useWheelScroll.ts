import { RefObject, useEffect } from 'react';

export interface WheelScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Returns the scrollTop the container should move to for a wheel delta, or
 * null when the content fits and no scrolling should happen (so the caller can
 * skip preventDefault and let the event through). The browser clamps an
 * out-of-range scrollTop, so no manual clamping is needed.
 */
export function computeWheelScrollTop(metrics: WheelScrollMetrics, deltaY: number): number | null {
  if (metrics.scrollHeight <= metrics.clientHeight) return null;
  return metrics.scrollTop + deltaY;
}

/**
 * Drives vertical wheel/trackpad scrolling on a scroll container that lives
 * inside a portaled popover or select.
 *
 * Such content is portaled outside the Dialog, whose react-remove-scroll lock
 * swallows wheel events on the portaled subtree — leaving the scrollbar
 * draggable but wheel/trackpad scrolling dead. A non-passive listener lets us
 * preventDefault and scroll manually.
 *
 * Pass `enabled` reflecting when the container is mounted (e.g. popover open)
 * so the listener re-attaches each time the content remounts.
 */
export function useWheelScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const container = ref.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      const next = computeWheelScrollTop(container, e.deltaY);
      if (next === null) return;
      e.preventDefault();
      container.scrollTop = next;
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [ref, enabled]);
}

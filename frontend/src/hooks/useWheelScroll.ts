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
 * Call this from the component that renders the scroll container, so the effect
 * runs once the ref is attached. Radix portaled content mounts a commit after
 * the popover opens (its Presence dispatches MOUNT from a layout effect), so a
 * hook hosted in an always-mounted parent would run before the node exists.
 */
export function useWheelScroll<T extends HTMLElement>(ref: RefObject<T | null>): void {
  useEffect(() => {
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
  }, [ref]);
}

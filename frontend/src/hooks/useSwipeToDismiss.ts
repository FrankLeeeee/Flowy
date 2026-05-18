import { useCallback, useRef, useState } from 'react';
import type * as React from 'react';
import {
  SWIPE_EXIT_DURATION_MS,
  dismissTranslateX,
  dragOpacity,
  isHorizontalSwipe,
  shouldDismiss,
} from '@/lib/swipeDismiss';

interface UseSwipeToDismissOptions {
  /** Invoked once the fly-off animation finishes — should actually close the dialog. */
  onDismiss: () => void;
  /** When false the hook is inert (e.g. on desktop) and leaves styles/handlers empty. */
  enabled: boolean;
}

interface UseSwipeToDismissResult {
  swipeHandlers: Pick<
    React.DOMAttributes<HTMLElement>,
    'onTouchStart' | 'onTouchMove' | 'onTouchEnd'
  >;
  swipeStyle: React.CSSProperties;
}

/**
 * Drives a horizontal swipe-to-dismiss gesture for full-screen mobile dialogs:
 * the element follows the finger, then either snaps back or flies off-screen
 * and calls `onDismiss`. Returns empty handlers/styles when disabled so it
 * never interferes with the desktop dialog's CSS-driven centering.
 */
export function useSwipeToDismiss({
  onDismiss,
  enabled,
}: UseSwipeToDismissOptions): UseSwipeToDismissResult {
  const startX = useRef(0);
  const startY = useRef(0);
  const horizontal = useRef(false);
  const dismissing = useRef(false);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    horizontal.current = false;
    setAnimating(false);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dismissing.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    if (!horizontal.current && isHorizontalSwipe({ dx, dy })) {
      horizontal.current = true;
    }
    if (horizontal.current) {
      setOffset(dx);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dismissing.current) return;
    if (horizontal.current && shouldDismiss(offset)) {
      dismissing.current = true;
      setAnimating(true);
      setOffset(dismissTranslateX(offset, window.innerWidth || 1));
      window.setTimeout(onDismiss, SWIPE_EXIT_DURATION_MS);
    } else {
      setAnimating(true);
      setOffset(0);
    }
    horizontal.current = false;
  }, [offset, onDismiss]);

  const active = offset !== 0 || animating;
  const swipeStyle: React.CSSProperties =
    enabled && active
      ? {
          transform: `translateX(${offset}px)`,
          opacity: dismissing.current ? 0 : dragOpacity(offset),
          transition: animating
            ? `transform ${SWIPE_EXIT_DURATION_MS}ms ease-out, opacity ${SWIPE_EXIT_DURATION_MS}ms ease-out`
            : 'none',
        }
      : {};

  return {
    swipeHandlers: enabled ? { onTouchStart, onTouchMove, onTouchEnd } : {},
    swipeStyle,
  };
}

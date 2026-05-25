import { useCallback, useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { isHorizontalSwipe } from '@/lib/swipeDismiss';
import {
  REVEAL_ACTION_WIDTH,
  REVEAL_SNAP_DURATION_MS,
  clampRevealOffset,
  shouldStayOpen,
} from '@/lib/swipeReveal';

interface UseSwipeToRevealOptions {
  /** When false the hook is inert (e.g. on desktop): no handlers, no styles. */
  enabled: boolean;
  /** Controlled open/closed state so a parent can keep only one row open. */
  open: boolean;
  /** Called when a release (or tap) should change the open state. */
  onOpenChange: (open: boolean) => void;
  /** Width (px) of the revealed action; the card slides left by this much. */
  actionWidth?: number;
}

interface UseSwipeToRevealResult {
  swipeHandlers: Pick<
    React.DOMAttributes<HTMLElement>,
    'onTouchStart' | 'onTouchMove' | 'onTouchEnd'
  >;
  /** Apply to the sliding layer that carries the card content. */
  contentStyle: React.CSSProperties;
  /** Snap the card closed (e.g. after tapping its body or the delete action). */
  close: () => void;
  /**
   * Returns true if the click that just fired was the tail of a swipe and
   * should be swallowed rather than treated as a tap on the card.
   */
  consumeClick: () => boolean;
}

const NO_HANDLERS: UseSwipeToRevealResult['swipeHandlers'] = {};

/**
 * Drives a right-to-left swipe-to-reveal gesture for mobile task cards. The
 * card follows the finger, then snaps either open (exposing a trailing delete
 * action) or closed on release. `open` is controlled so the owning list can
 * ensure at most one card is open at a time; swiping left-to-right (or tapping
 * an open card) closes it. Returns inert handlers/styles when disabled so it
 * never interferes with the desktop list.
 */
export function useSwipeToReveal({
  enabled,
  open,
  onOpenChange,
  actionWidth = REVEAL_ACTION_WIDTH,
}: UseSwipeToRevealOptions): UseSwipeToRevealResult {
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const horizontal = useRef(false);
  const moved = useRef(false);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(true);

  // Settle to the controlled rest position whenever `open` changes from the
  // outside (e.g. another row opened) — but never fight an in-progress drag.
  useEffect(() => {
    if (dragging.current) return;
    setAnimating(true);
    setOffset(open ? -actionWidth : 0);
  }, [open, actionWidth]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startOffset.current = open ? -actionWidth : 0;
      horizontal.current = false;
      moved.current = false;
      suppressClick.current = false;
      dragging.current = true;
      setAnimating(false);
    },
    [open, actionWidth],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;
      if (!horizontal.current && isHorizontalSwipe({ dx, dy })) {
        horizontal.current = true;
      }
      if (horizontal.current) {
        moved.current = true;
        setOffset(clampRevealOffset(startOffset.current + dx, actionWidth));
      }
    },
    [actionWidth],
  );

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    if (!horizontal.current) return;
    // A click is synthesised after a moved touch on some browsers; swallow it
    // so the swipe that opened the card isn't also read as a tap.
    suppressClick.current = moved.current;
    const nextOpen = shouldStayOpen(offset, actionWidth);
    setAnimating(true);
    setOffset(nextOpen ? -actionWidth : 0);
    if (nextOpen !== open) onOpenChange(nextOpen);
  }, [offset, actionWidth, open, onOpenChange]);

  const close = useCallback(() => {
    setAnimating(true);
    setOffset(0);
    if (open) onOpenChange(false);
  }, [open, onOpenChange]);

  const consumeClick = useCallback(() => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  }, []);

  if (!enabled) {
    return {
      swipeHandlers: NO_HANDLERS,
      contentStyle: {},
      close: () => {},
      consumeClick: () => false,
    };
  }

  const contentStyle: React.CSSProperties = {
    transform: `translateX(${offset}px)`,
    transition: animating
      ? `transform ${REVEAL_SNAP_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : 'none',
    // Let the browser own vertical scrolling while we own horizontal swipes.
    touchAction: 'pan-y',
  };

  return {
    swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    contentStyle,
    close,
    consumeClick,
  };
}

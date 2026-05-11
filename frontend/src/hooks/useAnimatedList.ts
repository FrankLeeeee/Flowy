import { useEffect, useRef, useState } from 'react';

export interface AnimatedEntry<T> {
  item: T;
  leaving: boolean;
}

interface Identifiable {
  id: string;
}

export interface AnimatedDiffResult<T> {
  next: AnimatedEntry<T>[];
  newlyLeaving: string[];
  returning: string[];
  unchanged: boolean;
}

// Pure helper so the diff/insertion logic is testable without React.
export function computeAnimatedDiff<T extends Identifiable>(
  prev: AnimatedEntry<T>[],
  incoming: T[],
): AnimatedDiffResult<T> {
  const incomingIds = new Set(incoming.map((i) => i.id));
  const incomingMap = new Map(incoming.map((i) => [i.id, i]));
  const prevIds = new Set(prev.map((e) => e.item.id));

  // Fast path: visible-only list, same length, same item refs in same order.
  if (prev.length === incoming.length) {
    let same = true;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i].leaving || prev[i].item !== incoming[i]) { same = false; break; }
    }
    if (same) return { next: prev, newlyLeaving: [], returning: [], unchanged: true };
  }

  const newlyLeaving: string[] = [];
  const returning: string[] = [];

  // Pass 1: walk previous entries, refresh data for survivors, mark missing as leaving.
  const merged: AnimatedEntry<T>[] = [];
  for (const entry of prev) {
    if (incomingIds.has(entry.item.id)) {
      if (entry.leaving) returning.push(entry.item.id);
      merged.push({ item: incomingMap.get(entry.item.id)!, leaving: false });
    } else if (entry.leaving) {
      merged.push(entry);
    } else {
      newlyLeaving.push(entry.item.id);
      merged.push({ item: entry.item, leaving: true });
    }
  }

  // Pass 2: insert brand-new incoming items at their natural positions.
  const itemsOrder = new Map(incoming.map((it, idx) => [it.id, idx] as const));
  for (const ni of incoming) {
    if (prevIds.has(ni.id)) continue;
    const targetIdx = itemsOrder.get(ni.id)!;
    let insertAt = merged.length;
    for (let j = 0; j < merged.length; j++) {
      const e = merged[j];
      if (e.leaving) continue;
      const eIdx = itemsOrder.get(e.item.id);
      if (eIdx !== undefined && eIdx > targetIdx) {
        insertAt = j;
        break;
      }
    }
    merged.splice(insertAt, 0, { item: ni, leaving: false });
  }

  return { next: merged, newlyLeaving, returning, unchanged: false };
}

/**
 * Keeps removed items rendered for `exitMs` so the consumer can play an exit
 * animation before the entry is finally unmounted. Returns entries in stable
 * order — leaving items hold their previous position so siblings don't jump.
 */
export function useAnimatedList<T extends Identifiable>(
  items: T[],
  exitMs: number = 280,
): AnimatedEntry<T>[] {
  const [displayed, setDisplayed] = useState<AnimatedEntry<T>[]>(
    () => items.map((item) => ({ item, leaving: false })),
  );
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setDisplayed((prev) => {
      const { next, newlyLeaving, returning, unchanged } = computeAnimatedDiff(prev, items);
      if (unchanged) return prev;

      for (const id of returning) {
        const t = timersRef.current.get(id);
        if (t) { clearTimeout(t); timersRef.current.delete(id); }
      }
      for (const id of newlyLeaving) {
        if (timersRef.current.has(id)) continue;
        const timer = setTimeout(() => {
          setDisplayed((curr) => curr.filter((e) => !(e.leaving && e.item.id === id)));
          timersRef.current.delete(id);
        }, exitMs);
        timersRef.current.set(id, timer);
      }
      return next;
    });
  }, [items, exitMs]);

  useEffect(() => () => {
    const timers = timersRef.current;
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  }, []);

  return displayed;
}

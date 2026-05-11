import { describe, expect, it } from 'vitest';
import { computeAnimatedDiff, type AnimatedEntry } from '../src/hooks/useAnimatedList';

interface Item { id: string; value: number }

function entries(items: Item[], leaving: boolean = false): AnimatedEntry<Item>[] {
  return items.map((item) => ({ item, leaving }));
}

describe('computeAnimatedDiff', () => {
  it('returns prev with unchanged=true when nothing changed', () => {
    const items = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }];
    const prev = entries(items);
    const result = computeAnimatedDiff(prev, items);
    expect(result.unchanged).toBe(true);
    expect(result.next).toBe(prev);
    expect(result.newlyLeaving).toEqual([]);
    expect(result.returning).toEqual([]);
  });

  it('detects different item refs as a change even when ids match', () => {
    const prev = entries([{ id: 'a', value: 1 }]);
    const incoming = [{ id: 'a', value: 1 }];
    const result = computeAnimatedDiff(prev, incoming);
    expect(result.unchanged).toBe(false);
    expect(result.next[0].item).toBe(incoming[0]);
    expect(result.next[0].leaving).toBe(false);
  });

  it('marks removed items as leaving and keeps their position', () => {
    const a = { id: 'a', value: 1 };
    const b = { id: 'b', value: 2 };
    const c = { id: 'c', value: 3 };
    const prev = entries([a, b, c]);
    const result = computeAnimatedDiff(prev, [a, c]);
    expect(result.newlyLeaving).toEqual(['b']);
    expect(result.next.map((e) => [e.item.id, e.leaving])).toEqual([
      ['a', false],
      ['b', true],
      ['c', false],
    ]);
  });

  it('preserves already-leaving entries across diffs', () => {
    const a = { id: 'a', value: 1 };
    const b = { id: 'b', value: 2 };
    const prev: AnimatedEntry<Item>[] = [
      { item: a, leaving: false },
      { item: b, leaving: true },
    ];
    const result = computeAnimatedDiff(prev, [a]);
    expect(result.newlyLeaving).toEqual([]);
    expect(result.next).toHaveLength(2);
    expect(result.next[1]).toEqual({ item: b, leaving: true });
  });

  it('flags returning when a leaving entry re-appears in incoming', () => {
    const a = { id: 'a', value: 1 };
    const prev: AnimatedEntry<Item>[] = [{ item: a, leaving: true }];
    const incoming = [{ id: 'a', value: 9 }];
    const result = computeAnimatedDiff(prev, incoming);
    expect(result.returning).toEqual(['a']);
    expect(result.next[0].leaving).toBe(false);
    expect(result.next[0].item).toBe(incoming[0]);
  });

  it('inserts brand-new items at their natural position', () => {
    const a = { id: 'a', value: 1 };
    const c = { id: 'c', value: 3 };
    const b = { id: 'b', value: 2 };
    const prev = entries([a, c]);
    const result = computeAnimatedDiff(prev, [a, b, c]);
    expect(result.next.map((e) => e.item.id)).toEqual(['a', 'b', 'c']);
    expect(result.next.every((e) => !e.leaving)).toBe(true);
  });

  it('places new items relative to surviving siblings and ignores leaving entries', () => {
    const a = { id: 'a', value: 1 };
    const b = { id: 'b', value: 2 };
    const c = { id: 'c', value: 3 };
    const prev: AnimatedEntry<Item>[] = [
      { item: a, leaving: false },
      { item: b, leaving: true }, // still animating out
      { item: c, leaving: false },
    ];
    const d = { id: 'd', value: 4 };
    // Incoming order places d between a and c
    const result = computeAnimatedDiff(prev, [a, d, c]);
    // Leaving 'b' should stay around 'a'/'c'; new 'd' inserts between them
    const ids = result.next.map((e) => e.item.id);
    expect(ids).toContain('d');
    expect(ids.filter((id) => id === 'b')).toHaveLength(1);
    // 'd' should be inserted before 'c' relative to visible siblings
    const dIdx = ids.indexOf('d');
    const cIdx = ids.indexOf('c');
    expect(dIdx).toBeLessThan(cIdx);
  });

  it('handles bulk removal of several items at once', () => {
    const a = { id: 'a', value: 1 };
    const b = { id: 'b', value: 2 };
    const c = { id: 'c', value: 3 };
    const d = { id: 'd', value: 4 };
    const prev = entries([a, b, c, d]);
    const result = computeAnimatedDiff(prev, [c]);
    expect(result.newlyLeaving.sort()).toEqual(['a', 'b', 'd']);
    expect(result.next).toHaveLength(4);
    const cEntry = result.next.find((e) => e.item.id === 'c')!;
    expect(cEntry.leaving).toBe(false);
  });

  it('treats reordered items with same refs as a change but does not mark anything leaving', () => {
    const a = { id: 'a', value: 1 };
    const b = { id: 'b', value: 2 };
    const prev = entries([a, b]);
    const result = computeAnimatedDiff(prev, [b, a]);
    expect(result.newlyLeaving).toEqual([]);
    expect(result.returning).toEqual([]);
    // Order in `next` follows the previous order (we don't re-sort survivors
    // because that would jump siblings around mid-animation).
    expect(result.next.map((e) => e.item.id)).toEqual(['a', 'b']);
  });
});

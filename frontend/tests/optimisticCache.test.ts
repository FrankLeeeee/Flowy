import { describe, expect, it } from 'vitest';
import {
  removeById,
  TEMP_ID_PREFIX,
  tempId,
  upsertById,
} from '../src/lib/optimisticCache';

describe('optimisticCache pure helpers', () => {
  describe('tempId / isTempId', () => {
    it('generates a non-empty id with the temp prefix', () => {
      const id = tempId();
      expect(id.startsWith(TEMP_ID_PREFIX)).toBe(true);
      expect(id.length).toBeGreaterThan(TEMP_ID_PREFIX.length);
    });

    it('issues unique ids on successive calls', () => {
      const a = tempId();
      const b = tempId();
      expect(a).not.toBe(b);
    });

});

  describe('upsertById', () => {
    type Item = { id: string; name: string };

    it('appends when no entry with the same id exists', () => {
      const list: Item[] = [{ id: '1', name: 'a' }];
      const next = upsertById(list, { id: '2', name: 'b' });
      expect(next).toEqual([
        { id: '1', name: 'a' },
        { id: '2', name: 'b' },
      ]);
    });

    it('replaces in place when an id matches, preserving order', () => {
      const list: Item[] = [
        { id: '1', name: 'a' },
        { id: '2', name: 'b' },
        { id: '3', name: 'c' },
      ];
      const next = upsertById(list, { id: '2', name: 'B' });
      expect(next).toEqual([
        { id: '1', name: 'a' },
        { id: '2', name: 'B' },
        { id: '3', name: 'c' },
      ]);
    });

    it('does not mutate the input array', () => {
      const list: Item[] = [{ id: '1', name: 'a' }];
      const next = upsertById(list, { id: '1', name: 'A' });
      expect(list).toEqual([{ id: '1', name: 'a' }]);
      expect(next).not.toBe(list);
    });

    it('appends to an empty list', () => {
      expect(upsertById<Item>([], { id: '1', name: 'a' })).toEqual([{ id: '1', name: 'a' }]);
    });
  });

  describe('removeById', () => {
    type Item = { id: string };

    it('removes the matching entry and preserves the rest', () => {
      const list: Item[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      expect(removeById(list, 'b')).toEqual([{ id: 'a' }, { id: 'c' }]);
    });

    it('is a no-op when the id is not present', () => {
      const list: Item[] = [{ id: 'a' }, { id: 'b' }];
      expect(removeById(list, 'z')).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    it('does not mutate the input array', () => {
      const list: Item[] = [{ id: 'a' }];
      removeById(list, 'a');
      expect(list).toEqual([{ id: 'a' }]);
    });

    it('handles an empty list gracefully', () => {
      expect(removeById<Item>([], 'a')).toEqual([]);
    });
  });
});

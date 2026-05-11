import { describe, expect, it } from 'vitest';
import { asRecord, getString, parseRootConfig, parseWorkspaces } from '../src/configUtils';

describe('shared/configUtils', () => {
  describe('asRecord', () => {
    it('returns the object for a plain object', () => {
      expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    });

    it('returns undefined for null', () => {
      expect(asRecord(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(asRecord(undefined)).toBeUndefined();
    });

    it('returns undefined for arrays', () => {
      expect(asRecord([1, 2])).toBeUndefined();
    });

    it('returns undefined for primitives', () => {
      expect(asRecord('string')).toBeUndefined();
      expect(asRecord(42)).toBeUndefined();
      expect(asRecord(true)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(asRecord('')).toBeUndefined();
    });
  });

  describe('getString', () => {
    it('returns trimmed non-empty strings', () => {
      expect(getString('hello')).toBe('hello');
      expect(getString('  padded  ')).toBe('padded');
    });

    it('returns undefined for empty or whitespace-only strings', () => {
      expect(getString('')).toBeUndefined();
      expect(getString('   ')).toBeUndefined();
    });

    it('returns undefined for non-string types', () => {
      expect(getString(42)).toBeUndefined();
      expect(getString(null)).toBeUndefined();
      expect(getString(undefined)).toBeUndefined();
      expect(getString({})).toBeUndefined();
    });
  });

  describe('parseRootConfig', () => {
    it('parses valid JSON objects', () => {
      expect(parseRootConfig('{"key": "value"}')).toEqual({ key: 'value' });
    });

    it('returns {} for null input', () => {
      expect(parseRootConfig(null)).toEqual({});
    });

    it('returns {} for undefined input', () => {
      expect(parseRootConfig(undefined)).toEqual({});
    });

    it('returns {} for empty string', () => {
      expect(parseRootConfig('')).toEqual({});
    });

    it('returns {} for invalid JSON', () => {
      expect(parseRootConfig('not json')).toEqual({});
    });

    it('returns {} for JSON arrays', () => {
      expect(parseRootConfig('[1,2,3]')).toEqual({});
    });

    it('returns {} for JSON primitives', () => {
      expect(parseRootConfig('"string"')).toEqual({});
      expect(parseRootConfig('42')).toEqual({});
    });
  });

  describe('parseWorkspaces', () => {
    it('returns [] for null, undefined, or empty input', () => {
      expect(parseWorkspaces(null)).toEqual([]);
      expect(parseWorkspaces(undefined)).toEqual([]);
      expect(parseWorkspaces('')).toEqual([]);
    });

    it('returns [] for invalid JSON', () => {
      expect(parseWorkspaces('not json')).toEqual([]);
    });

    it('returns [] for non-array JSON', () => {
      expect(parseWorkspaces('{"foo": "bar"}')).toEqual([]);
      expect(parseWorkspaces('"string"')).toEqual([]);
    });

    it('parses an array of name/path objects', () => {
      const raw = JSON.stringify([
        { name: 'Frontend', path: '/home/me/frontend' },
        { name: 'Backend', path: '/home/me/backend' },
      ]);
      expect(parseWorkspaces(raw)).toEqual([
        { name: 'Frontend', path: '/home/me/frontend' },
        { name: 'Backend', path: '/home/me/backend' },
      ]);
    });

    it('lifts legacy string entries into { name: path, path } objects', () => {
      const raw = JSON.stringify(['/home/me/legacy', '/home/me/other']);
      expect(parseWorkspaces(raw)).toEqual([
        { name: '/home/me/legacy', path: '/home/me/legacy' },
        { name: '/home/me/other', path: '/home/me/other' },
      ]);
    });

    it('falls back to path when name is missing or blank', () => {
      const raw = JSON.stringify([
        { path: '/no/name' },
        { name: '   ', path: '/blank/name' },
      ]);
      expect(parseWorkspaces(raw)).toEqual([
        { name: '/no/name', path: '/no/name' },
        { name: '/blank/name', path: '/blank/name' },
      ]);
    });

    it('drops entries without a usable path', () => {
      const raw = JSON.stringify([
        '',
        '   ',
        { name: 'No Path' },
        { name: 'Empty', path: '   ' },
        { name: 'Good', path: '/ok' },
        null,
        42,
      ]);
      expect(parseWorkspaces(raw)).toEqual([
        { name: 'Good', path: '/ok' },
      ]);
    });

    it('trims surrounding whitespace from path and name', () => {
      const raw = JSON.stringify([{ name: '  Web  ', path: '  /a/b  ' }]);
      expect(parseWorkspaces(raw)).toEqual([{ name: 'Web', path: '/a/b' }]);
    });
  });
});

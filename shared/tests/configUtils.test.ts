import { describe, expect, it } from 'vitest';
import { asRecord, getString, parseRootConfig } from '../src/configUtils';

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
});

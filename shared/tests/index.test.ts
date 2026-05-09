import { describe, expect, it } from 'vitest';
import { asRecord, getString, parseRootConfig } from '../src/index';

describe('asRecord', () => {
  it('returns the object when given a plain object', () => {
    const obj = { a: 1 };
    expect(asRecord(obj)).toBe(obj);
  });

  it('returns undefined for arrays', () => {
    expect(asRecord([1, 2])).toBeUndefined();
  });

  it('returns undefined for primitives and null', () => {
    expect(asRecord(null)).toBeUndefined();
    expect(asRecord(undefined)).toBeUndefined();
    expect(asRecord('')).toBeUndefined();
    expect(asRecord(42)).toBeUndefined();
  });
});

describe('getString', () => {
  it('returns the trimmed string for non-empty strings', () => {
    expect(getString('  hello  ')).toBe('hello');
  });

  it('returns undefined for empty or whitespace-only strings', () => {
    expect(getString('')).toBeUndefined();
    expect(getString('   ')).toBeUndefined();
  });

  it('returns undefined for non-string values', () => {
    expect(getString(42)).toBeUndefined();
    expect(getString(null)).toBeUndefined();
    expect(getString(undefined)).toBeUndefined();
  });
});

describe('parseRootConfig', () => {
  it('parses valid JSON into a record', () => {
    expect(parseRootConfig('{"key": "val"}')).toEqual({ key: 'val' });
  });

  it('returns empty object for null/undefined/empty', () => {
    expect(parseRootConfig(null)).toEqual({});
    expect(parseRootConfig(undefined)).toEqual({});
    expect(parseRootConfig('')).toEqual({});
  });

  it('returns empty object for invalid JSON', () => {
    expect(parseRootConfig('not json')).toEqual({});
  });

  it('returns empty object when JSON parses to a non-object', () => {
    expect(parseRootConfig('"just a string"')).toEqual({});
    expect(parseRootConfig('[1,2,3]')).toEqual({});
  });
});

/**
 * Tests for the SW Cache Storage patching helpers. The browser Cache API
 * isn't in Node, so we install a minimal in-memory stand-in on globalThis
 * before importing the module.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface CachedEntry {
  url: string;
  body: string;
}

class FakeCache {
  store = new Map<string, CachedEntry>();

  async match(key: string | Request): Promise<Response | undefined> {
    const url = typeof key === 'string' ? key : key.url;
    const entry = this.store.get(url);
    if (!entry) return undefined;
    return new Response(entry.body, { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  async put(key: string | Request, res: Response): Promise<void> {
    const url = typeof key === 'string' ? key : key.url;
    const body = await res.clone().text();
    this.store.set(url, { url, body });
  }

  async keys(): Promise<Request[]> {
    return [...this.store.keys()].map((url) => new Request(url));
  }
}

const fakeCache = new FakeCache();
const fakeCaches = {
  open: vi.fn(async () => fakeCache),
};

beforeEach(() => {
  fakeCache.store.clear();
  vi.stubGlobal('caches', fakeCaches);
  vi.stubGlobal('window', { location: { origin: 'http://localhost:3001' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadModule() {
  return import('../src/lib/optimisticCache');
}

describe('patchSwCache', () => {
  it('returns null and writes nothing when there is no cached entry to read', async () => {
    const { patchSwCache } = await loadModule();
    const next = await patchSwCache<{ items: number[] }>('/api/lists', (cur) => ({ items: cur?.items ?? [99] }));
    expect(next).toEqual({ items: [99] });
    // The updater is invoked even when current is null, and the result is cached.
    expect(fakeCache.store.size).toBe(1);
    const entry = fakeCache.store.get('http://localhost:3001/api/lists');
    expect(JSON.parse(entry!.body)).toEqual({ items: [99] });
  });

  it('reads the existing cached value, hands it to the updater, and writes the result', async () => {
    fakeCache.store.set('http://localhost:3001/api/lists', {
      url: 'http://localhost:3001/api/lists',
      body: JSON.stringify([{ id: '1', name: 'a' }]),
    });
    const { patchSwCache } = await loadModule();
    const next = await patchSwCache<{ id: string; name: string }[]>('/api/lists', (cur) => [
      ...(cur ?? []),
      { id: '2', name: 'b' },
    ]);
    expect(next).toEqual([
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ]);
    const updated = fakeCache.store.get('http://localhost:3001/api/lists');
    expect(JSON.parse(updated!.body)).toEqual([
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ]);
  });

  it('returns null when the Cache API is unavailable', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3001' } });
    // Don't stub `caches` — the helper should detect its absence and bail.
    const { patchSwCache } = await loadModule();
    const result = await patchSwCache('/api/lists', () => 'whatever');
    expect(result).toBeNull();
  });
});

describe('patchSwCacheByPathname', () => {
  it('updates every cached request matching the pathname, ignoring query params', async () => {
    const data = (id: string) => JSON.stringify([{ id, value: id }]);
    fakeCache.store.set('http://localhost:3001/api/tasks', {
      url: 'http://localhost:3001/api/tasks',
      body: data('plain'),
    });
    fakeCache.store.set('http://localhost:3001/api/tasks?list=abc', {
      url: 'http://localhost:3001/api/tasks?list=abc',
      body: data('list-abc'),
    });
    fakeCache.store.set('http://localhost:3001/api/tasks?inbox=1', {
      url: 'http://localhost:3001/api/tasks?inbox=1',
      body: data('inbox'),
    });
    // A path that should NOT be touched
    fakeCache.store.set('http://localhost:3001/api/lists', {
      url: 'http://localhost:3001/api/lists',
      body: JSON.stringify([{ id: 'list-only' }]),
    });

    const { patchSwCacheByPathname } = await loadModule();
    await patchSwCacheByPathname<{ id: string; value: string }>('/api/tasks', (items) => [
      ...items,
      { id: 'tmp', value: 'tmp' },
    ]);

    expect(JSON.parse(fakeCache.store.get('http://localhost:3001/api/tasks')!.body)).toEqual([
      { id: 'plain', value: 'plain' },
      { id: 'tmp', value: 'tmp' },
    ]);
    expect(JSON.parse(fakeCache.store.get('http://localhost:3001/api/tasks?list=abc')!.body)).toEqual([
      { id: 'list-abc', value: 'list-abc' },
      { id: 'tmp', value: 'tmp' },
    ]);
    expect(JSON.parse(fakeCache.store.get('http://localhost:3001/api/tasks?inbox=1')!.body)).toEqual([
      { id: 'inbox', value: 'inbox' },
      { id: 'tmp', value: 'tmp' },
    ]);
    // Untouched
    expect(JSON.parse(fakeCache.store.get('http://localhost:3001/api/lists')!.body)).toEqual([
      { id: 'list-only' },
    ]);
  });

  it('does nothing when no cached entries match the pathname', async () => {
    fakeCache.store.set('http://localhost:3001/api/lists', {
      url: 'http://localhost:3001/api/lists',
      body: JSON.stringify([{ id: '1' }]),
    });

    const { patchSwCacheByPathname } = await loadModule();
    await patchSwCacheByPathname<{ id: string }>('/api/tasks', (items) => [...items, { id: 'never' }]);
    // /api/lists untouched
    expect(JSON.parse(fakeCache.store.get('http://localhost:3001/api/lists')!.body)).toEqual([{ id: '1' }]);
  });

  it('skips cached entries whose body is not a JSON array', async () => {
    fakeCache.store.set('http://localhost:3001/api/tasks', {
      url: 'http://localhost:3001/api/tasks',
      body: '{"not": "an array"}',
    });

    const { patchSwCacheByPathname } = await loadModule();
    await patchSwCacheByPathname<{ id: string }>('/api/tasks', (items) => [...items, { id: 'tmp' }]);
    // Body unchanged because the updater wasn't applied.
    expect(fakeCache.store.get('http://localhost:3001/api/tasks')!.body).toBe('{"not": "an array"}');
  });
});

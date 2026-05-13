/**
 * Helpers for patching the service worker's API Cache Storage from the page.
 *
 * Background: when the SW intercepts a successful GET to /api/*, it stores
 * the response in `flowy-api-v1`. Offline reads then come from that cache.
 * For the offline UI to reflect a create/update/delete the user just made,
 * we patch the cached response in place so the next read sees the change.
 */

import { generateId } from './utils';

const CACHE_NAME = 'flowy-api-v1';

export const TEMP_ID_PREFIX = 'tmp-';

export function tempId(): string {
  return `${TEMP_ID_PREFIX}${generateId()}`;
}

export function isTempId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(TEMP_ID_PREFIX);
}

async function getCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

function fullUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

function jsonResponse<T>(value: T): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.clone().json()) as T;
  } catch {
    return null;
  }
}

/**
 * Update the cached response for a single API path. The updater receives
 * the current cached value (or null) and returns the next value.
 */
export async function patchSwCache<T>(
  path: string,
  updater: (current: T | null) => T,
): Promise<T | null> {
  const cache = await getCache();
  if (!cache) return null;
  const url = fullUrl(path);
  const cached = await cache.match(url);
  const current = cached ? await readJson<T>(cached) : null;
  const next = updater(current);
  await cache.put(url, jsonResponse(next));
  return next;
}

/**
 * Apply the same updater to every cached response whose pathname matches
 * `pathname` exactly, regardless of query string. Used for /api/tasks
 * where multiple filter variants may be cached separately.
 */
export async function patchSwCacheByPathname<T>(
  pathname: string,
  updater: (items: T[]) => T[],
): Promise<void> {
  const cache = await getCache();
  if (!cache) return;
  const requests = await cache.keys();
  await Promise.all(
    requests.map(async (req) => {
      let url: URL;
      try {
        url = new URL(req.url);
      } catch {
        return;
      }
      if (url.pathname !== pathname) return;
      const res = await cache.match(req);
      if (!res) return;
      const items = await readJson<T[]>(res);
      if (!Array.isArray(items)) return;
      await cache.put(req, jsonResponse(updater(items)));
    }),
  );
}

/**
 * Pure helper: insert `item` if it's not already present, otherwise replace
 * the existing entry with the same id. Returns a new array.
 */
export function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx === -1) return [...items, item];
  const next = items.slice();
  next[idx] = item;
  return next;
}

/**
 * Pure helper: drop entries whose id matches `id`. Returns a new array.
 */
export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((i) => i.id !== id);
}

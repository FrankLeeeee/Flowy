/**
 * Pure-function tests for the service worker URL classifier and HTML asset
 * extractor. The SW lives at frontend/public/sw.js as plain JS so the browser
 * can register it without a build step. We exercise the pure helpers by
 * loading the SW source into a Node vm sandbox with the side-effecting SW
 * globals stubbed out.
 */

import path from 'path';
import { readFileSync } from 'fs';
import { Script, createContext } from 'vm';
import { describe, expect, it } from 'vitest';

const SW_PATH = path.resolve(__dirname, '../public/sw.js');
const SW_SOURCE = readFileSync(SW_PATH, 'utf8');

interface SwExports {
  isRunnerOnlyRequest: (url: URL) => boolean;
  isCacheableApiRequest: (url: URL) => boolean;
  parseShellAssetUrls: (html: string) => string[];
}

function loadSw(): SwExports {
  // Stub every SW global referenced at module load time. We only need
  // addEventListener to be a no-op; the rest are placeholders so the script
  // doesn't throw when it references self.* during evaluation.
  const stubSelf = {
    addEventListener: () => {},
    skipWaiting: () => {},
    clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]), openWindow: () => {} },
    registration: { showNotification: () => {}, sync: undefined },
    location: { origin: 'http://localhost' },
  };

  const sandbox: Record<string, unknown> = {
    self: stubSelf,
    console: { info: () => {}, warn: () => {}, error: () => {} },
    fetch: () => Promise.reject(new Error('fetch not stubbed')),
    Response: globalThis.Response,
    Request: globalThis.Request,
    Headers: globalThis.Headers,
    URL: globalThis.URL,
    Promise: globalThis.Promise,
    Date: globalThis.Date,
    Math: globalThis.Math,
    Set: globalThis.Set,
    Map: globalThis.Map,
    JSON: globalThis.JSON,
    indexedDB: undefined,
    caches: undefined,
  };

  // Re-export the helpers we care about so the test can call them.
  const trailer = `;Object.assign(globalThis.__exports, {
    isRunnerOnlyRequest, isCacheableApiRequest, parseShellAssetUrls,
  });`;

  const exportsBag: SwExports = {} as SwExports;
  const ctx = createContext({ ...sandbox, globalThis: { __exports: exportsBag } });
  const script = new Script(SW_SOURCE + trailer, { filename: 'sw.js' });
  script.runInContext(ctx);
  return exportsBag;
}

describe('SW URL classifier', () => {
  const sw = loadSw();

  describe('isRunnerOnlyRequest', () => {
    it('matches the runner list endpoint', () => {
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/runners'))).toBe(true);
    });

    it('matches all sub-paths under /api/runners', () => {
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/runners/abc'))).toBe(true);
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/runners/abc/browse'))).toBe(true);
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/runners/heartbeat'))).toBe(true);
    });

    it('matches task assign / run / logs endpoints', () => {
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/tasks/abc/assign'))).toBe(true);
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/tasks/abc/run'))).toBe(true);
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/tasks/abc/logs'))).toBe(true);
    });

    it('does not match plain task CRUD endpoints', () => {
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/tasks'))).toBe(false);
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/tasks/abc'))).toBe(false);
    });

    it('does not match other API resources', () => {
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/lists'))).toBe(false);
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/labels'))).toBe(false);
      expect(sw.isRunnerOnlyRequest(new URL('http://localhost/api/sessions'))).toBe(false);
    });
  });

  describe('isCacheableApiRequest', () => {
    it('matches the seven cacheable API roots and their sub-paths', () => {
      const cases = ['lists', 'tasks', 'labels', 'skills', 'stats', 'sessions', 'settings'];
      for (const root of cases) {
        expect(sw.isCacheableApiRequest(new URL(`http://localhost/api/${root}`))).toBe(true);
        expect(sw.isCacheableApiRequest(new URL(`http://localhost/api/${root}/abc`))).toBe(true);
      }
    });

    it('refuses runner-only endpoints even when nominally under /api/tasks', () => {
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/tasks/abc/run'))).toBe(false);
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/tasks/abc/assign'))).toBe(false);
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/tasks/abc/logs'))).toBe(false);
    });

    it('refuses runner endpoints', () => {
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/runners'))).toBe(false);
    });

    it('refuses auth and unknown API endpoints', () => {
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/auth/status'))).toBe(false);
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/health'))).toBe(false);
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/push/vapid-public-key'))).toBe(false);
    });

    it('does not collide with similarly-prefixed URLs', () => {
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/listserver'))).toBe(false);
      expect(sw.isCacheableApiRequest(new URL('http://localhost/api/sessionsX'))).toBe(false);
    });
  });

  describe('parseShellAssetUrls', () => {
    it('extracts script src and link href entries', () => {
      const html = `
        <script type="module" crossorigin src="/assets/index-O6Et0qNz.js"></script>
        <link rel="stylesheet" crossorigin href="/assets/index-C8Q5srwB.css">
        <link rel="manifest" href="/manifest.webmanifest">
      `;
      const urls = sw.parseShellAssetUrls(html);
      expect(urls).toContain('/assets/index-O6Et0qNz.js');
      expect(urls).toContain('/assets/index-C8Q5srwB.css');
      expect(urls).toContain('/manifest.webmanifest');
    });

    it('drops cross-origin URLs', () => {
      const html = `
        <script src="https://cdn.example.com/lib.js"></script>
        <link rel="stylesheet" href="//other-origin.example/style.css">
        <link rel="icon" href="/favicon.ico">
      `;
      expect(sw.parseShellAssetUrls(html)).toEqual(['/favicon.ico']);
    });

    it('deduplicates repeated URLs', () => {
      const html = `
        <link rel="preload" href="/assets/foo.js" as="script">
        <script src="/assets/foo.js"></script>
      `;
      expect(sw.parseShellAssetUrls(html)).toEqual(['/assets/foo.js']);
    });

    it('returns an empty list when the HTML has no asset references', () => {
      expect(sw.parseShellAssetUrls('<html><body></body></html>')).toEqual([]);
    });
  });
});

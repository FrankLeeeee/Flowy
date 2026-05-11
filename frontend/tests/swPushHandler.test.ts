/**
 * Tests for the service worker's `push` event handler.
 *
 * iOS Safari revokes a push subscription if a push event ever fails to render
 * a visible notification — so the handler must always call showNotification(),
 * regardless of whether the payload is missing, malformed, or rejected by the
 * platform. These tests load the SW into a Node vm sandbox and invoke the
 * captured handler directly.
 */

import path from 'path';
import { readFileSync } from 'fs';
import { Script, createContext } from 'vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SW_PATH = path.resolve(__dirname, '../public/sw.js');
const SW_SOURCE = readFileSync(SW_PATH, 'utf8');

type ShowNotification = (title: string, options?: NotificationOptions) => Promise<void>;
type PushEventHandler = (event: { data: { json: () => unknown; text: () => string } | null; waitUntil: (p: Promise<unknown>) => void }) => void;

interface LoadedSw {
  pushHandler: PushEventHandler;
  showNotification: ReturnType<typeof vi.fn<Parameters<ShowNotification>, ReturnType<ShowNotification>>>;
}

function loadSwWithPushHandler(showNotification: LoadedSw['showNotification']): PushEventHandler {
  const handlers: Record<string, PushEventHandler> = {};
  const stubSelf = {
    addEventListener: (event: string, handler: PushEventHandler) => {
      handlers[event] = handler;
    },
    skipWaiting: () => {},
    clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]), openWindow: () => {} },
    registration: { showNotification, sync: undefined },
    location: { origin: 'http://localhost' },
  };

  const sandbox: Record<string, unknown> = {
    self: stubSelf,
    console: { info: () => {}, warn: () => {}, error: () => {} },
    fetch: () => Promise.reject(new Error('fetch not stubbed')),
    Response: globalThis.Response,
    URL: globalThis.URL,
    Promise: globalThis.Promise,
    JSON: globalThis.JSON,
    indexedDB: undefined,
    caches: undefined,
  };

  const ctx = createContext(sandbox);
  new Script(SW_SOURCE, { filename: 'sw.js' }).runInContext(ctx);

  if (!handlers.push) throw new Error('push handler not registered');
  return handlers.push;
}

describe('SW push event handler', () => {
  let showNotification: LoadedSw['showNotification'];
  let pushHandler: PushEventHandler;
  let waited: Array<Promise<unknown>>;

  beforeEach(() => {
    showNotification = vi.fn(() => Promise.resolve());
    pushHandler = loadSwWithPushHandler(showNotification);
    waited = [];
  });

  function dispatch(data: { json?: () => unknown; text?: () => string } | null): Promise<unknown> {
    const event = {
      data: data as { json: () => unknown; text: () => string } | null,
      waitUntil: (p: Promise<unknown>) => waited.push(p),
    };
    pushHandler(event);
    return Promise.all(waited);
  }

  it('renders the payload title and body on a well-formed push', async () => {
    await dispatch({
      json: () => ({ title: 'Task due', body: 'Buy milk', tag: 'task-due-1' }),
    });

    expect(showNotification).toHaveBeenCalledOnce();
    const [title, options] = showNotification.mock.calls[0];
    expect(title).toBe('Task due');
    expect(options?.body).toBe('Buy milk');
    expect(options?.tag).toBe('task-due-1');
  });

  it('still shows a notification when the push has no data (iOS keeps subscription)', async () => {
    await dispatch(null);

    // iOS revokes subscriptions silently if the handler returns without
    // calling showNotification — we must always render something visible.
    expect(showNotification).toHaveBeenCalledOnce();
    const [title] = showNotification.mock.calls[0];
    expect(title).toBe('Flowy');
  });

  it('falls back to plain text when the payload is not JSON', async () => {
    await dispatch({
      json: () => { throw new Error('not json'); },
      text: () => 'hello world',
    });

    expect(showNotification).toHaveBeenCalledOnce();
    const [title, options] = showNotification.mock.calls[0];
    expect(title).toBe('Flowy');
    expect(options?.body).toBe('hello world');
  });

  it('uses a default tag so renotify is well-defined when the payload omits one', async () => {
    await dispatch({ json: () => ({ title: 'Flowy', body: 'hi' }) });
    const [, options] = showNotification.mock.calls[0];
    // renotify: true requires a non-empty tag on iOS Safari.
    expect(options?.tag).toBeTruthy();
    expect(options?.renotify).toBe(true);
  });

  it('retries with a minimal notification when the rich variant rejects', async () => {
    // iOS rejects some option combinations (e.g. unsupported vibrate values).
    // We must catch that rejection and show a fallback so the subscription
    // doesn't get revoked.
    showNotification
      .mockImplementationOnce(() => Promise.reject(new Error('option rejected')))
      .mockImplementationOnce(() => Promise.resolve());

    await dispatch({ json: () => ({ title: 'Task due', body: 'Buy milk' }) });

    expect(showNotification).toHaveBeenCalledTimes(2);
    const [fallbackTitle, fallbackOptions] = showNotification.mock.calls[1];
    expect(fallbackTitle).toBe('Task due');
    expect(fallbackOptions).toEqual({ body: 'Buy milk' });
    // The fallback strips options that iOS may have rejected.
    expect(fallbackOptions).not.toHaveProperty('vibrate');
    expect(fallbackOptions).not.toHaveProperty('requireInteraction');
  });
});

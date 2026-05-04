import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function importPushForHome(homeDir: string) {
  vi.resetModules();
  vi.doMock('os', async () => {
    const actual = await vi.importActual<typeof import('os')>('os');
    return {
      ...actual,
      default: { ...actual, homedir: () => homeDir },
      homedir: () => homeDir,
    };
  });
  const db = await import('../src/db');
  db.initDb();
  const pushService = await import('../src/pushService');
  return { db, pushService };
}

describe('pushService', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('os');
  });

  it('generates a VAPID key pair on first init and persists it', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-push-'));
    try {
      const { pushService, db } = await importPushForHome(homeDir);
      pushService.initPush();

      const publicKey = pushService.getVapidPublicKey();
      expect(publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(publicKey.length).toBeGreaterThan(60);
      // Private key is also stored, but never exposed by the API.
      expect(db.getDbSetting('vapid_private_key')).toBeTruthy();
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('reuses the same VAPID key pair across re-initializations', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-push-'));
    try {
      const { pushService } = await importPushForHome(homeDir);
      pushService.initPush();
      const firstKey = pushService.getVapidPublicKey();

      pushService.initPush();
      pushService.initPush();
      expect(pushService.getVapidPublicKey()).toBe(firstKey);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('saves a subscription and overwrites it on re-save (idempotent)', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-push-'));
    try {
      const { pushService, db } = await importPushForHome(homeDir);
      pushService.initPush();

      const sub = {
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'p256-key-1', auth: 'auth-key-1' },
      };
      pushService.saveSubscription(sub);

      let rows = db.getDb().prepare('SELECT * FROM push_subscriptions').all() as Array<{
        endpoint: string; keys_p256dh: string; keys_auth: string;
      }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        endpoint: sub.endpoint,
        keys_p256dh: 'p256-key-1',
        keys_auth: 'auth-key-1',
      });

      // Re-save with rotated keys for the same endpoint replaces the row,
      // doesn't duplicate it.
      pushService.saveSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: 'p256-key-2', auth: 'auth-key-2' },
      });
      rows = db.getDb().prepare('SELECT * FROM push_subscriptions').all() as Array<{
        endpoint: string; keys_p256dh: string; keys_auth: string;
      }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].keys_p256dh).toBe('p256-key-2');
      expect(rows[0].keys_auth).toBe('auth-key-2');
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('removes only the named subscription on unsubscribe', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-push-'));
    try {
      const { pushService, db } = await importPushForHome(homeDir);
      pushService.initPush();

      pushService.saveSubscription({
        endpoint: 'https://push.example.com/a',
        keys: { p256dh: 'p1', auth: 'a1' },
      });
      pushService.saveSubscription({
        endpoint: 'https://push.example.com/b',
        keys: { p256dh: 'p2', auth: 'a2' },
      });

      pushService.removeSubscription('https://push.example.com/a');

      const rows = db.getDb().prepare('SELECT endpoint FROM push_subscriptions').all() as Array<{
        endpoint: string;
      }>;
      expect(rows.map((r) => r.endpoint)).toEqual(['https://push.example.com/b']);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('removeSubscription on an unknown endpoint is a silent no-op', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-push-'));
    try {
      const { pushService, db } = await importPushForHome(homeDir);
      pushService.initPush();

      expect(() => pushService.removeSubscription('https://push.example.com/nope')).not.toThrow();
      const count = (db.getDb().prepare('SELECT COUNT(*) AS c FROM push_subscriptions').get() as { c: number }).c;
      expect(count).toBe(0);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });
});

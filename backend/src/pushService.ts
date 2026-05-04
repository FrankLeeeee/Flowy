import webpush from 'web-push';
import { getDb } from './db';
import { getDbSetting, setDbSetting } from './db';

interface PushSubscriptionRow {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  created_at: string;
}

export function initPush(): void {
  ensurePushTable();
  ensureVapidKeys();

  const publicKey = getDbSetting('vapid_public_key');
  const privateKey = getDbSetting('vapid_private_key');
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      'mailto:flowy@localhost',
      publicKey,
      privateKey,
    );
  }
}

function ensurePushTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint    TEXT PRIMARY KEY,
      keys_p256dh TEXT NOT NULL,
      keys_auth   TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function ensureVapidKeys(): void {
  if (getDbSetting('vapid_public_key')) return;

  const vapidKeys = webpush.generateVAPIDKeys();
  setDbSetting('vapid_public_key', vapidKeys.publicKey);
  setDbSetting('vapid_private_key', vapidKeys.privateKey);
}

export function getVapidPublicKey(): string {
  return getDbSetting('vapid_public_key') ?? '';
}

export function saveSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO push_subscriptions (endpoint, keys_p256dh, keys_auth)
    VALUES (?, ?, ?)
  `).run(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
}

export function removeSubscription(endpoint: string): void {
  getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const rows = getDb()
    .prepare('SELECT * FROM push_subscriptions')
    .all() as PushSubscriptionRow[];

  const message = JSON.stringify(payload);
  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.keys_p256dh,
          auth: row.keys_auth,
        },
      };
      try {
        await webpush.sendNotification(subscription, message);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          staleEndpoints.push(row.endpoint);
        }
      }
    }),
  );

  // Clean up expired subscriptions
  if (staleEndpoints.length > 0) {
    const del = getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
    for (const endpoint of staleEndpoints) {
      del.run(endpoint);
    }
  }
}

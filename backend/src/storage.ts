import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Settings } from './types';
import { DATA_DIR } from './dataDir';
import { getDbSetting, setDbSetting } from './db';

// Legacy plaintext backup. Kept only for one-shot migration; never written.
const LEGACY_SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DB_KEY_REGISTRATION_SECRET = 'runner.registrationSecret';

/**
 * Load settings with the database as the primary source of truth.
 * Falls back to the legacy JSON file for backward compatibility on first
 * startup after this migration, then generates a fresh secret if neither
 * source has one.
 */
export function loadSettings(): Settings {
  // 1. Try the database first
  const dbSecret = getDbSetting(DB_KEY_REGISTRATION_SECRET);
  if (dbSecret) {
    return { runner: { registrationSecret: dbSecret } };
  }

  // 2. Fall back to the legacy JSON file (pre-migration installs).
  // Migrate the secret into the DB and remove the cleartext copy.
  const fileSecret = readSecretFromFile();
  if (fileSecret) {
    setDbSetting(DB_KEY_REGISTRATION_SECRET, fileSecret);
    try { fs.unlinkSync(LEGACY_SETTINGS_FILE); } catch { /* already gone */ }
    return { runner: { registrationSecret: fileSecret } };
  }

  // 3. First-time setup — generate and persist to the DB.
  const secret = generateRunnerSecret();
  const settings: Settings = { runner: { registrationSecret: secret } };
  saveSettings(settings);
  return settings;
}

export function saveSettings(s: Settings): void {
  setDbSetting(DB_KEY_REGISTRATION_SECRET, s.runner.registrationSecret);
}

/** Returns true if the value looks like a masked key (contains 3+ stars). */
export function isMasked(v: string | undefined): boolean {
  return !v || /\*{3,}/.test(v);
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function generateRunnerSecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(24);
  let secret = '';
  for (const byte of bytes) {
    secret += alphabet[byte % alphabet.length];
  }
  return secret;
}

/** Best-effort read of the registration secret from the legacy JSON file. */
function readSecretFromFile(): string | undefined {
  try {
    if (!fs.existsSync(LEGACY_SETTINGS_FILE)) return undefined;
    const parsed = JSON.parse(fs.readFileSync(LEGACY_SETTINGS_FILE, 'utf-8')) as Partial<Settings>;
    return parsed.runner?.registrationSecret?.trim() || undefined;
  } catch {
    return undefined;
  }
}

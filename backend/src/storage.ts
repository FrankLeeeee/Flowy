import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Settings } from './types';
import { DATA_DIR, ensureDataDir } from './dataDir';
import { getDbSetting, setDbSetting } from './db';

const SETTINGS_DIR = DATA_DIR;
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const DB_KEY_REGISTRATION_SECRET = 'runner.registrationSecret';

function ensureDir() {
  ensureDataDir();
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

/**
 * Load settings with the database as the primary source of truth.
 * Falls back to the JSON file for backward compatibility (e.g. first
 * startup after the migration), then generates a fresh secret if neither
 * source has one.
 */
export function loadSettings(): Settings {
  // 1. Try the database first
  const dbSecret = getDbSetting(DB_KEY_REGISTRATION_SECRET);
  if (dbSecret) {
    return { runner: { registrationSecret: dbSecret } };
  }

  // 2. Fall back to the JSON file (pre-migration installs)
  ensureDir();
  const fileSecret = readSecretFromFile();
  if (fileSecret) {
    // Migrate into the database so future loads hit the fast path
    setDbSetting(DB_KEY_REGISTRATION_SECRET, fileSecret);
    return { runner: { registrationSecret: fileSecret } };
  }

  // 3. First-time setup — generate, persist everywhere
  const secret = generateRunnerSecret();
  const settings: Settings = { runner: { registrationSecret: secret } };
  saveSettings(settings);
  return settings;
}

export function saveSettings(s: Settings): void {
  // Always write to the database (source of truth)
  setDbSetting(DB_KEY_REGISTRATION_SECRET, s.runner.registrationSecret);

  // Also write the JSON file as a human-readable backup
  ensureDir();
  const tmp = SETTINGS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2), 'utf-8');
  fs.renameSync(tmp, SETTINGS_FILE);
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
    if (!fs.existsSync(SETTINGS_FILE)) return undefined;
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) as Partial<Settings>;
    return parsed.runner?.registrationSecret?.trim() || undefined;
  } catch {
    return undefined;
  }
}

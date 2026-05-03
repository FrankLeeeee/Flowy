import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Settings } from './types';
import { DATA_DIR } from './dataDir';
import { getDbSetting, setDbSetting } from './db';

// Legacy plaintext backup. Kept only for one-shot migration; never written.
const LEGACY_SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DB_KEY_REGISTRATION_SECRET = 'runner.registrationSecret';
const MIN_RUNNER_SECRET_LENGTH = 12;
const MAX_RUNNER_SECRET_LENGTH = 30;

/**
 * Load settings with the database as the primary source of truth.
 * Falls back to the legacy JSON file for backward compatibility on first
 * startup after this migration, then generates a fresh secret if neither
 * source has one.
 */
export function loadSettings(): Settings {
  // 1. Try the database first
  const dbSecret = normalizeRunnerSecret(getDbSetting(DB_KEY_REGISTRATION_SECRET));
  if (isValidRunnerSecret(dbSecret)) {
    return { runner: { registrationSecret: dbSecret } };
  }

  // 2. Fall back to the legacy JSON file (pre-migration installs).
  // Migrate the secret into the DB and remove the cleartext copy.
  const fileSecret = normalizeRunnerSecret(readSecretFromFile());
  if (isValidRunnerSecret(fileSecret)) {
    setDbSetting(DB_KEY_REGISTRATION_SECRET, fileSecret);
    try { fs.unlinkSync(LEGACY_SETTINGS_FILE); } catch { /* already gone */ }
    return { runner: { registrationSecret: fileSecret } };
  }
  if (fileSecret) {
    try { fs.unlinkSync(LEGACY_SETTINGS_FILE); } catch { /* already gone */ }
  }

  // 3. First-time setup — generate and persist to the DB.
  const secret = generateRunnerSecret();
  const settings: Settings = { runner: { registrationSecret: secret } };
  saveSettings(settings);
  return settings;
}

export function saveSettings(s: Settings): void {
  const secret = normalizeRunnerSecret(s.runner.registrationSecret);
  if (!isValidRunnerSecret(secret)) {
    throw new Error(
      `runner.registrationSecret must be between ${MIN_RUNNER_SECRET_LENGTH} and ${MAX_RUNNER_SECRET_LENGTH} characters`,
    );
  }
  setDbSetting(DB_KEY_REGISTRATION_SECRET, secret);
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

export function generateRunnerSecret(): string {
  // 15 random bytes => 30 hex chars (fits max length).
  return crypto.randomBytes(15).toString('hex');
}

export function isValidRunnerSecret(secret: string | undefined): secret is string {
  if (!secret) return false;
  return secret.length >= MIN_RUNNER_SECRET_LENGTH && secret.length <= MAX_RUNNER_SECRET_LENGTH;
}

function normalizeRunnerSecret(secret: string | undefined): string | undefined {
  return secret?.trim() || undefined;
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

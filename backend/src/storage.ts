import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Settings } from './types';
import { DATA_DIR, ensureDataDir } from './dataDir';

const SETTINGS_DIR = DATA_DIR;
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

function createDefaultSettings(): Settings {
  return {
    runner: { registrationSecret: generateRunnerSecret() },
  };
}

function ensureDir() {
  ensureDataDir();
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

export function loadSettings(): Settings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    const settings = createDefaultSettings();
    saveSettings(settings);
    return settings;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) as Partial<Settings>;
    const settings = {
      runner: {
        registrationSecret: parsed.runner?.registrationSecret?.trim() || generateRunnerSecret(),
      },
    };
    if (!parsed.runner?.registrationSecret?.trim()) {
      saveSettings(settings);
    }
    return settings;
  } catch {
    const settings = createDefaultSettings();
    saveSettings(settings);
    return settings;
  }
}

export function saveSettings(s: Settings): void {
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

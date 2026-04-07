import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { Settings } from './types';

const SETTINGS_DIR = path.join(os.homedir(), '.config', 'my-hub');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const DEFAULTS: Settings = {
  runner:     { registrationSecret: generateRunnerSecret() },
};

function ensureDir() {
  if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

export function loadSettings(): Settings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    const settings = structuredClone(DEFAULTS);
    saveSettings(settings);
    return settings;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) as Partial<Settings>;
    const settings = {
      runner: { ...DEFAULTS.runner, ...parsed.runner },
    };
    if (!settings.runner.registrationSecret) {
      settings.runner.registrationSecret = generateRunnerSecret();
      saveSettings(settings);
    }
    return settings;
  } catch {
    const settings = structuredClone(DEFAULTS);
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

import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isMasked, maskKey } from '../src/storage';

async function importStorageForHome(homeDir: string) {
  vi.resetModules();
  vi.doMock('os', async () => {
    const actual = await vi.importActual<typeof import('os')>('os');
    return {
      ...actual,
      default: {
        ...actual,
        homedir: () => homeDir,
      },
      homedir: () => homeDir,
    };
  });
  return import('../src/storage');
}

describe('storage helpers', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('os');
  });

  it('treats undefined and star-masked values as masked', () => {
    expect(isMasked(undefined)).toBe(true);
    expect(isMasked('sk-1234****5678')).toBe(true);
  });

  it('does not treat plain keys as masked', () => {
    expect(isMasked('sk-live-12345678')).toBe(false);
  });

  it('masks short keys defensively', () => {
    expect(maskKey('short')).toBe('****');
  });

  it('keeps the start and end of longer keys visible', () => {
    expect(maskKey('abcdefghijklmnop')).toBe('abcd****mnop');
  });

  it('creates and persists a registration secret on first load', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-settings-'));
    try {
      const storage = await importStorageForHome(homeDir);
      const { initDb, getDbSetting } = await import('../src/db');
      initDb();

      const settings = storage.loadSettings();

      expect(settings.runner.registrationSecret).toMatch(/^[a-f0-9]{64}$/);
      expect(getDbSetting('runner.registrationSecret')).toBe(settings.runner.registrationSecret);
      // Confirm no plaintext settings.json is written.
      const legacyFile = path.join(homeDir, '.config', 'flowy', 'settings.json');
      expect(fs.existsSync(legacyFile)).toBe(false);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('migrates a legacy settings.json secret into the DB and removes the file', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-settings-'));
    try {
      const settingsDir = path.join(homeDir, '.config', 'flowy');
      const legacyFile = path.join(settingsDir, 'settings.json');
      fs.mkdirSync(settingsDir, { recursive: true });
      const legacySecret = 'a'.repeat(64);
      fs.writeFileSync(legacyFile, JSON.stringify({ runner: { registrationSecret: legacySecret } }), 'utf-8');

      const storage = await importStorageForHome(homeDir);
      const { initDb, getDbSetting } = await import('../src/db');
      initDb();

      const settings = storage.loadSettings();

      expect(settings.runner.registrationSecret).toBe(legacySecret);
      expect(getDbSetting('runner.registrationSecret')).toBe(legacySecret);
      expect(fs.existsSync(legacyFile)).toBe(false);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('replaces legacy human-readable secrets with a generated secret', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-settings-'));
    try {
      const storage = await importStorageForHome(homeDir);
      const { initDb, getDbSetting, setDbSetting } = await import('../src/db');
      initDb();
      setDbSetting('runner.registrationSecret', 'same-as-login-password');

      const settings = storage.loadSettings();

      expect(settings.runner.registrationSecret).toMatch(/^[a-f0-9]{64}$/);
      expect(settings.runner.registrationSecret).not.toBe('same-as-login-password');
      expect(getDbSetting('runner.registrationSecret')).toBe(settings.runner.registrationSecret);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });
});

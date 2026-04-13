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
      const { loadSettings } = await importStorageForHome(homeDir);
      const settings = loadSettings();
      const settingsFile = path.join(homeDir, '.config', 'flowy', 'settings.json');

      expect(settings.runner.registrationSecret).toMatch(/^[A-Za-z0-9]{24}$/);
      expect(JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))).toEqual(settings);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('backfills a missing registration secret in an existing settings file', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-settings-'));
    try {
      const settingsDir = path.join(homeDir, '.config', 'flowy');
      const settingsFile = path.join(settingsDir, 'settings.json');
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(settingsFile, JSON.stringify({ runner: { registrationSecret: '   ' } }, null, 2), 'utf-8');

      const { loadSettings } = await importStorageForHome(homeDir);
      const settings = loadSettings();
      const persisted = JSON.parse(fs.readFileSync(settingsFile, 'utf-8')) as { runner: { registrationSecret: string } };

      expect(settings.runner.registrationSecret).toMatch(/^[A-Za-z0-9]{24}$/);
      expect(persisted.runner.registrationSecret).toBe(settings.runner.registrationSecret);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });
});

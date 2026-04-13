import fs from 'fs';
import os from 'os';
import path from 'path';

export const CONFIG_DIR = path.join(os.homedir(), '.config', 'flowy');

export function ensureConfigDir(): string {
  fs.mkdirSync(path.dirname(CONFIG_DIR), { recursive: true });
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  return CONFIG_DIR;
}

export function getRunnerTokenPath(name: string): string {
  return path.join(CONFIG_DIR, `runner-${name}.json`);
}

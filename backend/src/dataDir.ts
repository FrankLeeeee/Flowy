import fs from 'fs';
import os from 'os';
import path from 'path';

export const DATA_DIR = path.join(os.homedir(), '.config', 'flowy');

export function ensureDataDir(): string {
  fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

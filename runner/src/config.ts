import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { RunnerConfig } from './types';

export const childProcess = { spawnSync };

const CONFIG_DIR = path.join(os.homedir(), '.config', 'my-hub');
const SUPPORTED_PROVIDERS = [
  { id: 'claude-code', command: 'claude' },
  { id: 'codex', command: 'codex' },
] as const;

export function parseArgs(argv: string[]): RunnerConfig {
  const args = argv.slice(2);
  let name = '';
  let url = '';
  let pollInterval = 5;
  let token: string | undefined;
  let secret: string | undefined;
  let device = os.hostname();

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':    name = args[++i] ?? ''; break;
      case '--url':     url = args[++i] ?? ''; break;
      case '--poll-interval': pollInterval = parseInt(args[++i] ?? '5', 10); break;
      case '--token':   token = args[++i]; break;
      case '--secret':  secret = args[++i]; break;
      case '--device':  device = args[++i] ?? os.hostname(); break;
    }
  }

  if (!name || !url) {
    console.error('Usage: my-hub-runner --name <name> --url <backend-url> [options]');
    console.error('');
    console.error('Required:');
    console.error('  --name          Runner name');
    console.error('  --url           Backend URL (e.g. http://localhost:3001)');
    console.error('');
    console.error('Options:');
    console.error('  --poll-interval Poll interval in seconds (default: 5)');
    console.error('  --token         Existing runner token (skip registration)');
    console.error('  --secret        Registration secret (required if server has one configured)');
    console.error('  --device        Device info (default: hostname)');
    process.exit(1);
  }

  // If no token provided, try to load from saved config
  if (!token) {
    token = loadToken(name);
  }

  const providers = detectAvailableProviders();
  if (providers.length === 0) {
    console.error('No supported AI CLIs were detected on this machine.');
    console.error('Install one of: claude, codex');
    process.exit(1);
  }

  return {
    name,
    url: url.replace(/\/$/, ''),
    providers,
    lastCliScanAt: new Date().toISOString(),
    pollInterval,
    token,
    secret,
    device,
  };
}

export function detectAvailableProviders(): string[] {
  return SUPPORTED_PROVIDERS
    .filter((provider) => isCommandAvailable(provider.command))
    .map((provider) => provider.id);
}

function isCommandAvailable(command: string): boolean {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const result = childProcess.spawnSync(checker, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function loadToken(name: string): string | undefined {
  const file = path.join(CONFIG_DIR, `runner-${name}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return data.token;
  } catch {
    return undefined;
  }
}

export function saveToken(name: string, id: string, token: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const file = path.join(CONFIG_DIR, `runner-${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ id, token }, null, 2));
}

export function deleteToken(name: string): void {
  const file = path.join(CONFIG_DIR, `runner-${name}.json`);
  try {
    fs.unlinkSync(file);
  } catch {
    // Ignore missing/unreadable token files.
  }
}

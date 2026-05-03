import os from 'os';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { RunnerConfig } from './types';
import { ensureConfigDir, getRunnerTokenPath } from './configDir';

export const childProcess = { spawnSync };
const SUPPORTED_PROVIDERS = [
  { id: 'claude-code', command: 'claude' },
  { id: 'codex', command: 'codex' },
  { id: 'cursor-agent', command: 'agent' },
  { id: 'gemini-cli', command: 'gemini' },
] as const;

const CLI_UPDATE_COMMANDS: Record<string, { cmd: string; args: string[] }> = {
  'claude-code':  { cmd: 'claude', args: ['update'] },
  'codex':        { cmd: 'npm',   args: ['i', '-g', '@openai/codex@latest'] },
  'cursor-agent': { cmd: 'agent', args: ['update'] },
  'gemini-cli':   { cmd: 'npm',   args: ['install', '-g', '@google/gemini-cli'] },
};

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
    console.error('Usage: flowy-runner --name <name> --url <hub-url> [options]');
    console.error('');
    console.error('Required:');
    console.error('  --name          Runner name');
    console.error('  --url           Hub URL (e.g. http://localhost:3001)');
    console.error('');
    console.error('Options:');
    console.error('  --poll-interval Poll interval in seconds (default: 5)');
    console.error('  --token         Existing runner token (skip registration)');
    console.error('  --secret        Registration secret (required for first-time registration)');
    console.error('  --device        Device info (default: hostname)');
    process.exit(1);
  }

  // If no token provided, try to load from saved config
  if (!token) {
    token = loadToken(name);
  }

  if (!token && !secret) {
    console.error('A registration secret is required the first time a runner connects.');
    console.error('Copy it from the Flowy Runners > Security page and pass it with --secret.');
    process.exit(1);
  }

  const { providers, versions } = detectAvailableProvidersWithVersions();
  if (providers.length === 0) {
    console.error('No supported AI CLIs were detected on this machine.');
    console.error('Install one of: claude, codex, agent, gemini');
    process.exit(1);
  }

  return {
    name,
    url: url.replace(/\/$/, ''),
    providers,
    cliVersions: versions,
    lastCliScanAt: new Date().toISOString(),
    pollInterval,
    token,
    secret,
    device,
  };
}

export function updateInstalledClis(providers: string[]): void {
  for (const provider of providers) {
    const entry = CLI_UPDATE_COMMANDS[provider];
    if (!entry) continue;
    const label = `${entry.cmd} ${entry.args.join(' ')}`;
    console.log(`  Running: ${label}`);
    const result = childProcess.spawnSync(entry.cmd, entry.args, {
      encoding: 'utf-8',
      timeout: 120_000,
      env: { ...process.env, CI: '1' },
    });
    if (result.status !== 0) {
      const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
      console.warn(`  Failed to update ${provider}: ${output || `exit ${result.status}`}`);
    } else {
      console.log(`  Updated ${provider}`);
    }
  }
}

export function detectAvailableProvidersWithVersions(): { providers: string[]; versions: Record<string, string> } {
  const providers: string[] = [];
  const versions: Record<string, string> = {};
  for (const p of SUPPORTED_PROVIDERS) {
    if (!isCommandAvailable(p.command)) continue;
    providers.push(p.id);
    const v = detectCliVersion(p.command);
    if (v) versions[p.id] = v;
  }
  return { providers, versions };
}

export function detectAvailableProviders(): string[] {
  return detectAvailableProvidersWithVersions().providers;
}

function detectCliVersion(command: string): string {
  const result = childProcess.spawnSync(command, ['--version'], {
    encoding: 'utf-8',
    timeout: 5_000,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join('');
  const match = output.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? '';
}

function isCommandAvailable(command: string): boolean {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const result = childProcess.spawnSync(checker, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function loadToken(name: string): string | undefined {
  ensureConfigDir();
  const file = getRunnerTokenPath(name);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return data.token;
  } catch {
    return undefined;
  }
}

export function saveToken(name: string, id: string, token: string): void {
  ensureConfigDir();
  const file = getRunnerTokenPath(name);
  fs.writeFileSync(file, JSON.stringify({ id, token }, null, 2));
}

export function deleteToken(name: string): void {
  ensureConfigDir();
  const file = getRunnerTokenPath(name);
  try {
    fs.unlinkSync(file);
  } catch {
    // Ignore missing/unreadable token files.
  }
}

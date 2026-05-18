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

const PROVIDER_COMMAND: Record<string, string> = Object.fromEntries(
  SUPPORTED_PROVIDERS.map((p) => [p.id, p.command]),
);

/**
 * How to ask each CLI for the models it can run, without an interactive TUI.
 * Each entry in `argSets` is tried in order until one yields a parseable,
 * non-empty list. Providers that require PTY-based detection (Claude Code,
 * Gemini CLI) are handled separately via `detectPtyModels`.
 */
const CLI_MODEL_QUERIES: Record<string, { argSets: string[][]; parse: (output: string) => string[] }> = {
  'cursor-agent': { argSets: [['--list-models'], ['models']],                   parse: parseModelLines },
  'codex':        { argSets: [['debug', 'models'], ['debug', 'models', '--bundled']], parse: parseCodexModels },
};

/**
 * Providers whose model list is only accessible via an interactive prompt
 * (e.g. `/model`). We drive them through a pseudo-TTY allocated by the
 * system `script` command so the CLI believes it has a real terminal.
 */
const PTY_MODEL_QUERIES: Record<string, { command: string; slashCommand: string }> = {
  'claude-code': { command: 'claude', slashCommand: '/model' },
};

/**
 * Self-contained Node.js script spawned via `node -e` that uses the system
 * `script` command to allocate a PTY, starts the target CLI inside it,
 * sends a slash command, and prints the captured output to stdout.
 *
 * Communication with the parent process:
 *   FLOWY_PTY_CMD   – the CLI binary to run (e.g. "claude")
 *   FLOWY_PTY_SLASH – the slash command to send (e.g. "/model")
 *
 * Phases:
 *   0 – wait for the CLI to finish initialising (2 s of quiet)
 *   1 – send the slash command; collect output (1.5 s of quiet)
 *   then print collected output and tear down
 */
const PTY_MODEL_SCRIPT = `
'use strict';
var spawn = require('child_process').spawn;
var cmd = process.env.FLOWY_PTY_CMD;
var slash = process.env.FLOWY_PTY_SLASH;
if (!cmd || !slash) process.exit(1);
var isLinux = process.platform === 'linux';
var args = isLinux ? ['-qc', cmd, '/dev/null'] : ['-q', '/dev/null', cmd];
var c = spawn('script', args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: Object.assign({}, process.env, { TERM: 'dumb' })
});
var buf = '', phase = 0, t = null;
function rt(ms, fn) { clearTimeout(t); t = setTimeout(fn, ms); }
function finish() {
  process.stdout.write(buf);
  try { c.stdin.write('\\x1b'); } catch (_) {}
  setTimeout(function () {
    try { c.stdin.write('/exit\\n'); } catch (_) {}
    setTimeout(function () { try { c.kill('SIGTERM'); } catch (_) {} process.exit(0); }, 500);
  }, 200);
}
c.stdout.on('data', function (d) {
  buf += d;
  if (phase === 0) {
    rt(2000, function () { phase = 1; buf = ''; c.stdin.write(slash + '\\n'); rt(2000, finish); });
  } else if (phase === 1) {
    rt(1500, finish);
  }
});
c.stderr.on('data', function (d) { buf += d; });
rt(12000, function () { process.exit(1); });
setTimeout(function () { process.stdout.write(buf); try { c.kill('SIGTERM'); } catch (_) {} process.exit(0); }, 25000);
`.trim();

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
    cliModels: detectAvailableModels(providers),
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

/**
 * Query every detected provider for its available models and return the
 * discovered model ids keyed by provider. Providers with a non-interactive
 * CLI flag are queried directly; those that only expose models through an
 * interactive prompt are driven via a pseudo-TTY. Best-effort: any failure
 * to spawn or parse leaves that provider out rather than throwing, so model
 * detection never blocks heartbeats or startup.
 */
export function detectAvailableModels(providers: string[]): Record<string, string[]> {
  const models: Record<string, string[]> = {};
  for (const provider of providers) {
    // PTY-based detection for interactive-only CLIs
    const ptyQuery = PTY_MODEL_QUERIES[provider];
    if (ptyQuery) {
      const parsed = detectPtyModels(ptyQuery.command, ptyQuery.slashCommand);
      if (parsed.length > 0) models[provider] = parsed;
      continue;
    }

    const query = CLI_MODEL_QUERIES[provider];
    const command = PROVIDER_COMMAND[provider];
    if (!query || !command) continue;

    for (const args of query.argSets) {
      const result = childProcess.spawnSync(command, args, {
        encoding: 'utf-8',
        timeout: 10_000,
      });
      if (result.status !== 0) continue;

      const stdout = typeof result.stdout === 'string' ? result.stdout : '';
      const stderr = typeof result.stderr === 'string' ? result.stderr : '';
      const output = stdout.trim() ? stdout : stderr;

      let parsed: string[] = [];
      try {
        parsed = query.parse(output);
      } catch {
        parsed = [];
      }
      if (parsed.length > 0) {
        models[provider] = parsed;
        break;
      }
    }
  }
  return models;
}

/**
 * Drive an interactive CLI through a pseudo-TTY to extract its model list.
 * Spawns a Node.js helper that uses the system `script` command (macOS/Linux)
 * to allocate a real terminal, starts the CLI inside it, sends the slash
 * command, and captures the output. Returns [] on Windows or any failure.
 */
export function detectPtyModels(command: string, slashCommand: string): string[] {
  if (process.platform === 'win32') return [];

  const result = childProcess.spawnSync(process.execPath, ['-e', PTY_MODEL_SCRIPT], {
    encoding: 'utf-8',
    timeout: 30_000,
    env: { ...process.env, FLOWY_PTY_CMD: command, FLOWY_PTY_SLASH: slashCommand },
  });

  if (result.status !== 0) return [];

  const output = typeof result.stdout === 'string' ? result.stdout : '';
  return parseModelLines(output);
}

const ANSI_PATTERN = /\[[0-9;]*m/g;

/** Parse a plain-text model listing (one model per line, tolerant of bullets/headers/selector arrows). */
export function parseModelLines(output: string): string[] {
  const models: string[] = [];
  for (const rawLine of output.replace(ANSI_PATTERN, '').split('\n')) {
    const line = rawLine.trim().replace(/^[-*•>❯►▸→✓✗○●◉]+\s*/, '');
    if (!line || line.endsWith(':')) continue; // skip blank lines and headers
    const token = line.split(/\s+/)[0];
    if (/^[A-Za-z0-9][\w.\-/:]*$/.test(token)) models.push(token);
  }
  return [...new Set(models)];
}

/** Parse Codex's `debug models` JSON catalog, tolerant of leading log noise and shape. */
export function parseCodexModels(output: string): string[] {
  const start = output.search(/[[{]/);
  if (start === -1) return [];

  const data = JSON.parse(output.slice(start)) as unknown;
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as { models?: unknown })?.models)
      ? (data as { models: unknown[] }).models
      : [];

  const models = items.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const id = record.id ?? record.slug ?? record.model ?? record.name;
      return typeof id === 'string' ? id : '';
    }
    return '';
  }).filter((id): id is string => id.length > 0);

  return [...new Set(models)];
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

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { SkillCli, SkillCommand, SkillInventoryEntry } from './types';

/**
 * Maps each supported CLI to its skills root directory on the local machine.
 * Each individual skill is stored at `<root>/<name>/SKILL.md`.
 */
export const SKILL_DIRS: Record<SkillCli, string> = {
  'claude-code': path.join(os.homedir(), '.claude', 'skills'),
  // Codex, Cursor, and Gemini CLI all share ~/.agents/skills as the standard global path
  'codex': path.join(os.homedir(), '.agents', 'skills'),
  'cursor-agent': path.join(os.homedir(), '.agents', 'skills'),
  'gemini-cli': path.join(os.homedir(), '.agents', 'skills'),
};

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const COMMAND_TIMEOUT_MS = 120_000;

function skillDir(cli: SkillCli, name: string): string {
  if (!SAFE_NAME.test(name)) {
    throw new Error(`Unsafe skill name: ${name}`);
  }
  const root = SKILL_DIRS[cli];
  if (!root) throw new Error(`Unsupported cli: ${cli}`);
  return path.join(root, name);
}

/** Build the SKILL.md file body with a minimal YAML front-matter. */
function buildSkillFile(name: string, description: string, content: string): string {
  const desc = (description || '').replace(/\r?\n/g, ' ').trim();
  const frontMatter = `---\nname: ${name}\ndescription: ${desc}\n---\n\n`;
  return frontMatter + (content || '');
}

export function writeSkill(cli: SkillCli, name: string, description: string, content: string): void {
  const dir = skillDir(cli, name);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'SKILL.md');
  fs.writeFileSync(filePath, buildSkillFile(name, description, content), 'utf-8');
}

export function deleteSkill(cli: SkillCli, name: string): void {
  const dir = skillDir(cli, name);
  const root = SKILL_DIRS[cli];
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error('Refusing to delete outside skills root');
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

function parseDescription(content: string): string {
  const frontMatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const source = frontMatter?.[1] ?? content;
  const description = source.match(/^description:\s*(.*)$/m)?.[1]?.trim() ?? '';
  return description.replace(/^['"]|['"]$/g, '');
}

export function listSkills(): SkillInventoryEntry[] {
  const skills: SkillInventoryEntry[] = [];

  for (const [cli, root] of Object.entries(SKILL_DIRS) as Array<[SkillCli, string]>) {
    if (!fs.existsSync(root)) continue;

    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      if (!SAFE_NAME.test(entry.name)) continue;

      const filePath = path.join(root, entry.name, 'SKILL.md');
      let content = '';
      try {
        content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
      } catch {
        content = '';
      }

      skills.push({
        cli,
        name: entry.name,
        description: parseDescription(content),
        content,
        path: filePath,
      });
    }
  }

  return skills.sort((a, b) => `${a.cli}:${a.name}`.localeCompare(`${b.cli}:${b.name}`));
}

function splitCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of command.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaping = true;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      continue;
    }

    if (!quote && /\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaping) current += '\\';
  if (quote) throw new Error('Install command has an unterminated quote');
  if (current) tokens.push(current);
  return tokens;
}

function parseSkillsInstallCommand(command: string): string[] {
  const tokens = splitCommand(command);
  if (tokens[0] !== 'npx') {
    throw new Error('Install command must start with "npx"');
  }

  const args = tokens.slice(1);
  const skillsIndex = args.findIndex((arg) => arg === 'skills');
  if (skillsIndex < 0 || args[skillsIndex + 1] !== 'add') {
    throw new Error('Install command must run "npx skills add ..."');
  }

  if (args.some((arg) => /[;&|`$<>]/.test(arg))) {
    throw new Error('Install command contains unsupported shell metacharacters');
  }

  return args;
}

export function installSkill(command: string): void {
  const args = parseSkillsInstallCommand(command);
  const result = spawnSync('npx', args, {
    encoding: 'utf-8',
    timeout: COMMAND_TIMEOUT_MS,
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(output || `npx exited with status ${result.status}`);
  }
}

export function applySkillCommand(command: SkillCommand): void {
  switch (command.action) {
    case 'install':
      if (!command.installCommand) throw new Error('Install command is required');
      installSkill(command.installCommand);
      return;
    case 'write':
      writeSkill(command.cli, command.name, command.description ?? '', command.content ?? '');
      return;
    case 'delete':
      deleteSkill(command.cli, command.name);
      return;
    default:
      throw new Error(`Unknown skill action: ${(command as { action: string }).action}`);
  }
}

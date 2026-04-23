import fs from 'fs';
import os from 'os';
import path from 'path';
import { SkillCli, SkillCommand } from './types';

/**
 * Maps each supported CLI to its skills root directory on the local machine.
 * Each individual skill is stored at `<root>/<name>/SKILL.md`.
 */
export const SKILL_DIRS: Record<SkillCli, string> = {
  'claude-code': path.join(os.homedir(), '.claude', 'skills'),
  'codex': path.join(os.homedir(), '.codex', 'skills'),
  'cursor-agent': path.join(os.homedir(), '.cursor', 'skills-cursor'),
};

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

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

export function applySkillCommand(command: SkillCommand): void {
  switch (command.action) {
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

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { AiProvider, Runner, Skill } from '../types';
import { enqueueSkillCommand } from '../skillQueue';
import { requestRunnerSkillInventory, RunnerSkillEntry } from '../skillInventory';

const router = Router();

const SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const SKILLS_REPO_URL = 'https://github.com/vercel-labs/skills';
const SKILLS_INSTALL_AGENTS = ['claude-code', 'codex', 'cursor', 'gemini-cli'] as const;
const SKILLS_RECORD_CLI: AiProvider = 'codex';

function buildSkillsInstallCommand(name: string): string {
  const agentFlags = SKILLS_INSTALL_AGENTS.map((agent) => `--agent ${agent}`).join(' ');
  return `npx skills add ${SKILLS_REPO_URL} --skill ${name} ${agentFlags} -g -y`;
}

function skillId(runnerId: string, cli: AiProvider, name: string): string {
  return `${runnerId}::${cli}::${name}`;
}

function parseSkillId(id: string): { runnerId: string; cli: AiProvider; name: string } | null {
  const [runnerId, cli, ...nameParts] = id.split('::');
  const name = nameParts.join('::');
  if (!runnerId || !cli || !name) return null;
  if (!['claude-code', 'codex', 'cursor-agent', 'gemini-cli'].includes(cli)) return null;
  return { runnerId, cli: cli as AiProvider, name };
}

function toSkill(runnerId: string, entry: RunnerSkillEntry): Skill {
  return {
    id: skillId(runnerId, entry.cli, entry.name),
    runner_id: runnerId,
    cli: entry.cli,
    name: entry.name,
    description: entry.description,
    content: entry.content || `Path: ${entry.path}`,
    created_at: '',
    updated_at: '',
  };
}

async function listRunnerSkills(runner: Runner): Promise<Skill[]> {
  if (runner.status === 'offline') return [];
  try {
    const entries = await requestRunnerSkillInventory(runner.id);
    return entries.map((entry) => toSkill(runner.id, entry));
  } catch {
    return [];
  }
}

// GET /api/skills?runner=&cli= — live list from each runner's local skill directories
router.get('/', async (req: Request, res: Response) => {
  const { runner, cli } = req.query as { runner?: string; cli?: string };
  const runners = (runner
    ? getDb().prepare('SELECT * FROM runners WHERE id = ?').all(runner)
    : getDb().prepare('SELECT * FROM runners ORDER BY created_at DESC').all()) as Runner[];

  const nested = await Promise.all(runners.map(listRunnerSkills));
  const skills = nested
    .flat()
    .filter((skill) => !cli || skill.cli === cli)
    .sort((a, b) => `${a.runner_id}:${a.cli}:${a.name}`.localeCompare(`${b.runner_id}:${b.cli}:${b.name}`));

  res.json(skills);
});

// GET /api/skills/:id — live detail from the runner inventory
router.get('/:id', async (req: Request, res: Response) => {
  const parsed = parseSkillId(req.params.id);
  if (!parsed) { res.status(400).json({ error: 'Invalid skill id' }); return; }

  const runner = getDb().prepare('SELECT * FROM runners WHERE id = ?').get(parsed.runnerId) as Runner | undefined;
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }

  const skills = await listRunnerSkills(runner);
  const skill = skills.find((candidate) => candidate.cli === parsed.cli && candidate.name === parsed.name);
  if (!skill) { res.status(404).json({ error: 'Skill not found' }); return; }
  res.json(skill);
});

// POST /api/skills — install a skills.sh skill on a runner
router.post('/', (req: Request, res: Response) => {
  const { runnerId, name } = req.body as { runnerId?: string; name?: string };

  if (!runnerId) { res.status(400).json({ error: 'runnerId is required' }); return; }
  const normalizedName = name?.trim() || '';
  if (!normalizedName || !SKILL_NAME_RE.test(normalizedName)) {
    res.status(400).json({ error: 'Invalid skill name (letters, digits, underscore, hyphen; up to 64 chars)' });
    return;
  }

  const runner = getDb().prepare('SELECT * FROM runners WHERE id = ?').get(runnerId) as Runner | undefined;
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }

  enqueueSkillCommand(runnerId, {
    action: 'install',
    cli: SKILLS_RECORD_CLI,
    name: normalizedName,
    description: 'Installed from skills.sh for all agents.',
    installCommand: buildSkillsInstallCommand(normalizedName),
  });

  res.status(202).json({
    id: skillId(runnerId, SKILLS_RECORD_CLI, normalizedName),
    runner_id: runnerId,
    cli: SKILLS_RECORD_CLI,
    name: normalizedName,
    description: 'Install queued for all supported agents.',
    content: `Queued: ${buildSkillsInstallCommand(normalizedName)}`,
    created_at: '',
    updated_at: '',
  } satisfies Skill);
});

// DELETE /api/skills/:id — remove a skill from the selected provider directory on its runner
router.delete('/:id', (req: Request, res: Response) => {
  const parsed = parseSkillId(req.params.id);
  if (!parsed) { res.status(400).json({ error: 'Invalid skill id' }); return; }

  const runner = getDb().prepare('SELECT id FROM runners WHERE id = ?').get(parsed.runnerId);
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }

  enqueueSkillCommand(parsed.runnerId, {
    action: 'delete',
    cli: parsed.cli,
    name: parsed.name,
  });

  res.json({ ok: true });
});

// POST /api/skills/:id/broadcast — install this skills.sh skill on other runners
router.post('/:id/broadcast', (req: Request, res: Response) => {
  const parsed = parseSkillId(req.params.id);
  if (!parsed) { res.status(400).json({ error: 'Invalid skill id' }); return; }

  const { runnerIds } = req.body as { runnerIds?: string[] };
  const allRunners = getDb().prepare('SELECT * FROM runners').all() as Runner[];
  const targets = allRunners.filter((runner) => {
    if (runner.id === parsed.runnerId) return false;
    if (runnerIds && runnerIds.length > 0) return runnerIds.includes(runner.id);
    return true;
  });

  const installCommand = buildSkillsInstallCommand(parsed.name);
  const results: Array<{ runnerId: string; skillId: string; created: boolean }> = [];
  for (const runner of targets) {
    enqueueSkillCommand(runner.id, {
      action: 'install',
      cli: SKILLS_RECORD_CLI,
      name: parsed.name,
      description: 'Installed from skills.sh for all agents.',
      installCommand,
    });
    results.push({ runnerId: runner.id, skillId: skillId(runner.id, SKILLS_RECORD_CLI, parsed.name), created: true });
  }

  res.json({ broadcast: results.length, results });
});

// POST /api/skills/:id/resync — re-run skills.sh install on this skill's runner
router.post('/:id/resync', (req: Request, res: Response) => {
  const parsed = parseSkillId(req.params.id);
  if (!parsed) { res.status(400).json({ error: 'Invalid skill id' }); return; }

  const runner = getDb().prepare('SELECT id FROM runners WHERE id = ?').get(parsed.runnerId);
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }

  enqueueSkillCommand(parsed.runnerId, {
    action: 'install',
    cli: SKILLS_RECORD_CLI,
    name: parsed.name,
    description: 'Installed from skills.sh for all agents.',
    installCommand: buildSkillsInstallCommand(parsed.name),
  });

  res.json({ ok: true });
});

export default router;

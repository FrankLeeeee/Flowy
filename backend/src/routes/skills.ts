import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { AiProvider, Runner, Skill } from '../types';
import { enqueueSkillCommand } from '../skillQueue';

const router = Router();

const SUPPORTED_CLIS: AiProvider[] = ['claude-code', 'codex', 'cursor-agent'];
const SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

function isValidCli(cli: unknown): cli is AiProvider {
  return typeof cli === 'string' && (SUPPORTED_CLIS as string[]).includes(cli);
}

function getRunner(id: string): Runner | undefined {
  return getDb().prepare('SELECT * FROM runners WHERE id = ?').get(id) as Runner | undefined;
}

function getSkill(id: string): Skill | undefined {
  return getDb().prepare('SELECT * FROM skills WHERE id = ?').get(id) as Skill | undefined;
}

// GET /api/skills?runner=&cli= — list skills
router.get('/', (req: Request, res: Response) => {
  const { runner, cli } = req.query as { runner?: string; cli?: string };
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (runner) { conditions.push('runner_id = ?'); params.push(runner); }
  if (cli) {
    if (!isValidCli(cli)) { res.status(400).json({ error: 'Invalid cli filter' }); return; }
    conditions.push('cli = ?'); params.push(cli);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(`SELECT * FROM skills ${where} ORDER BY cli ASC, name ASC`)
    .all(...params) as Skill[];
  res.json(rows);
});

// GET /api/skills/:id — full skill with content
router.get('/:id', (req: Request, res: Response) => {
  const skill = getSkill(req.params.id);
  if (!skill) { res.status(404).json({ error: 'Skill not found' }); return; }
  res.json(skill);
});

// POST /api/skills — create or replace a skill on a runner
router.post('/', (req: Request, res: Response) => {
  const { runnerId, cli, name, description, content } = req.body as {
    runnerId?: string; cli?: string; name?: string; description?: string; content?: string;
  };

  if (!runnerId) { res.status(400).json({ error: 'runnerId is required' }); return; }
  if (!isValidCli(cli)) { res.status(400).json({ error: 'cli must be one of claude-code, codex, cursor-agent' }); return; }
  if (!name || !SKILL_NAME_RE.test(name)) {
    res.status(400).json({ error: 'Invalid skill name (letters, digits, underscore, hyphen; up to 64 chars)' });
    return;
  }

  const runner = getRunner(runnerId);
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }

  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM skills WHERE runner_id = ? AND cli = ? AND name = ?')
    .get(runnerId, cli, name) as { id: string } | undefined;

  const id = existing?.id ?? uuid();
  const desc = description ?? '';
  const body = content ?? '';

  if (existing) {
    db.prepare(`
      UPDATE skills SET description = ?, content = ?, updated_at = datetime('now') WHERE id = ?
    `).run(desc, body, existing.id);
  } else {
    db.prepare(`
      INSERT INTO skills (id, runner_id, cli, name, description, content) VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, runnerId, cli, name, desc, body);
  }

  enqueueSkillCommand(runnerId, {
    action: 'write',
    cli,
    name,
    description: desc,
    content: body,
  });

  const saved = getSkill(id)!;
  res.status(existing ? 200 : 201).json(saved);
});

// DELETE /api/skills/:id
router.delete('/:id', (req: Request, res: Response) => {
  const skill = getSkill(req.params.id);
  if (!skill) { res.status(404).json({ error: 'Skill not found' }); return; }

  getDb().prepare('DELETE FROM skills WHERE id = ?').run(skill.id);
  enqueueSkillCommand(skill.runner_id, {
    action: 'delete',
    cli: skill.cli,
    name: skill.name,
  });

  res.json({ ok: true });
});

// POST /api/skills/:id/broadcast — copy this skill to other runners that have the matching CLI
router.post('/:id/broadcast', (req: Request, res: Response) => {
  const source = getSkill(req.params.id);
  if (!source) { res.status(404).json({ error: 'Skill not found' }); return; }

  const { runnerIds } = req.body as { runnerIds?: string[] };

  const allRunners = getDb().prepare('SELECT * FROM runners').all() as Runner[];
  const targets = allRunners.filter((r) => {
    if (r.id === source.runner_id) return false;
    let providers: string[] = [];
    try { providers = JSON.parse(r.ai_providers || '[]'); } catch { /* noop */ }
    if (!providers.includes(source.cli)) return false;
    if (runnerIds && runnerIds.length > 0) return runnerIds.includes(r.id);
    return true;
  });

  const db = getDb();
  const results: Array<{ runnerId: string; skillId: string; created: boolean }> = [];

  for (const runner of targets) {
    const existing = db
      .prepare('SELECT id FROM skills WHERE runner_id = ? AND cli = ? AND name = ?')
      .get(runner.id, source.cli, source.name) as { id: string } | undefined;

    const id = existing?.id ?? uuid();
    if (existing) {
      db.prepare(`
        UPDATE skills SET description = ?, content = ?, updated_at = datetime('now') WHERE id = ?
      `).run(source.description, source.content, existing.id);
    } else {
      db.prepare(`
        INSERT INTO skills (id, runner_id, cli, name, description, content) VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, runner.id, source.cli, source.name, source.description, source.content);
    }

    enqueueSkillCommand(runner.id, {
      action: 'write',
      cli: source.cli,
      name: source.name,
      description: source.description,
      content: source.content,
    });

    results.push({ runnerId: runner.id, skillId: id, created: !existing });
  }

  res.json({ broadcast: results.length, results });
});

// POST /api/skills/:id/resync — re-enqueue write for this skill's runner
router.post('/:id/resync', (req: Request, res: Response) => {
  const skill = getSkill(req.params.id);
  if (!skill) { res.status(404).json({ error: 'Skill not found' }); return; }

  enqueueSkillCommand(skill.runner_id, {
    action: 'write',
    cli: skill.cli,
    name: skill.name,
    description: skill.description,
    content: skill.content,
  });

  res.json({ ok: true });
});

export default router;

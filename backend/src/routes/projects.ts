import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, DEFAULT_PROJECT_ID } from '../db';
import { Project } from '../types';

const router = Router();

// GET /api/projects
router.get('/', (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM projects ORDER BY (id = ?) DESC, created_at DESC').all(DEFAULT_PROJECT_ID) as Project[];
  res.json(rows);
});

// POST /api/projects
router.post('/', (req: Request, res: Response) => {
  const { name, key, description } = req.body as { name?: string; key?: string; description?: string };
  if (!name || !key) { res.status(400).json({ error: 'name and key are required' }); return; }

  const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (normalizedKey.length < 2) { res.status(400).json({ error: 'key must be 2-6 alphanumeric characters' }); return; }

  const existing = getDb().prepare('SELECT id FROM projects WHERE key = ?').get(normalizedKey);
  if (existing) { res.status(409).json({ error: `Project key "${normalizedKey}" already exists` }); return; }

  const id = uuid();
  getDb().prepare(`
    INSERT INTO projects (id, name, key, description) VALUES (?, ?, ?, ?)
  `).run(id, name, normalizedKey, description ?? '');

  const project = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', (req: Request, res: Response) => {
  const project = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Project | undefined;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json(project);
});

// PUT /api/projects/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, description } = req.body as { name?: string; description?: string };
  const project = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Project | undefined;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  getDb().prepare(`
    UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?
  `).run(name ?? project.name, description ?? project.description, req.params.id);

  const updated = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Project;
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', (req: Request, res: Response) => {
  if (req.params.id === DEFAULT_PROJECT_ID) { res.status(403).json({ error: 'The default project cannot be deleted' }); return; }
  const result = getDb().prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json({ ok: true });
});

export default router;

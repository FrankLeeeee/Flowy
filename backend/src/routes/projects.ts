import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, DEFAULT_PROJECT_ID } from '../db';
import { Project } from '../types';
import { formatTaskKey, normalizeProjectName } from '../projectIdentity';

const router = Router();

// GET /api/projects
router.get('/', (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM projects ORDER BY (id = ?) DESC, created_at DESC').all(DEFAULT_PROJECT_ID) as Project[];
  res.json(rows);
});

// POST /api/projects
router.post('/', (req: Request, res: Response) => {
  const { name, description } = req.body as { name?: string; description?: string };
  const normalizedName = name ? normalizeProjectName(name) : '';
  if (!normalizedName) { res.status(400).json({ error: 'name is required' }); return; }

  const nameCollision = getDb().prepare(`
    SELECT id FROM projects WHERE lower(name) = lower(?)
  `).get(normalizedName);
  if (nameCollision) { res.status(409).json({ error: `Project name "${normalizedName}" already exists` }); return; }

  const id = uuid();
  getDb().prepare(`
    INSERT INTO projects (id, name, key, description) VALUES (?, ?, ?, ?)
  `).run(id, normalizedName, id, description ?? '');

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
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Project | undefined;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const normalizedName = name !== undefined ? normalizeProjectName(name) : project.name;
  if (!normalizedName) { res.status(400).json({ error: 'name is required' }); return; }

  const nameCollision = db.prepare(`
    SELECT id FROM projects WHERE id != ? AND lower(name) = lower(?)
  `).get(req.params.id, normalizedName);
  if (nameCollision) { res.status(409).json({ error: `Project name "${normalizedName}" already exists` }); return; }

  const projectTasks = db.prepare(`
    SELECT id, task_number FROM tasks WHERE project_id = ? ORDER BY task_number ASC
  `).all(req.params.id) as Array<{ id: string; task_number: number }>;

  const updateProject = db.transaction(() => {
    db.prepare(`
      UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?
    `).run(normalizedName, description ?? project.description, req.params.id);

    if (normalizedName !== project.name) {
      const updateTaskKey = db.prepare('UPDATE tasks SET task_key = ? WHERE id = ?');
      for (const task of projectTasks) {
        updateTaskKey.run(formatTaskKey(normalizedName, task.task_number), task.id);
      }
    }
  });

  updateProject();

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Project;
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

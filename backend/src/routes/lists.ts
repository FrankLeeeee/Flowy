import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { List } from '../types';
import { formatTaskKey, normalizeListName } from '../listIdentity';

const router = Router();

function normalizeIcon(icon: unknown): string | null {
  if (typeof icon !== 'string') return null;
  const trimmed = icon.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// GET /api/lists
router.get('/', (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM lists ORDER BY created_at DESC').all() as List[];
  res.json(rows);
});

// POST /api/lists
router.post('/', (req: Request, res: Response) => {
  const { name, description, icon } = req.body as { name?: string; description?: string; icon?: string | null };
  const normalizedName = name ? normalizeListName(name) : '';
  if (!normalizedName) { res.status(400).json({ error: 'name is required' }); return; }

  const nameCollision = getDb().prepare(`
    SELECT id FROM lists WHERE lower(name) = lower(?)
  `).get(normalizedName);
  if (nameCollision) { res.status(409).json({ error: `List name "${normalizedName}" already exists` }); return; }

  const id = uuid();
  getDb().prepare(`
    INSERT INTO lists (id, name, icon, description) VALUES (?, ?, ?, ?)
  `).run(id, normalizedName, normalizeIcon(icon), description ?? '');

  const list = getDb().prepare('SELECT * FROM lists WHERE id = ?').get(id) as List;
  res.status(201).json(list);
});

// GET /api/lists/:id
router.get('/:id', (req: Request, res: Response) => {
  const list = getDb().prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id) as List | undefined;
  if (!list) { res.status(404).json({ error: 'List not found' }); return; }
  res.json(list);
});

// PUT /api/lists/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, description, icon } = req.body as { name?: string; description?: string; icon?: string | null };
  const db = getDb();
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id) as List | undefined;
  if (!list) { res.status(404).json({ error: 'List not found' }); return; }

  const normalizedName = name !== undefined ? normalizeListName(name) : list.name;
  if (!normalizedName) { res.status(400).json({ error: 'name is required' }); return; }

  const nameCollision = db.prepare(`
    SELECT id FROM lists WHERE id != ? AND lower(name) = lower(?)
  `).get(req.params.id, normalizedName);
  if (nameCollision) { res.status(409).json({ error: `List name "${normalizedName}" already exists` }); return; }

  const nextIcon = icon === undefined ? list.icon : normalizeIcon(icon);
  const nextDescription = description ?? list.description;

  const listTasks = db.prepare(`
    SELECT id, task_number FROM tasks WHERE list_id = ? ORDER BY task_number ASC
  `).all(req.params.id) as Array<{ id: string; task_number: number }>;

  const updateList = db.transaction(() => {
    db.prepare(`
      UPDATE lists SET name = ?, description = ?, icon = ?, updated_at = datetime('now') WHERE id = ?
    `).run(normalizedName, nextDescription, nextIcon, req.params.id);

    if (normalizedName !== list.name) {
      const updateTaskKey = db.prepare('UPDATE tasks SET task_key = ? WHERE id = ?');
      for (const task of listTasks) {
        updateTaskKey.run(formatTaskKey(normalizedName, task.task_number), task.id);
      }
    }
  });

  updateList();

  const updated = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id) as List;
  res.json(updated);
});

// DELETE /api/lists/:id
router.delete('/:id', (req: Request, res: Response) => {
  const result = getDb().prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
  if (result.changes === 0) { res.status(404).json({ error: 'List not found' }); return; }
  res.json({ ok: true });
});

export default router;

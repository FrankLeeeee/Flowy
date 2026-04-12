import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { Label } from '../types';

const router = Router();

// GET /api/labels
router.get('/', (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM labels ORDER BY name ASC').all() as Label[];
  res.json(rows);
});

// POST /api/labels
router.post('/', (req: Request, res: Response) => {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM labels WHERE LOWER(name) = LOWER(?)').get(name);
  if (existing) { res.status(409).json({ error: 'A label with that name already exists' }); return; }

  const id = uuid();
  db.prepare('INSERT INTO labels (id, name, color) VALUES (?, ?, ?)').run(id, name.trim(), color ?? 'blue');
  const label = db.prepare('SELECT * FROM labels WHERE id = ?').get(id) as Label;
  res.status(201).json(label);
});

// PUT /api/labels/:id
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const label = db.prepare('SELECT * FROM labels WHERE id = ?').get(req.params.id) as Label | undefined;
  if (!label) { res.status(404).json({ error: 'Label not found' }); return; }

  const { name, color } = req.body as { name?: string; color?: string };

  if (name && name.trim().toLowerCase() !== label.name.toLowerCase()) {
    const dup = db.prepare('SELECT id FROM labels WHERE LOWER(name) = LOWER(?) AND id != ?').get(name.trim(), req.params.id);
    if (dup) { res.status(409).json({ error: 'A label with that name already exists' }); return; }
  }

  const oldName = label.name;
  const newName = name?.trim() ?? label.name;

  db.prepare("UPDATE labels SET name = ?, color = ?, updated_at = datetime('now') WHERE id = ?")
    .run(newName, color ?? label.color, req.params.id);

  // Update label name in all tasks that reference it
  if (newName !== oldName) {
    const tasks = db.prepare('SELECT id, labels FROM tasks').all() as Array<{ id: string; labels: string }>;
    for (const task of tasks) {
      const taskLabels: string[] = JSON.parse(task.labels || '[]');
      const idx = taskLabels.findIndex((l) => l.toLowerCase() === oldName.toLowerCase());
      if (idx !== -1) {
        taskLabels[idx] = newName;
        db.prepare("UPDATE tasks SET labels = ?, updated_at = datetime('now') WHERE id = ?")
          .run(JSON.stringify(taskLabels), task.id);
      }
    }
  }

  const updated = db.prepare('SELECT * FROM labels WHERE id = ?').get(req.params.id) as Label;
  res.json(updated);
});

// DELETE /api/labels/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const label = db.prepare('SELECT * FROM labels WHERE id = ?').get(req.params.id) as Label | undefined;
  if (!label) { res.status(404).json({ error: 'Label not found' }); return; }

  // Remove this label from all tasks
  const tasks = db.prepare('SELECT id, labels FROM tasks').all() as Array<{ id: string; labels: string }>;
  for (const task of tasks) {
    const taskLabels: string[] = JSON.parse(task.labels || '[]');
    const filtered = taskLabels.filter((l) => l.toLowerCase() !== label.name.toLowerCase());
    if (filtered.length !== taskLabels.length) {
      db.prepare("UPDATE tasks SET labels = ?, updated_at = datetime('now') WHERE id = ?")
        .run(JSON.stringify(filtered), task.id);
    }
  }

  db.prepare('DELETE FROM labels WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { Template } from '../types';
import { utcNow } from '../time';

const router = Router();

// GET /api/templates
router.get('/', (req: Request, res: Response) => {
  const { list } = req.query as { list?: string };
  if (list) {
    const rows = getDb().prepare('SELECT * FROM templates WHERE list_id = ? ORDER BY name ASC').all(list) as Template[];
    res.json(rows);
  } else {
    const rows = getDb().prepare('SELECT * FROM templates ORDER BY name ASC').all() as Template[];
    res.json(rows);
  }
});

// GET /api/templates/:id
router.get('/:id', (req: Request, res: Response) => {
  const template = getDb().prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as Template | undefined;
  if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
  res.json(template);
});

// POST /api/templates
router.post('/', (req: Request, res: Response) => {
  const { name, description, listId, content } = req.body as {
    name?: string; description?: string; listId?: string | null; content?: string;
  };
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

  if (listId) {
    const list = getDb().prepare('SELECT id FROM lists WHERE id = ?').get(listId);
    if (!list) { res.status(400).json({ error: 'List not found' }); return; }
  }

  const id = uuid();
  const now = utcNow();
  getDb().prepare(`
    INSERT INTO templates (id, name, description, list_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), description?.trim() ?? '', listId ?? null, content ?? '', now, now);

  const template = getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template;
  res.status(201).json(template);
});

// PUT /api/templates/:id
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as Template | undefined;
  if (!template) { res.status(404).json({ error: 'Template not found' }); return; }

  const { name, description, listId, content } = req.body as {
    name?: string; description?: string; listId?: string | null; content?: string;
  };

  if (listId) {
    const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(listId);
    if (!list) { res.status(400).json({ error: 'List not found' }); return; }
  }

  const nextName = name !== undefined ? name.trim() : template.name;
  if (!nextName) { res.status(400).json({ error: 'name is required' }); return; }

  db.prepare(`
    UPDATE templates SET name = ?, description = ?, list_id = ?, content = ?, updated_at = ? WHERE id = ?
  `).run(
    nextName,
    description !== undefined ? description.trim() : template.description,
    listId !== undefined ? (listId ?? null) : template.list_id,
    content !== undefined ? content : template.content,
    utcNow(),
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as Template;
  res.json(updated);
});

// DELETE /api/templates/:id
router.delete('/:id', (req: Request, res: Response) => {
  const result = getDb().prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  if (result.changes === 0) { res.status(404).json({ error: 'Template not found' }); return; }
  res.json({ ok: true });
});

export default router;

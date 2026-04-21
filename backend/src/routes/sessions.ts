import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { Session, SessionMessage } from '../types';
import { normalizeHarnessConfig } from '../harnessConfig';
import { enqueueSessionCommand } from './sessionCommandQueue';

const router = Router();

// GET /api/sessions — list all sessions (most recent first)
router.get('/', (_req: Request, res: Response) => {
  const rows = getDb()
    .prepare('SELECT * FROM sessions ORDER BY updated_at DESC')
    .all() as Session[];
  res.json(rows);
});

// POST /api/sessions — create a session
router.post('/', (req: Request, res: Response) => {
  const { title, runnerId, aiProvider, harnessConfig } = req.body as {
    title?: string; runnerId?: string; aiProvider?: string; harnessConfig?: unknown;
  };
  if (!runnerId || !aiProvider) {
    res.status(400).json({ error: 'runnerId and aiProvider are required' });
    return;
  }

  const db = getDb();
  const runner = db.prepare('SELECT id FROM runners WHERE id = ?').get(runnerId);
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }

  const id = uuid();
  db.prepare(`
    INSERT INTO sessions (id, title, runner_id, ai_provider, harness_config)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    id,
    title?.trim() || 'New session',
    runnerId,
    aiProvider,
    normalizeHarnessConfig(harnessConfig),
  );

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session;
  res.status(201).json(session);
});

// GET /api/sessions/:id — session detail with messages
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as Session | undefined;
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const messages = db
    .prepare('SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC')
    .all(req.params.id) as SessionMessage[];

  res.json({ session, messages });
});

// GET /api/sessions/:id/messages?since=ISO
router.get('/:id/messages', (req: Request, res: Response) => {
  const since = (req.query.since as string) || '';
  const db = getDb();
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const messages = since
    ? db
        .prepare(
          `SELECT * FROM session_messages WHERE session_id = ? AND created_at > ? ORDER BY created_at ASC, id ASC`,
        )
        .all(req.params.id, since) as SessionMessage[]
    : db
        .prepare(
          `SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC`,
        )
        .all(req.params.id) as SessionMessage[];
  res.json(messages);
});

// POST /api/sessions/:id/input — user sends a prompt
router.post('/:id/input', (req: Request, res: Response) => {
  const { content } = req.body as { content?: string };
  if (!content || !content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as Session | undefined;
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.status === 'stopped') { res.status(409).json({ error: 'Session is stopped' }); return; }
  if (session.status === 'busy') { res.status(409).json({ error: 'Session is busy' }); return; }

  const messages = db
    .prepare('SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC')
    .all(session.id) as SessionMessage[];

  const userMessageId = uuid();
  const assistantMessageId = uuid();

  db.transaction(() => {
    db.prepare(
      'INSERT INTO session_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
    ).run(userMessageId, session.id, 'user', content);

    db.prepare(
      'INSERT INTO session_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
    ).run(assistantMessageId, session.id, 'assistant', '');

    db.prepare(
      "UPDATE sessions SET status = 'busy', updated_at = datetime('now') WHERE id = ?",
    ).run(session.id);
  })();

  const history = messages.map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: 'user', content });

  enqueueSessionCommand(session.runner_id, {
    sessionId: session.id,
    kind: 'send-prompt',
    payload: {
      aiProvider: session.ai_provider,
      harnessConfig: session.harness_config,
      history,
      prompt: content,
      assistantMessageId,
    },
  });

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as Session;
  res.json(updated);
});

// POST /api/sessions/:id/stop — kill an active turn / mark stopped
router.post('/:id/stop', (req: Request, res: Response) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as Session | undefined;
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  db.prepare(
    "UPDATE sessions SET status = 'stopped', updated_at = datetime('now') WHERE id = ?",
  ).run(session.id);

  enqueueSessionCommand(session.runner_id, {
    sessionId: session.id,
    kind: 'stop',
    payload: {},
  });

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as Session;
  res.json(updated);
});

// DELETE /api/sessions/:id — delete (cascade removes messages)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as Session | undefined;
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  enqueueSessionCommand(session.runner_id, {
    sessionId: session.id,
    kind: 'stop',
    payload: {},
  });

  db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
  res.json({ ok: true });
});

export default router;

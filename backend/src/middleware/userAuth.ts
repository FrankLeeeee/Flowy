import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';

export function requireUserAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.flowy_session as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const row = getDb()
    .prepare(`SELECT token FROM user_sessions WHERE token = ? AND expires_at > datetime('now')`)
    .get(token) as { token: string } | undefined;

  if (!row) {
    res.status(401).json({ error: 'Session expired or invalid' });
    return;
  }

  next();
}

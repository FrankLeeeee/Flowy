import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';

export interface AuthenticatedRunner {
  id: string;
  name: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      runner?: AuthenticatedRunner;
    }
  }
}

export function authenticateRunner(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = auth.slice(7);
  const db = getDb();
  const row = db.prepare('SELECT id, name, status FROM runners WHERE token = ?').get(token) as AuthenticatedRunner | undefined;

  if (!row) {
    res.status(401).json({ error: 'Invalid runner token' });
    return;
  }

  req.runner = row;
  next();
}

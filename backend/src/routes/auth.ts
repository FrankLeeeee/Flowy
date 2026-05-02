import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { getDb, getDbSetting, setDbSetting } from '../db';
import { requireUserAuth } from '../middleware/userAuth';

const router = Router();

// 10 attempts per IP per 15 minutes — prevents brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;
const COOKIE_NAME = 'flowy_session';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
};

function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  getDb()
    .prepare('INSERT INTO user_sessions (token, expires_at) VALUES (?, ?)')
    .run(token, expiresAt);
  return token;
}

// GET /api/auth/status
router.get('/status', (req: Request, res: Response) => {
  const passwordHash = getDbSetting('auth.passwordHash');
  if (!passwordHash) {
    res.json({ authenticated: false, setupRequired: true });
    return;
  }

  const token = req.cookies?.flowy_session as string | undefined;
  if (!token) {
    res.json({ authenticated: false, setupRequired: false });
    return;
  }

  const row = getDb()
    .prepare(`SELECT token FROM user_sessions WHERE token = ? AND expires_at > datetime('now')`)
    .get(token) as { token: string } | undefined;

  res.json({ authenticated: !!row, setupRequired: false });
});

// POST /api/auth/setup — first-time password creation
router.post('/setup', loginLimiter, async (req: Request, res: Response) => {
  if (getDbSetting('auth.passwordHash')) {
    res.status(403).json({ error: 'Password already configured' });
    return;
  }

  const { password } = req.body as { password?: string };
  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  setDbSetting('auth.passwordHash', hash);

  const token = createSession();
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({ ok: true });
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const passwordHash = getDbSetting('auth.passwordHash');
  if (!passwordHash) {
    res.status(400).json({ error: 'Setup required' });
    return;
  }

  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  const token = createSession();
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({ ok: true });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.flowy_session as string | undefined;
  if (token) {
    getDb().prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// PUT /api/auth/password — change password (requires active session)
router.put('/password', requireUserAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const passwordHash = getDbSetting('auth.passwordHash');
  if (!passwordHash || !(await bcrypt.compare(currentPassword, passwordHash))) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  setDbSetting('auth.passwordHash', await bcrypt.hash(newPassword, SALT_ROUNDS));

  // Invalidate all other sessions so stolen sessions can't linger
  const currentToken = req.cookies?.flowy_session as string;
  getDb().prepare('DELETE FROM user_sessions WHERE token != ?').run(currentToken);

  res.json({ ok: true });
});

export default router;

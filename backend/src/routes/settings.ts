import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { loadSettings, saveSettings, maskKey, isMasked } from '../storage';
import { getDbSetting } from '../db';
import { Settings } from '../types';

const router = Router();

// Throttle reveal attempts so a stolen session can't grind the password.
const revealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

function maskedSettings(s: Settings) {
  return {
    runner:     { registrationSecret: maskKey(s.runner.registrationSecret) },
  };
}

// GET /api/settings
router.get('/', (_req: Request, res: Response) => {
  res.json(maskedSettings(loadSettings()));
});

// POST /api/settings/runner-secret/reveal
// Requires the user's current password to return the unmasked secret.
router.post('/runner-secret/reveal', revealLimiter, async (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  const passwordHash = getDbSetting('auth.passwordHash');
  if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  const settings = loadSettings();
  res.json({ registrationSecret: settings.runner.registrationSecret });
});

// PUT /api/settings
router.put('/', (req: Request, res: Response) => {
  const current = loadSettings();
  const body = req.body as Partial<Settings>;

  if (body.runner) {
    if (!isMasked(body.runner.registrationSecret)) {
      const nextSecret = body.runner.registrationSecret!.trim();
      if (!nextSecret) {
        res.status(400).json({ error: 'registrationSecret is required' });
        return;
      }
      current.runner.registrationSecret = nextSecret;
    }
  }

  saveSettings(current);
  res.json(maskedSettings(current));
});

export default router;

import { Router, Request, Response } from 'express';
import { loadSettings, saveSettings, maskKey, isMasked } from '../storage';
import { Settings } from '../types';

const router = Router();

function maskedSettings(s: Settings) {
  return {
    runner:     { registrationSecret: maskKey(s.runner.registrationSecret) },
  };
}

// GET /api/settings
router.get('/', (_req: Request, res: Response) => {
  res.json(maskedSettings(loadSettings()));
});

// GET /api/settings/runner-secret
router.get('/runner-secret', (_req: Request, res: Response) => {
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

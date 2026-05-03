import { Router, Request, Response } from 'express';
import { loadSettings, maskKey } from '../storage';
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

// GET /api/settings/runner-secret — authenticated access for copy/setup flows.
router.get('/runner-secret', (_req: Request, res: Response) => {
  res.json({ registrationSecret: loadSettings().runner.registrationSecret });
});

// PUT /api/settings
router.put('/', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Runner registration secret is generated automatically and cannot be changed.',
  });
});

export default router;

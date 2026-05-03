import { Router, Request, Response } from 'express';
import {
  loadSettings,
  maskKey,
  saveSettings,
  isValidRunnerSecret,
  generateRunnerSecret,
} from '../storage';
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
router.put('/', (req: Request, res: Response) => {
  const body = req.body as {
    runner?: {
      registrationSecret?: string;
      regenerate?: boolean;
    };
  };
  const shouldRegenerate = body.runner?.regenerate === true;
  const providedSecret = body.runner?.registrationSecret?.trim();

  if (!shouldRegenerate && !providedSecret) {
    res.status(400).json({
      error: 'runner.registrationSecret is required unless runner.regenerate is true.',
    });
    return;
  }

  const nextSecret = shouldRegenerate ? generateRunnerSecret() : providedSecret;
  if (!isValidRunnerSecret(nextSecret)) {
    res.status(400).json({
      error: 'runner.registrationSecret must be between 12 and 30 characters.',
    });
    return;
  }

  saveSettings({ runner: { registrationSecret: nextSecret } });
  res.json(maskedSettings(loadSettings()));
});

export default router;

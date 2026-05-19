import { Router, Request, Response } from 'express';
import { spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = Router();

function getLocalVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));
    return pkg.version ?? '';
  } catch {
    return '';
  }
}

function getLatestNpmVersion(packageName: string): string | null {
  try {
    const result = spawnSync('npm', ['view', packageName, 'version'], {
      encoding: 'utf-8',
      timeout: 15_000,
    });
    if (result.status !== 0) return null;
    return result.stdout.trim() || null;
  } catch {
    return null;
  }
}

// GET /api/version — current + latest version info
router.get('/', (_req: Request, res: Response) => {
  const current = getLocalVersion();
  const latest = getLatestNpmVersion('@frankleeeee/flowy');
  const updateAvailable = Boolean(latest && current && latest !== current);
  res.json({ current, latest, updateAvailable });
});

// POST /api/version/update — update the hub to latest and restart
router.post('/update', (_req: Request, res: Response) => {
  const result = spawnSync('npm', ['i', '-g', '@frankleeeee/flowy@latest'], {
    encoding: 'utf-8',
    timeout: 120_000,
    env: { ...process.env, CI: '1' },
  });

  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    res.status(500).json({ error: `Update failed: ${output || `exit ${result.status}`}` });
    return;
  }

  res.json({ ok: true, message: 'Update installed. Restarting...' });

  setTimeout(() => {
    const child = spawn(process.argv[0], process.argv.slice(1), {
      stdio: 'inherit',
      detached: true,
      env: process.env,
    });
    child.unref();
    process.exit(0);
  }, 500);
});

export default router;

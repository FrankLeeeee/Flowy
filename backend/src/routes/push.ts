import { Router, Request, Response } from 'express';
import { getVapidPublicKey, saveSubscription, removeSubscription } from '../pushService';

const router = Router();

router.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: getVapidPublicKey() });
});

router.post('/subscribe', (req: Request, res: Response) => {
  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }

  saveSubscription({ endpoint, keys });
  res.json({ ok: true });
});

router.post('/unsubscribe', (req: Request, res: Response) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) {
    res.status(400).json({ error: 'endpoint is required' });
    return;
  }

  removeSubscription(endpoint);
  res.json({ ok: true });
});

export default router;

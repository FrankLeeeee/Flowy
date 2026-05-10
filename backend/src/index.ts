import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRouter      from './routes/auth';
import settingsRouter  from './routes/settings';
import listsRouter     from './routes/lists';
import tasksRouter     from './routes/tasks';
import runnersRouter   from './routes/runners';
import labelsRouter    from './routes/labels';
import skillsRouter    from './routes/skills';
import templatesRouter from './routes/templates';
import statsRouter     from './routes/stats';
import sessionsRouter  from './routes/sessions';
import pushRouter      from './routes/push';
import { initDb }      from './db';
import { DATA_DIR }    from './dataDir';
import { loadSettings } from './storage';
import { requireUserAuth } from './middleware/userAuth';
import { initPush }    from './pushService';
import { attachSessionWs } from './sessionWs';

const app  = express();
const PORT = process.env.PORT ?? 3001;

// Conservative security headers. Skipping CSP because the bundled SPA uses
// inline styles and a full policy needs per-build hashing.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(cors(buildCorsOptions()));

// Tight body limit on auth/settings endpoints to prevent CPU-amplification
// attacks against bcrypt and password handling. Mounted before the global
// 10mb parser so these route prefixes use the smaller cap.
app.use(['/api/auth', '/api/settings'], express.json({ limit: '16kb' }));

function buildCorsOptions(): cors.CorsOptions {
  // Production with no explicit --cors flag: same-origin only.
  if (process.env.NODE_ENV === 'production' && !process.env.CORS) {
    return {};
  }

  // Production with --cors=<allowlist>: only echo origins in the allowlist.
  if (process.env.NODE_ENV === 'production') {
    const allowlist = process.env.CORS!.split(',').map((s) => s.trim()).filter(Boolean);
    return {
      origin: (origin, cb) => {
        // Same-origin / curl / native app requests have no Origin header.
        if (!origin) return cb(null, true);
        if (allowlist.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not in --cors allowlist`));
      },
      credentials: true,
    };
  }

  // Dev: localhost only. Dev still needs credentials for the cookie session.
  return {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
          return cb(null, true);
        }
      } catch { /* fall through */ }
      return cb(new Error(`Origin ${origin} not allowed in dev (localhost only)`));
    },
    credentials: true,
  };
}
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

initDb();
loadSettings();
initPush();

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth',     authRouter);

// All user-facing routes require an authenticated session
app.use('/api/settings', requireUserAuth, settingsRouter);
app.use('/api/lists',    requireUserAuth, listsRouter);
app.use('/api/tasks',    requireUserAuth, tasksRouter);
app.use('/api/labels',   requireUserAuth, labelsRouter);
app.use('/api/skills',     requireUserAuth, skillsRouter);
app.use('/api/templates',  requireUserAuth, templatesRouter);
app.use('/api/stats',      requireUserAuth, statsRouter);
app.use('/api/sessions', requireUserAuth, sessionsRouter);
app.use('/api/push',     requireUserAuth, pushRouter);

// Runners router manages its own auth internally (runner Bearer + user session per endpoint)
app.use('/api/runners',  runnersRouter);

// In production, serve the bundled frontend
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, 'public');

  // The service worker file must never be HTTP-cached, otherwise browsers
  // can serve a stale SW after a redeploy and updates appear lost. Hashed
  // bundles in /assets are content-addressed so they're safe to cache long.
  app.use(express.static(dist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.endsWith('.html') || filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

const server = createServer(app);
attachSessionWs(server);

server.listen(PORT, () => {
  console.log(`Flowy → http://localhost:${PORT}`);
  console.log(`Data  → ${DATA_DIR}`);
});

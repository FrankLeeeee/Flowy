import express from 'express';
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
import statsRouter     from './routes/stats';
import sessionsRouter  from './routes/sessions';
import { initDb }      from './db';
import { DATA_DIR }    from './dataDir';
import { requireUserAuth } from './middleware/userAuth';

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors(process.env.NODE_ENV === 'production' ? {} : { origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

initDb();

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth',     authRouter);

// All user-facing routes require an authenticated session
app.use('/api/settings', requireUserAuth, settingsRouter);
app.use('/api/lists',    requireUserAuth, listsRouter);
app.use('/api/tasks',    requireUserAuth, tasksRouter);
app.use('/api/labels',   requireUserAuth, labelsRouter);
app.use('/api/skills',   requireUserAuth, skillsRouter);
app.use('/api/stats',    requireUserAuth, statsRouter);
app.use('/api/sessions', requireUserAuth, sessionsRouter);

// Runners router manages its own auth internally (runner Bearer + user session per endpoint)
app.use('/api/runners',  runnersRouter);

// In production, serve the bundled frontend
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, 'public');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Flowy → http://localhost:${PORT}`);
  console.log(`Data  → ${DATA_DIR}`);
});

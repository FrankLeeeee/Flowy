import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import settingsRouter  from './routes/settings';
import projectsRouter  from './routes/projects';
import tasksRouter     from './routes/tasks';
import runnersRouter   from './routes/runners';
import { initDb }      from './db';

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

initDb();

app.use('/api/settings', settingsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks',    tasksRouter);
app.use('/api/runners',  runnersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// In production, serve the Vite build
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`My-Hub backend  → http://localhost:${PORT}`);
  console.log(`Settings        → ${path.join(os.homedir(), '.config', 'my-hub', 'settings.json')}`);
});

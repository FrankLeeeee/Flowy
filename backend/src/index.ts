import express from 'express';
import cors from 'cors';
import path from 'path';
import settingsRouter  from './routes/settings';
import projectsRouter  from './routes/projects';
import tasksRouter     from './routes/tasks';
import runnersRouter   from './routes/runners';
import labelsRouter    from './routes/labels';
import { initDb }      from './db';
import { DATA_DIR }    from './dataDir';

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors(process.env.NODE_ENV === 'production' ? {} : { origin: 'http://localhost:5173' }));
app.use(express.json());

initDb();

app.use('/api/settings', settingsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks',    tasksRouter);
app.use('/api/runners',  runnersRouter);
app.use('/api/labels',   labelsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

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

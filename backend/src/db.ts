import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { formatTaskKey, normalizeProjectName } from './projectIdentity';
import { DATA_DIR, ensureDataDir } from './dataDir';

const DB_DIR = DATA_DIR;
const DB_FILE = path.join(DB_DIR, 'hub.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialised — call initDb() first');
  return db;
}

export function initDb(): void {
  ensureDataDir();
  fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate();
  startOfflineChecker();
}

function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      key           TEXT NOT NULL UNIQUE,
      description   TEXT NOT NULL DEFAULT '',
      next_task_num INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS runners (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      token          TEXT NOT NULL UNIQUE,
      status         TEXT NOT NULL DEFAULT 'offline'
                     CHECK (status IN ('online','offline','busy')),
      ai_providers   TEXT NOT NULL DEFAULT '[]',
      last_heartbeat TEXT,
      device_info    TEXT NOT NULL DEFAULT '',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_number   INTEGER NOT NULL,
      task_key      TEXT NOT NULL UNIQUE,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'backlog'
                    CHECK (status IN ('backlog','todo','in_progress','failed','done','cancelled')),
      priority      TEXT NOT NULL DEFAULT 'none'
                    CHECK (priority IN ('urgent','high','medium','low','none')),
      runner_id     TEXT REFERENCES runners(id) ON DELETE SET NULL,
      ai_provider   TEXT CHECK (ai_provider IN ('claude-code','codex','cursor-agent','gemini-cli') OR ai_provider IS NULL),
      harness_config TEXT NOT NULL DEFAULT '{}',
      labels        TEXT NOT NULL DEFAULT '[]',
      output        TEXT,
      started_at    TEXT,
      completed_at  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_logs (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      runner_id  TEXT NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
      event      TEXT NOT NULL CHECK (event IN ('picked_up','output','completed','failed','cancelled')),
      data       TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      runner_id      TEXT NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
      ai_provider    TEXT NOT NULL CHECK (ai_provider IN ('claude-code','codex','cursor-agent','gemini-cli')),
      harness_config TEXT NOT NULL DEFAULT '{}',
      status         TEXT NOT NULL DEFAULT 'idle'
                     CHECK (status IN ('idle','busy','stopped')),
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_runner_id ON sessions(runner_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

    CREATE TABLE IF NOT EXISTS session_messages (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
      content    TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);

    CREATE TABLE IF NOT EXISTS labels (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      color      TEXT NOT NULL DEFAULT 'blue',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

  `);

  seedDefaultLabels();

  migrateTaskStatuses();
  migrateAddGeminiProvider();
  migrateAddGeminiProviderToSessions();
  ensureColumn('runners', 'last_cli_scan_at', 'TEXT');
  ensureColumn('runners', 'cli_refresh_requested_at', 'TEXT');
  ensureColumn('tasks', 'harness_config', `TEXT NOT NULL DEFAULT '{}'`);
  ensureColumn('tasks', 'scheduled_at', 'TEXT');
  seedDefaultProject();
  normalizeProjectNames();
  ensureUniqueProjectNamesIndex();
  migrateTaskKeysToProjectNames();
}

/** Well-known ID for the non-deletable default project. */
export const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000000';

function seedDefaultProject(): void {
  const exists = db.prepare('SELECT id FROM projects WHERE id = ?').get(DEFAULT_PROJECT_ID);
  if (!exists) {
    db.prepare(`
      INSERT INTO projects (id, name, key, description) VALUES (?, ?, ?, ?)
    `).run(DEFAULT_PROJECT_ID, 'default', 'DEFAULT', '');
  }
}

function normalizeProjectNames(): void {
  const projects = db.prepare('SELECT id, name FROM projects').all() as Array<{ id: string; name: string }>;
  const updateProjectName = db.prepare('UPDATE projects SET name = ? WHERE id = ?');
  const normalize = db.transaction(() => {
    for (const project of projects) {
      const normalizedName = normalizeProjectName(project.name);
      if (normalizedName && normalizedName !== project.name) {
        updateProjectName.run(normalizedName, project.id);
      }
    }
  });

  normalize();
}

function ensureUniqueProjectNamesIndex(): void {
  const duplicates = db.prepare(`
    SELECT lower(name) AS normalized_name, COUNT(*) AS count
    FROM projects
    GROUP BY lower(name)
    HAVING COUNT(*) > 1
  `).all() as Array<{ normalized_name: string; count: number }>;

  if (duplicates.length > 0) return;
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_unique ON projects(name COLLATE NOCASE)');
}

const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
  { name: 'Bug',           color: 'red' },
  { name: 'Fix',           color: 'orange' },
  { name: 'Feature',       color: 'blue' },
  { name: 'Improvement',   color: 'emerald' },
  { name: 'Refactor',      color: 'violet' },
  { name: 'Documentation', color: 'gray' },
  { name: 'Design',        color: 'pink' },
  { name: 'Testing',       color: 'amber' },
  { name: 'Performance',   color: 'teal' },
  { name: 'Security',      color: 'red-dark' },
  { name: 'DevOps',        color: 'cyan' },
  { name: 'Chore',         color: 'slate' },
];

function seedDefaultLabels(): void {
  const count = (db.prepare('SELECT COUNT(*) AS cnt FROM labels').get() as { cnt: number }).cnt;
  if (count > 0) return;

  const insert = db.prepare('INSERT INTO labels (id, name, color) VALUES (?, ?, ?)');
  const seed = db.transaction(() => {
    for (const label of DEFAULT_LABELS) {
      insert.run(uuid(), label.name, label.color);
    }
  });
  seed();
}

function migrateTaskStatuses(): void {
  const table = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type = 'table' AND name = 'tasks'
  `).get() as { sql?: string } | undefined;

  if (table?.sql?.includes("'failed'")) return;

  db.exec(`
    CREATE TABLE tasks_new (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_number   INTEGER NOT NULL,
      task_key      TEXT NOT NULL UNIQUE,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'backlog'
                    CHECK (status IN ('backlog','todo','in_progress','failed','done','cancelled')),
      priority      TEXT NOT NULL DEFAULT 'none'
                    CHECK (priority IN ('urgent','high','medium','low','none')),
      runner_id     TEXT REFERENCES runners(id) ON DELETE SET NULL,
      ai_provider   TEXT CHECK (ai_provider IN ('claude-code','codex','cursor-agent','gemini-cli') OR ai_provider IS NULL),
      harness_config TEXT NOT NULL DEFAULT '{}',
      labels        TEXT NOT NULL DEFAULT '[]',
      output        TEXT,
      started_at    TEXT,
      completed_at  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO tasks_new (
      id, project_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, harness_config, labels, output, started_at, completed_at, created_at, updated_at
    )
    SELECT
      id, project_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, '{}' AS harness_config, labels, output, started_at, completed_at, created_at, updated_at
    FROM tasks;

    DROP TABLE tasks;
    ALTER TABLE tasks_new RENAME TO tasks;

    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_runner_id ON tasks(runner_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
}

function migrateAddGeminiProvider(): void {
  const table = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type = 'table' AND name = 'tasks'
  `).get() as { sql?: string } | undefined;

  if (table?.sql?.includes("'gemini-cli'")) return;

  db.exec(`
    CREATE TABLE tasks_new (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_number   INTEGER NOT NULL,
      task_key      TEXT NOT NULL UNIQUE,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'backlog'
                    CHECK (status IN ('backlog','todo','in_progress','failed','done','cancelled')),
      priority      TEXT NOT NULL DEFAULT 'none'
                    CHECK (priority IN ('urgent','high','medium','low','none')),
      runner_id     TEXT REFERENCES runners(id) ON DELETE SET NULL,
      ai_provider   TEXT CHECK (ai_provider IN ('claude-code','codex','cursor-agent','gemini-cli') OR ai_provider IS NULL),
      harness_config TEXT NOT NULL DEFAULT '{}',
      labels        TEXT NOT NULL DEFAULT '[]',
      output        TEXT,
      started_at    TEXT,
      completed_at  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO tasks_new (
      id, project_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, harness_config, labels, output, started_at, completed_at, created_at, updated_at
    )
    SELECT
      id, project_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, harness_config, labels, output, started_at, completed_at, created_at, updated_at
    FROM tasks;

    DROP TABLE tasks;
    ALTER TABLE tasks_new RENAME TO tasks;

    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_runner_id ON tasks(runner_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
}

function migrateAddGeminiProviderToSessions(): void {
  const table = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type = 'table' AND name = 'sessions'
  `).get() as { sql?: string } | undefined;

  if (table?.sql?.includes("'gemini-cli'")) return;

  // Foreign keys must be OFF while we drop and recreate the table because
  // session_messages has a FK reference to sessions.
  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE sessions_new (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      runner_id      TEXT NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
      ai_provider    TEXT NOT NULL CHECK (ai_provider IN ('claude-code','codex','cursor-agent','gemini-cli')),
      harness_config TEXT NOT NULL DEFAULT '{}',
      status         TEXT NOT NULL DEFAULT 'idle'
                     CHECK (status IN ('idle','busy','stopped')),
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO sessions_new (id, title, runner_id, ai_provider, harness_config, status, created_at, updated_at)
    SELECT id, title, runner_id, ai_provider, harness_config, status, created_at, updated_at
    FROM sessions;

    DROP TABLE sessions;
    ALTER TABLE sessions_new RENAME TO sessions;

    CREATE INDEX IF NOT EXISTS idx_sessions_runner_id ON sessions(runner_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
  `);
  db.pragma('foreign_keys = ON');
}

function ensureColumn(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateTaskKeysToProjectNames(): void {
  const tasks = db.prepare(`
    SELECT t.id, t.task_number, p.name AS project_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    ORDER BY t.created_at ASC, t.id ASC
  `).all() as Array<{ id: string; task_number: number; project_name: string }>;

  const updateTaskKey = db.prepare('UPDATE tasks SET task_key = ? WHERE id = ?');
  const migrateTaskKeys = db.transaction(() => {
    for (const task of tasks) {
      updateTaskKey.run(formatTaskKey(task.project_name, task.task_number), task.id);
    }
  });

  try {
    migrateTaskKeys();
  } catch {
    // Preserve existing task keys if legacy data would make the generated names collide.
  }
}

// ── Settings helpers ─────────────────────────────────────────────────────

export function getDbSetting(key: string): string | undefined {
  if (!db) return undefined;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setDbSetting(key: string, value: string): void {
  if (!db) return;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

/** Mark runners as offline if heartbeat is stale (>90 seconds). */
function startOfflineChecker(): void {
  setInterval(() => {
    db.prepare(`
      UPDATE runners SET status = 'offline', updated_at = datetime('now')
      WHERE status != 'offline'
        AND last_heartbeat IS NOT NULL
        AND (julianday('now') - julianday(last_heartbeat)) * 86400 > 90
    `).run();
  }, 60_000);
}

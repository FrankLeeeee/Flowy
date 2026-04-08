import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const DB_DIR = path.join(os.homedir(), '.config', 'my-hub');
const DB_FILE = path.join(DB_DIR, 'hub.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialised — call initDb() first');
  return db;
}

export function initDb(): void {
  const fs = require('fs');
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
      ai_provider   TEXT CHECK (ai_provider IN ('claude-code','codex','cursor-agent') OR ai_provider IS NULL),
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

  migrateTaskStatuses();
  ensureColumn('runners', 'last_cli_scan_at', 'TEXT');
  ensureColumn('runners', 'cli_refresh_requested_at', 'TEXT');
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
      ai_provider   TEXT CHECK (ai_provider IN ('claude-code','codex','cursor-agent') OR ai_provider IS NULL),
      labels        TEXT NOT NULL DEFAULT '[]',
      output        TEXT,
      started_at    TEXT,
      completed_at  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO tasks_new (
      id, project_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, labels, output, started_at, completed_at, created_at, updated_at
    )
    SELECT
      id, project_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, labels, output, started_at, completed_at, created_at, updated_at
    FROM tasks;

    DROP TABLE tasks;
    ALTER TABLE tasks_new RENAME TO tasks;

    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_runner_id ON tasks(runner_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
}

function ensureColumn(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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

import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { formatTaskKey, normalizeListName } from './listIdentity';
import { DATA_DIR, ensureDataDir } from './dataDir';

const DB_DIR = DATA_DIR;
const DB_FILE = path.join(DB_DIR, 'hub.db');

const LEGACY_DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000000';

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
  // The settings table needs to exist before any migration that records state
  // (e.g. the inbox task counter populated by migrateProjectsToLists).
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Phase 1: legacy migrations that may still be needed on databases that
  // pre-date the lists rename (they operate on the old `tasks` schema).
  migrateTaskStatuses();
  migrateAddGeminiProvider();
  migrateAddGeminiProviderToSessions();

  // Phase 2: rename `projects` → `lists` if upgrading from the old schema.
  migrateProjectsToLists();

  // Phase 3: ensure modern schema exists.
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      icon          TEXT,
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
      list_id       TEXT REFERENCES lists(id) ON DELETE CASCADE,
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

    CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_runner_id ON tasks(runner_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

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

  ensureColumn('runners', 'last_cli_scan_at', 'TEXT');
  ensureColumn('runners', 'cli_refresh_requested_at', 'TEXT');
  ensureColumn('runners', 'cli_update_requested_at', 'TEXT');
  ensureColumn('runners', 'cli_versions', 'TEXT');
  ensureColumn('tasks', 'harness_config', `TEXT NOT NULL DEFAULT '{}'`);
  ensureColumn('tasks', 'scheduled_at', 'TEXT');
  ensureColumn('lists', 'icon', 'TEXT');
  ensureColumn('lists', 'position', 'INTEGER NOT NULL DEFAULT 0');
  backfillListPositions();

  normalizeListNames();
  ensureUniqueListNamesIndex();
  migrateTaskKeysToListNames();
}

function tableExists(name: string): boolean {
  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
  ).get(name);
  return !!row;
}

function migrateProjectsToLists(): void {
  if (tableExists('lists')) {
    // Drop any orphan `projects` table left behind by an earlier partial migration.
    if (tableExists('projects')) {
      db.pragma('foreign_keys = OFF');
      db.exec('DROP TABLE projects');
      db.pragma('foreign_keys = ON');
    }
    return;
  }
  if (!tableExists('projects')) return;

  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE lists (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      icon          TEXT,
      description   TEXT NOT NULL DEFAULT '',
      next_task_num INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO lists (id, name, description, next_task_num, created_at, updated_at)
    SELECT id, name, description, next_task_num, created_at, updated_at
    FROM projects
    WHERE id != '${LEGACY_DEFAULT_PROJECT_ID}';

    CREATE TABLE tasks_new (
      id            TEXT PRIMARY KEY,
      list_id       TEXT REFERENCES lists(id) ON DELETE CASCADE,
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
      scheduled_at  TEXT,
      started_at    TEXT,
      completed_at  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO tasks_new (
      id, list_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, harness_config, labels, output, scheduled_at, started_at, completed_at, created_at, updated_at
    )
    SELECT
      id,
      CASE WHEN project_id = '${LEGACY_DEFAULT_PROJECT_ID}' THEN NULL ELSE project_id END,
      task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, harness_config, labels, output, scheduled_at, started_at, completed_at, created_at, updated_at
    FROM tasks;

    DROP TABLE tasks;
    ALTER TABLE tasks_new RENAME TO tasks;
    DROP TABLE projects;

    CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_runner_id ON tasks(runner_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);

  // Renumber the migrated inbox tasks (formerly the default project) so they
  // get a fresh 1..N sequence under the INBOX prefix.
  const inboxTasks = db.prepare(
    'SELECT id FROM tasks WHERE list_id IS NULL ORDER BY created_at ASC, id ASC',
  ).all() as Array<{ id: string }>;

  const updateInbox = db.prepare(
    'UPDATE tasks SET task_number = ?, task_key = ? WHERE id = ?',
  );
  let nextNum = 1;
  const renumber = db.transaction(() => {
    for (const task of inboxTasks) {
      updateInbox.run(nextNum, formatTaskKey(null, nextNum), task.id);
      nextNum += 1;
    }
  });
  renumber();
  setDbSettingDirect('inbox_next_task_num', String(nextNum));

  db.pragma('foreign_keys = ON');
}

function normalizeListNames(): void {
  if (!tableExists('lists')) return;
  const lists = db.prepare('SELECT id, name FROM lists').all() as Array<{ id: string; name: string }>;
  const updateName = db.prepare('UPDATE lists SET name = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const list of lists) {
      const normalized = normalizeListName(list.name);
      if (normalized && normalized !== list.name) {
        updateName.run(normalized, list.id);
      }
    }
  });
  tx();
}

function ensureUniqueListNamesIndex(): void {
  const duplicates = db.prepare(`
    SELECT lower(name) AS normalized_name, COUNT(*) AS count
    FROM lists
    GROUP BY lower(name)
    HAVING COUNT(*) > 1
  `).all() as Array<{ normalized_name: string; count: number }>;

  if (duplicates.length > 0) return;
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_name_unique ON lists(name COLLATE NOCASE)');
}

const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
  { name: '🐛 Bug',           color: 'red' },
  { name: '🔧 Fix',           color: 'orange' },
  { name: '✨ Feature',       color: 'blue' },
  { name: '📈 Improvement',   color: 'emerald' },
  { name: '♻️ Refactor',      color: 'violet' },
  { name: '📝 Documentation', color: 'gray' },
  { name: '🎨 Design',        color: 'pink' },
  { name: '🧪 Testing',       color: 'amber' },
  { name: '⚡ Performance',   color: 'teal' },
  { name: '🔒 Security',      color: 'red-dark' },
  { name: '🚀 DevOps',        color: 'cyan' },
  { name: '🧹 Chore',         color: 'slate' },
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
  if (!tableExists('tasks')) return;
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
  if (!tableExists('tasks')) return;
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
  if (!tableExists('sessions')) return;
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

function backfillListPositions(): void {
  const unpositioned = db.prepare(
    'SELECT COUNT(*) AS cnt FROM lists WHERE position = 0',
  ).get() as { cnt: number };
  if (unpositioned.cnt === 0) return;

  const lists = db.prepare('SELECT id FROM lists ORDER BY created_at DESC').all() as Array<{ id: string }>;
  const update = db.prepare('UPDATE lists SET position = ? WHERE id = ?');
  const tx = db.transaction(() => {
    lists.forEach((list, i) => update.run(i + 1, list.id));
  });
  tx();
}

function ensureColumn(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateTaskKeysToListNames(): void {
  const listed = db.prepare(`
    SELECT t.id, t.task_number, l.name AS list_name
    FROM tasks t
    JOIN lists l ON l.id = t.list_id
    ORDER BY t.created_at ASC, t.id ASC
  `).all() as Array<{ id: string; task_number: number; list_name: string }>;

  const inbox = db.prepare(`
    SELECT id, task_number FROM tasks
    WHERE list_id IS NULL
    ORDER BY created_at ASC, id ASC
  `).all() as Array<{ id: string; task_number: number }>;

  const updateTaskKey = db.prepare('UPDATE tasks SET task_key = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const task of listed) {
      updateTaskKey.run(formatTaskKey(task.list_name, task.task_number), task.id);
    }
    for (const task of inbox) {
      updateTaskKey.run(formatTaskKey(null, task.task_number), task.id);
    }
  });

  try {
    tx();
  } catch {
    // Preserve existing task keys if generated names would collide.
  }
}

// ── Settings helpers ─────────────────────────────────────────────────────

function setDbSettingDirect(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getDbSetting(key: string): string | undefined {
  if (!db) return undefined;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setDbSetting(key: string, value: string): void {
  if (!db) return;
  setDbSettingDirect(key, value);
}

// ── Inbox task numbering ─────────────────────────────────────────────────

const INBOX_COUNTER_KEY = 'inbox_next_task_num';

export function nextInboxTaskNumber(): number {
  const current = parseInt(getDbSetting(INBOX_COUNTER_KEY) ?? '1', 10);
  const safe = Number.isFinite(current) && current > 0 ? current : 1;
  setDbSetting(INBOX_COUNTER_KEY, String(safe + 1));
  return safe;
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

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./db/schema";

const MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'requirement',
    status TEXT NOT NULL DEFAULT 'pending',
    artifacts TEXT NOT NULL DEFAULT '[]',
    agent_name TEXT NOT NULL DEFAULT '',
    conversation_id TEXT NOT NULL DEFAULT '',
    project_id TEXT NOT NULL DEFAULT '',
    parent_task_id TEXT NOT NULL DEFAULT '',
    depends_on TEXT NOT NULL DEFAULT '[]',
    git_branch TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    task_id TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'main',
    agent_name TEXT NOT NULL DEFAULT '',
    task_id TEXT NOT NULL DEFAULT '',
    participants TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'running',
    parent_session_id TEXT NOT NULL DEFAULT '',
    max_rounds INTEGER NOT NULL DEFAULT 50,
    current_round INTEGER NOT NULL DEFAULT 0,
    current_speaker TEXT NOT NULL DEFAULT '',
    artifacts TEXT NOT NULL DEFAULT '[]',
    board_id TEXT NOT NULL DEFAULT '',
    trigger_message_id TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL DEFAULT '',
    tech_stack TEXT NOT NULL DEFAULT '[]',
    conventions TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS project_memories (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    fact TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
  CREATE TABLE IF NOT EXISTS discussion_boards (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL UNIQUE,
    participants TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );
  CREATE TABLE IF NOT EXISTS discussion_messages (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    speaker TEXT NOT NULL,
    content TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'mention',
    mentions TEXT NOT NULL DEFAULT '[]',
    topics TEXT NOT NULL DEFAULT '[]',
    protocol_type TEXT,
    protocol_status TEXT,
    response_policy TEXT,
    reactions TEXT NOT NULL DEFAULT '[]',
    parent_id TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES discussion_boards(id)
  );
`;

// Mock the db module before any test imports it
vi.mock("./db", () => {
  let _db: ReturnType<typeof drizzle> | null = null;
  let _sqlite: Database.Database | null = null;

  return {
    getDb: () => {
      if (_db) return _db;
      _sqlite = new Database(":memory:");
      _sqlite.exec(MIGRATION_SQL);
      // Ensure default project for single-user mode
      _sqlite.exec(
        "INSERT OR IGNORE INTO projects (id, name, path) VALUES ('default', '默认项目', '.')"
      );
      _db = drizzle(_sqlite, { schema });
      return _db;
    },
    closeDb: () => {
      if (_sqlite) {
        _sqlite.close();
        _sqlite = null;
      }
      _db = null;
    },
  };
});

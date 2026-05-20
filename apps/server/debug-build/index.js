"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc5) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc5 = __getOwnPropDesc(from, key)) || desc5.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_node_server = require("@hono/node-server");

// src/app.ts
var import_hono11 = require("hono");
var import_cors = require("hono/cors");

// src/db/index.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_better_sqlite32 = require("drizzle-orm/better-sqlite3");

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  conversations: () => conversations,
  discussionBoards: () => discussionBoards,
  discussionMessages: () => discussionMessages,
  messages: () => messages,
  projectMemories: () => projectMemories,
  projects: () => projects,
  sessions: () => sessions,
  tasks: () => tasks
});
var import_sqlite_core = require("drizzle-orm/sqlite-core");
var tasks = (0, import_sqlite_core.sqliteTable)("tasks", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  title: (0, import_sqlite_core.text)("title").notNull().default(""),
  description: (0, import_sqlite_core.text)("description").notNull().default(""),
  stage: (0, import_sqlite_core.text)("stage").notNull().default("requirement"),
  status: (0, import_sqlite_core.text)("status").notNull().default("pending"),
  artifacts: (0, import_sqlite_core.text)("artifacts").notNull().default("[]"),
  agentName: (0, import_sqlite_core.text)("agent_name").notNull().default(""),
  conversationId: (0, import_sqlite_core.text)("conversation_id").notNull().default(""),
  projectId: (0, import_sqlite_core.text)("project_id").notNull().default(""),
  parentTaskId: (0, import_sqlite_core.text)("parent_task_id").notNull().default(""),
  dependsOn: (0, import_sqlite_core.text)("depends_on").notNull().default("[]"),
  gitBranch: (0, import_sqlite_core.text)("git_branch").notNull().default(""),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))"),
  updatedAt: (0, import_sqlite_core.text)("updated_at").default("(datetime('now'))")
});
var conversations = (0, import_sqlite_core.sqliteTable)("conversations", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  agentName: (0, import_sqlite_core.text)("agent_name").notNull(),
  taskId: (0, import_sqlite_core.text)("task_id").notNull().default(""),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))")
});
var messages = (0, import_sqlite_core.sqliteTable)("messages", {
  id: (0, import_sqlite_core.integer)("id").primaryKey({ autoIncrement: true }),
  conversationId: (0, import_sqlite_core.text)("conversation_id").notNull().references(() => conversations.id),
  role: (0, import_sqlite_core.text)("role").notNull(),
  content: (0, import_sqlite_core.text)("content").notNull(),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))")
});
var sessions = (0, import_sqlite_core.sqliteTable)("sessions", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  type: (0, import_sqlite_core.text)("type").notNull().default("main"),
  agentName: (0, import_sqlite_core.text)("agent_name").notNull().default(""),
  taskId: (0, import_sqlite_core.text)("task_id").notNull().default(""),
  participants: (0, import_sqlite_core.text)("participants").notNull().default("[]"),
  status: (0, import_sqlite_core.text)("status").notNull().default("running"),
  parentSessionId: (0, import_sqlite_core.text)("parent_session_id").notNull().default(""),
  maxRounds: (0, import_sqlite_core.integer)("max_rounds").notNull().default(50),
  currentRound: (0, import_sqlite_core.integer)("current_round").notNull().default(0),
  currentSpeaker: (0, import_sqlite_core.text)("current_speaker").notNull().default(""),
  artifacts: (0, import_sqlite_core.text)("artifacts").notNull().default("[]"),
  boardId: (0, import_sqlite_core.text)("board_id").notNull().default(""),
  triggerMessageId: (0, import_sqlite_core.text)("trigger_message_id").notNull().default(""),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))"),
  updatedAt: (0, import_sqlite_core.text)("updated_at").default("(datetime('now'))")
});
var projects = (0, import_sqlite_core.sqliteTable)("projects", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  name: (0, import_sqlite_core.text)("name").notNull().default(""),
  path: (0, import_sqlite_core.text)("path").notNull().default(""),
  techStack: (0, import_sqlite_core.text)("tech_stack").notNull().default("[]"),
  conventions: (0, import_sqlite_core.text)("conventions").notNull().default(""),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))"),
  updatedAt: (0, import_sqlite_core.text)("updated_at").default("(datetime('now'))")
});
var projectMemories = (0, import_sqlite_core.sqliteTable)("project_memories", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  projectId: (0, import_sqlite_core.text)("project_id").notNull().references(() => projects.id),
  fact: (0, import_sqlite_core.text)("fact").notNull(),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))"),
  updatedAt: (0, import_sqlite_core.text)("updated_at").default("(datetime('now'))")
});
var discussionBoards = (0, import_sqlite_core.sqliteTable)("discussion_boards", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  taskId: (0, import_sqlite_core.text)("task_id").notNull().references(() => tasks.id).unique(),
  participants: (0, import_sqlite_core.text)("participants").notNull().default("[]"),
  status: (0, import_sqlite_core.text)("status").notNull().default("active"),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))"),
  updatedAt: (0, import_sqlite_core.text)("updated_at").default("(datetime('now'))")
});
var discussionMessages = (0, import_sqlite_core.sqliteTable)("discussion_messages", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  boardId: (0, import_sqlite_core.text)("board_id").notNull().references(() => discussionBoards.id),
  speaker: (0, import_sqlite_core.text)("speaker").notNull(),
  content: (0, import_sqlite_core.text)("content").notNull(),
  triggerType: (0, import_sqlite_core.text)("trigger_type").notNull().default("mention"),
  mentions: (0, import_sqlite_core.text)("mentions").notNull().default("[]"),
  topics: (0, import_sqlite_core.text)("topics").notNull().default("[]"),
  protocolType: (0, import_sqlite_core.text)("protocol_type"),
  protocolStatus: (0, import_sqlite_core.text)("protocol_status"),
  responsePolicy: (0, import_sqlite_core.text)("response_policy"),
  reactions: (0, import_sqlite_core.text)("reactions").notNull().default("[]"),
  parentId: (0, import_sqlite_core.text)("parent_id").notNull().default(""),
  createdAt: (0, import_sqlite_core.text)("created_at").default("(datetime('now'))")
});

// src/db/index.ts
var _db = null;
var _sqlite = null;
var MIGRATION_SQL = `
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
function getDb(dbPath) {
  if (_db) return _db;
  const path3 = dbPath ?? process.env.DATABASE_PATH ?? "zcode.db";
  _sqlite = new import_better_sqlite3.default(path3);
  _sqlite.pragma("journal_mode = WAL");
  _sqlite.exec(MIGRATION_SQL);
  const alterStatements = [
    "ALTER TABLE sessions ADD COLUMN board_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE sessions ADD COLUMN trigger_message_id TEXT NOT NULL DEFAULT ''"
  ];
  for (const sql of alterStatements) {
    try {
      _sqlite.exec(sql);
    } catch {
    }
  }
  _sqlite.exec(
    "INSERT OR IGNORE INTO projects (id, name, path) VALUES ('default', '\u9ED8\u8BA4\u9879\u76EE', '.')"
  );
  _db = (0, import_better_sqlite32.drizzle)(_sqlite, { schema: schema_exports });
  return _db;
}

// src/routes/health.ts
var import_hono = require("hono");
var health = new import_hono.Hono();
health.get("/", (c) => c.json({ status: "ok" }));
var health_default = health;

// src/routes/task.ts
var import_hono2 = require("hono");

// src/services/task.ts
var import_drizzle_orm3 = require("drizzle-orm");

// src/services/events.ts
var EventHub = class {
  listeners = /* @__PURE__ */ new Map();
  subscribe(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }
  publish(event, data) {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }
};
var eventHub = new EventHub();

// src/services/pipeline.ts
var import_fs = __toESM(require("fs"));
var import_js_yaml = __toESM(require("js-yaml"));
var cached = null;
function loadPipeline() {
  if (cached) return cached;
  const path3 = process.env.PIPELINE_PATH || "./pipeline.yaml";
  try {
    const data = import_fs.default.readFileSync(path3, "utf-8");
    cached = import_js_yaml.default.load(data);
    return cached;
  } catch {
    cached = { stages: [] };
    return cached;
  }
}
function getNextStage(current) {
  const p = loadPipeline();
  const stage = p.stages.find((s) => s.key === current);
  return stage?.next || null;
}
function getAgentForStage(stage) {
  const p = loadPipeline();
  return p.stages.find((s) => s.key === stage)?.agent || "";
}
function getGate(stage) {
  const p = loadPipeline();
  return p.stages.find((s) => s.key === stage)?.gate || null;
}

// src/services/discussion.ts
var import_drizzle_orm2 = require("drizzle-orm");

// src/services/session.ts
var import_drizzle_orm = require("drizzle-orm");
var import_crypto = __toESM(require("crypto"));
function genId() {
  return import_crypto.default.randomUUID();
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function parseRow(row) {
  return {
    id: row.id,
    type: row.type,
    agent_name: row.agentName || row.agent_name,
    task_id: row.taskId || row.task_id,
    participants: JSON.parse(row.participants || "[]"),
    status: row.status,
    parent_session_id: row.parentSessionId || row.parent_session_id,
    max_rounds: row.maxRounds || row.max_rounds,
    current_round: row.currentRound || row.current_round,
    current_speaker: row.currentSpeaker || row.current_speaker,
    artifacts: JSON.parse(row.artifacts || "[]"),
    created_at: row.createdAt || row.created_at,
    updated_at: row.updatedAt || row.updated_at
  };
}
async function createSession(input) {
  const db = getDb();
  const id = input.id || genId();
  const t = now();
  await db.insert(sessions).values({
    id,
    type: input.type || "main",
    agentName: input.agentName,
    taskId: input.taskId,
    participants: JSON.stringify(input.participants || []),
    status: input.status || "running",
    parentSessionId: input.parentSessionId || "",
    maxRounds: input.maxRounds || 50,
    currentRound: 0,
    currentSpeaker: "",
    artifacts: JSON.stringify(input.artifacts || []),
    boardId: input.boardId || "",
    triggerMessageId: input.triggerMessageId || "",
    createdAt: t,
    updatedAt: t
  }).onConflictDoUpdate({
    target: sessions.id,
    set: {
      status: input.status || "running",
      artifacts: JSON.stringify(input.artifacts || []),
      updatedAt: t
    }
  });
  return {
    id,
    type: input.type || "main",
    agent_name: input.agentName,
    task_id: input.taskId,
    participants: input.participants || [],
    status: input.status || "running",
    parent_session_id: input.parentSessionId || "",
    max_rounds: input.maxRounds || 50,
    current_round: 0,
    current_speaker: "",
    artifacts: input.artifacts || [],
    created_at: t,
    updated_at: t
  };
}
async function getSession(id) {
  const db = getDb();
  const rows = await db.select().from(sessions).where((0, import_drizzle_orm.eq)(sessions.id, id));
  if (rows.length === 0) return null;
  return parseRow(rows[0]);
}
async function listSessionsByTask(taskId) {
  const db = getDb();
  const rows = await db.select().from(sessions).where((0, import_drizzle_orm.eq)(sessions.taskId, taskId)).orderBy(sessions.createdAt);
  return rows.map(parseRow);
}

// src/engine/skill-loader.ts
var import_fs2 = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_js_yaml2 = __toESM(require("js-yaml"));
var SkillLoader = class {
  agentsDir;
  agents = /* @__PURE__ */ new Map();
  skills = /* @__PURE__ */ new Map();
  constructor(agentsDir) {
    this.agentsDir = agentsDir || process.env.AGENTS_DIR || import_path.default.resolve("agents");
    this.loadAll();
  }
  loadAll() {
    if (!import_fs2.default.existsSync(this.agentsDir)) return;
    for (const name of import_fs2.default.readdirSync(this.agentsDir)) {
      const dir = import_path.default.join(this.agentsDir, name);
      if (!import_fs2.default.statSync(dir).isDirectory()) continue;
      const yamlPath = import_path.default.join(dir, "agent.yaml");
      if (!import_fs2.default.existsSync(yamlPath)) continue;
      const cfg = import_js_yaml2.default.load(import_fs2.default.readFileSync(yamlPath, "utf-8"));
      const promptPath = import_path.default.join(dir, "system_prompt.md");
      cfg.system_prompt = import_fs2.default.existsSync(promptPath) ? import_fs2.default.readFileSync(promptPath, "utf-8") : "";
      this.agents.set(name, cfg);
      this.skills.set(name, /* @__PURE__ */ new Map());
    }
  }
  getAgentConfig(name) {
    return this.agents.get(name);
  }
  getSystemPrompt(name) {
    return this.agents.get(name)?.system_prompt || "";
  }
  getModel(name) {
    return this.agents.get(name)?.model || "claude-sonnet-4-20250514";
  }
  getAutoAdvance(name) {
    const cfg = this.agents.get(name);
    if (!cfg) return false;
    if ("auto_advance" in cfg) return !!cfg.auto_advance;
    return !!cfg.stage;
  }
  getBackend(name) {
    return this.agents.get(name)?.backend || "builtin";
  }
  getWorkingDir(name) {
    return this.agents.get(name)?.working_dir;
  }
  getSkills(agentName) {
    return [...this.skills.get(agentName)?.values() || []];
  }
  getSkill(agentName, skillName) {
    return this.skills.get(agentName)?.get(skillName);
  }
  listAgents() {
    return [...this.agents.keys()];
  }
  getAgent(name) {
    return this.agents.get(name);
  }
};

// src/services/discussion.ts
var import_crypto2 = __toESM(require("crypto"));
function genId2() {
  return import_crypto2.default.randomBytes(4).toString("hex");
}
function now2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function parseBoard(row) {
  return {
    id: row.id,
    task_id: row.task_id ?? row.taskId,
    participants: JSON.parse(
      (row.participants ?? row.participants) || "[]"
    ),
    status: row.status ?? row.status,
    created_at: (row.created_at ?? row.createdAt) || "",
    updated_at: (row.updated_at ?? row.updatedAt) || ""
  };
}
function parseMessage(row) {
  return {
    id: row.id,
    board_id: row.board_id ?? row.boardId,
    speaker: row.speaker,
    content: row.content,
    trigger_type: row.trigger_type ?? row.triggerType,
    mentions: JSON.parse(
      (row.mentions ?? row.mentions) || "[]"
    ),
    topics: JSON.parse(
      (row.topics ?? row.topics) || "[]"
    ),
    protocol_type: row.protocol_type ?? row.protocolType ?? null,
    protocol_status: row.protocol_status ?? row.protocolStatus ?? null,
    response_policy: row.response_policy ?? row.responsePolicy ?? null,
    reactions: JSON.parse(
      (row.reactions ?? row.reactions) || "[]"
    ),
    parent_id: (row.parent_id ?? row.parentId) || "",
    created_at: (row.created_at ?? row.createdAt) || ""
  };
}
async function getOrCreateBoard(taskId) {
  const db = getDb();
  const rows = await db.select().from(discussionBoards).where((0, import_drizzle_orm2.eq)(discussionBoards.taskId, taskId));
  if (rows.length > 0) return parseBoard(rows[0]);
  const id = genId2();
  const t = now2();
  await db.insert(discussionBoards).values({
    id,
    taskId,
    participants: "[]",
    status: "active",
    createdAt: t,
    updatedAt: t
  });
  return {
    id,
    task_id: taskId,
    participants: [],
    status: "active",
    created_at: t,
    updated_at: t
  };
}
async function getBoardByTask(taskId) {
  const db = getDb();
  const rows = await db.select().from(discussionBoards).where((0, import_drizzle_orm2.eq)(discussionBoards.taskId, taskId));
  return rows.length > 0 ? parseBoard(rows[0]) : null;
}
async function addParticipant(boardId, agentName) {
  const db = getDb();
  const rows = await db.select().from(discussionBoards).where((0, import_drizzle_orm2.eq)(discussionBoards.id, boardId));
  if (rows.length === 0) return null;
  const board2 = parseBoard(rows[0]);
  if (board2.participants.includes(agentName)) return board2;
  const updated = [...board2.participants, agentName];
  const t = now2();
  await db.update(discussionBoards).set({ participants: JSON.stringify(updated), updatedAt: t }).where((0, import_drizzle_orm2.eq)(discussionBoards.id, boardId));
  return { ...board2, participants: updated, updated_at: t };
}
async function listMessages(boardId, limit = 50, offset = 0) {
  const db = getDb();
  const rows = await db.select().from(discussionMessages).where((0, import_drizzle_orm2.eq)(discussionMessages.boardId, boardId)).orderBy((0, import_drizzle_orm2.desc)(discussionMessages.createdAt)).limit(limit).offset(offset);
  return rows.map(parseMessage).reverse();
}
async function createMessage(boardId, input) {
  const db = getDb();
  const id = genId2();
  const t = now2();
  await db.insert(discussionMessages).values({
    id,
    boardId,
    speaker: input.speaker,
    content: input.content,
    triggerType: input.trigger_type ?? "mention",
    mentions: JSON.stringify(input.mentions ?? []),
    topics: JSON.stringify(input.topics ?? []),
    protocolType: input.protocol_type ?? null,
    responsePolicy: input.response_policy ?? null,
    reactions: "[]",
    parentId: input.parent_id ?? "",
    createdAt: t
  });
  if (input.mentions && input.mentions.length > 0) {
    for (const name of input.mentions) {
      await addParticipant(boardId, name);
    }
  }
  await addParticipant(boardId, input.speaker);
  const msg = {
    id,
    board_id: boardId,
    speaker: input.speaker,
    content: input.content,
    trigger_type: input.trigger_type ?? "mention",
    mentions: input.mentions ?? [],
    topics: input.topics ?? [],
    protocol_type: input.protocol_type ?? null,
    protocol_status: null,
    response_policy: input.response_policy ?? null,
    reactions: [],
    parent_id: input.parent_id ?? "",
    created_at: t
  };
  const taskId = await lookupTaskId(boardId);
  publishBoardEvent(boardId, taskId, "board_message", `${input.speaker} \u53D1\u9001\u4E86\u6D88\u606F`, { message: msg });
  if (input.mentions && input.mentions.length > 0) {
    await triggerMentionSessions(boardId, taskId, id, input.mentions);
  }
  return msg;
}
async function addReaction(messageId, reaction) {
  const db = getDb();
  const rows = await db.select().from(discussionMessages).where((0, import_drizzle_orm2.eq)(discussionMessages.id, messageId));
  if (rows.length === 0) return null;
  const msg = parseMessage(rows[0]);
  const reactions = [...msg.reactions, reaction];
  await db.update(discussionMessages).set({ reactions: JSON.stringify(reactions) }).where((0, import_drizzle_orm2.eq)(discussionMessages.id, messageId));
  const updated = { ...msg, reactions };
  const taskId = await lookupTaskId(msg.board_id);
  publishBoardEvent(msg.board_id, taskId, "board_reaction", `${reaction.agent_name} ${reaction.action}`, { reaction });
  return updated;
}
async function createProtocol(boardId, input) {
  const msg = await createMessage(boardId, {
    speaker: input.speaker,
    content: input.content,
    trigger_type: "protocol",
    mentions: input.mentions,
    protocol_type: input.protocol_type,
    response_policy: "must_follow_protocol"
  });
  const db = getDb();
  await db.update(discussionMessages).set({ protocolStatus: "pending" }).where((0, import_drizzle_orm2.eq)(discussionMessages.id, msg.id));
  const taskId = await lookupTaskId(boardId);
  publishBoardEvent(boardId, taskId, "board_protocol_update", `${input.speaker} \u53D1\u8D77\u4E86 ${input.protocol_type}`, {
    protocol_type: input.protocol_type,
    message_id: msg.id
  });
  return { ...msg, protocol_status: "pending" };
}
async function updateProtocolStatus(messageId, status) {
  const db = getDb();
  const rows = await db.select().from(discussionMessages).where((0, import_drizzle_orm2.eq)(discussionMessages.id, messageId));
  if (rows.length === 0) return null;
  await db.update(discussionMessages).set({ protocolStatus: status }).where((0, import_drizzle_orm2.eq)(discussionMessages.id, messageId));
  const msg = parseMessage(rows[0]);
  const taskId = await lookupTaskId(msg.board_id);
  publishBoardEvent(msg.board_id, taskId, "board_protocol_update", `\u534F\u8BAE\u72B6\u6001\u53D8\u66F4\u4E3A ${status}`, {
    message_id: messageId,
    protocol_status: status
  });
  return { ...msg, protocol_status: status };
}
function publishBoardEvent(boardId, taskId, event, summary, data) {
  const payload = { type: event, board_id: boardId, task_id: taskId, ...data };
  eventHub.publish(`board:${boardId}`, payload);
  eventHub.publish("discussion_update", {
    type: "discussion_update",
    task_id: taskId,
    board_id: boardId,
    event,
    summary
  });
}
async function lookupTaskId(boardId) {
  const db = getDb();
  const rows = await db.select().from(discussionBoards).where((0, import_drizzle_orm2.eq)(discussionBoards.id, boardId));
  return rows.length > 0 ? parseBoard(rows[0]).task_id : "";
}
async function triggerMentionSessions(boardId, taskId, messageId, mentions) {
  for (const agentName of mentions) {
    await createSession({
      agentName,
      taskId,
      type: "discussion",
      boardId,
      triggerMessageId: messageId,
      maxRounds: 5
    });
  }
}

// src/services/task.ts
var import_crypto3 = __toESM(require("crypto"));
function genId3() {
  return import_crypto3.default.randomBytes(4).toString("hex");
}
function now3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function parseRow2(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    stage: row.stage,
    status: row.status,
    artifacts: JSON.parse(row.artifacts || "[]"),
    agent_name: row.agentName || row.agent_name,
    conversation_id: row.conversationId || row.conversation_id,
    project_id: row.projectId || row.project_id,
    parent_task_id: row.parentTaskId || row.parent_task_id,
    depends_on: JSON.parse(row.dependsOn || row.depends_on || "[]"),
    git_branch: row.gitBranch || row.git_branch,
    created_at: row.createdAt || row.created_at,
    updated_at: row.updatedAt || row.updated_at
  };
}
async function createTask(input) {
  const db = getDb();
  const id = genId3();
  const t = now3();
  const stage = input.stage || "requirement";
  const dependsOn = input.depends_on ?? "[]";
  await db.insert(tasks).values({
    id,
    title: input.title,
    description: input.description ?? "",
    stage,
    status: "pending",
    parentTaskId: input.parent_task_id ?? "",
    dependsOn: typeof dependsOn === "string" ? dependsOn : JSON.stringify(dependsOn),
    createdAt: t,
    updatedAt: t
  });
  const task2 = {
    id,
    title: input.title,
    description: input.description ?? "",
    stage,
    status: "pending",
    artifacts: [],
    agent_name: "",
    conversation_id: "",
    project_id: "",
    parent_task_id: input.parent_task_id ?? "",
    depends_on: typeof dependsOn === "string" ? JSON.parse(dependsOn) : dependsOn,
    git_branch: "",
    created_at: t,
    updated_at: t
  };
  eventHub.publish("task_updated", task2);
  return task2;
}
async function listTasks(stage) {
  const db = getDb();
  const rows = stage ? db.select().from(tasks).where((0, import_drizzle_orm3.eq)(tasks.stage, stage)).orderBy((0, import_drizzle_orm3.desc)(tasks.updatedAt)) : db.select().from(tasks).orderBy((0, import_drizzle_orm3.desc)(tasks.updatedAt));
  return (await rows).map(parseRow2);
}
async function getTask(id) {
  const db = getDb();
  const rows = await db.select().from(tasks).where((0, import_drizzle_orm3.eq)(tasks.id, id));
  if (rows.length === 0) return null;
  return parseRow2(rows[0]);
}
async function updateTask(id, input) {
  const existing = await getTask(id);
  if (!existing) return null;
  const db = getDb();
  const t = now3();
  const artifacts = input.artifacts !== void 0 ? JSON.parse(input.artifacts) : existing.artifacts;
  const dependsOn = input.depends_on !== void 0 ? JSON.parse(input.depends_on) : existing.depends_on;
  await db.update(tasks).set({
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    stage: input.stage ?? existing.stage,
    status: input.status ?? existing.status,
    artifacts: JSON.stringify(artifacts),
    agentName: input.agent_name ?? existing.agent_name,
    parentTaskId: input.parent_task_id ?? existing.parent_task_id,
    dependsOn: JSON.stringify(dependsOn),
    gitBranch: input.git_branch ?? existing.git_branch,
    updatedAt: t
  }).where((0, import_drizzle_orm3.eq)(tasks.id, id));
  const updated = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    stage: input.stage ?? existing.stage,
    status: input.status ?? existing.status,
    artifacts,
    agent_name: input.agent_name ?? existing.agent_name,
    parent_task_id: input.parent_task_id ?? existing.parent_task_id,
    depends_on: dependsOn,
    git_branch: input.git_branch ?? existing.git_branch,
    updated_at: t
  };
  eventHub.publish("task_updated", updated);
  if (input.stage && input.stage !== existing.stage) {
    const agentName = getAgentForStage(input.stage);
    if (agentName) {
      try {
        const board2 = await getBoardByTask(id);
        if (board2) {
          await addParticipant(board2.id, agentName);
        }
      } catch {
      }
    }
  }
  return updated;
}
async function deleteTask(id) {
  const db = getDb();
  const result = await db.delete(tasks).where((0, import_drizzle_orm3.eq)(tasks.id, id));
  const changes = result.changes ?? result.rowsAffected ?? 0;
  if (changes > 0) {
    eventHub.publish("task_deleted", { id });
    return true;
  }
  return false;
}

// src/engine/session.ts
var import_crypto4 = __toESM(require("crypto"));
var SESSION_TTL = 36e5;
var MAX_ITERATIONS = 50;
var LiveSession = class {
  id;
  sessionType;
  agentName;
  taskId;
  context;
  participants;
  status;
  parentSessionId;
  maxRounds;
  currentRound;
  currentSpeaker;
  artifacts;
  createdAt;
  updatedAt;
  _messages = [];
  _events = [];
  _eventResolvers = [];
  _userInputResolver = null;
  constructor(opts) {
    this.id = import_crypto4.default.randomUUID().slice(0, 12);
    this.sessionType = opts.sessionType || "main";
    this.agentName = opts.agentName;
    this.taskId = opts.taskId || "";
    this.context = opts.context || "";
    this.participants = opts.participants || [];
    this.status = "running";
    this.parentSessionId = opts.parentSessionId || "";
    this.maxRounds = opts.maxRounds || MAX_ITERATIONS;
    this.currentRound = 0;
    this.currentSpeaker = "";
    this.artifacts = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }
  get messages() {
    return [...this._messages];
  }
  get events() {
    return [...this._events];
  }
  addMessage(role, content, extra) {
    const msg = { role, content, ...extra };
    this._messages.push(msg);
    this.updatedAt = Date.now();
  }
  emit(event) {
    this._events.push(event);
    for (const resolve of this._eventResolvers) {
      resolve(event);
    }
    this._eventResolvers = [];
  }
  emitDone() {
    for (const resolve of this._eventResolvers) {
      resolve(null);
    }
    this._eventResolvers = [];
  }
  waitForEvent() {
    return new Promise((resolve) => {
      this._eventResolvers.push(resolve);
    });
  }
  waitForUserInput() {
    return new Promise((resolve) => {
      this._userInputResolver = resolve;
    });
  }
  resolveUserInput(input) {
    if (this._userInputResolver) {
      this._userInputResolver(input);
      this._userInputResolver = null;
    }
  }
  isExpired() {
    if (this.status === "running" || this.status === "waiting_user") return false;
    return Date.now() - this.updatedAt > SESSION_TTL;
  }
};
var SessionManager = class {
  sessions = /* @__PURE__ */ new Map();
  create(opts) {
    const session2 = new LiveSession(opts);
    this.sessions.set(session2.id, session2);
    return session2;
  }
  get(id) {
    return this.sessions.get(id);
  }
  listByTask(taskId) {
    return [...this.sessions.values()].filter((s) => s.taskId === taskId);
  }
  cleanup() {
    for (const [id, s] of this.sessions) {
      if (s.isExpired()) this.sessions.delete(id);
    }
  }
};
var sessionManager = new SessionManager();

// src/engine/provider.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
var AnthropicProvider = class {
  client = null;
  getClient() {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || "sk-placeholder";
      const opts = { apiKey };
      if (process.env.ANTHROPIC_BASE_URL) opts.baseURL = process.env.ANTHROPIC_BASE_URL;
      this.client = new import_sdk.default(opts);
    }
    return this.client;
  }
  async *stream(opts) {
    const client = this.getClient();
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const apiTools = opts.tools?.map((t) => {
      const func = t.function || t;
      return {
        name: func.name,
        description: func.description || "",
        input_schema: func.parameters || { type: "object", properties: {} }
      };
    });
    const apiMsgs = [];
    for (const m of opts.messages) {
      const role = m.role;
      if (role === "system") continue;
      if (role === "tool") {
        apiMsgs.push({
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: m.tool_call_id || "",
            content: m.content
          }]
        });
      } else if (role === "assistant" && m.tool_calls) {
        const blocks = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        for (const tc of m.tool_calls) {
          const func = tc.function || tc;
          blocks.push({
            type: "tool_use",
            id: tc.id || func.id || "",
            name: func.name || "",
            input: JSON.parse(func.arguments || "{}")
          });
        }
        apiMsgs.push({ role: "assistant", content: blocks });
      } else {
        apiMsgs.push({ role, content: m.content });
      }
    }
    const streamParams = {
      model,
      max_tokens: 16384,
      messages: apiMsgs
    };
    if (opts.systemPrompt) streamParams.system = opts.systemPrompt;
    if (apiTools) streamParams.tools = apiTools;
    const toolCalls = /* @__PURE__ */ new Map();
    let currentToolId = null;
    try {
      const stream = client.messages.stream(streamParams);
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            currentToolId = event.content_block.id;
            toolCalls.set(event.content_block.id, {
              id: event.content_block.id,
              name: event.content_block.name,
              arguments: ""
            });
          } else {
            currentToolId = null;
          }
        } else if (event.type === "content_block_delta") {
          const delta = event.delta;
          if (delta.text) {
            yield { type: "text", content: delta.text };
          } else if (delta.partial_json && currentToolId) {
            const tc = toolCalls.get(currentToolId);
            if (tc) tc.arguments += delta.partial_json;
          }
        } else if (event.type === "message_stop") {
          for (const [, tc] of toolCalls) {
            yield {
              type: "tool_call",
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments || "{}"
            };
          }
          if (toolCalls.size > 0) yield { type: "tool_call_end" };
          yield { type: "done" };
          return;
        }
      }
    } catch (err) {
      yield { type: "text", content: `[LLM Error: ${err.message}]` };
      yield { type: "done" };
    }
  }
};
function getProvider(model) {
  if (model.includes("claude") || model.includes("anthropic")) {
    return new AnthropicProvider();
  }
  return new AnthropicProvider();
}

// src/engine/agent-loop.ts
var MAX_ITERATIONS2 = 50;
function builtinTools() {
  return [
    {
      type: "function",
      function: {
        name: "advance_stage",
        description: "\u786E\u8BA4\u5F53\u524D\u9636\u6BB5\u5DE5\u4F5C\u5B8C\u6210\uFF0C\u63A8\u8FDB\u4EFB\u52A1\u5230\u4E0B\u4E00\u9636\u6BB5",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "write_artifact",
        description: "\u4FDD\u5B58\u4EA7\u51FA\u7269",
        parameters: {
          type: "object",
          properties: {
            artifact_type: { type: "string", description: "\u5236\u54C1\u7C7B\u578B", default: "document" },
            title: { type: "string", description: "\u5236\u54C1\u6807\u9898" },
            content: { type: "string", description: "\u5236\u54C1\u5185\u5BB9" }
          },
          required: ["title", "content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "discuss_with_agent",
        description: "\u4E0E\u53E6\u4E00\u4E2A Agent \u53D1\u8D77\u8BA8\u8BBA",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "\u76EE\u6807 Agent \u540D\u79F0" },
            topic: { type: "string", description: "\u8BA8\u8BBA\u4E3B\u9898" },
            max_rounds: { type: "integer", description: "\u6700\u5927\u8BA8\u8BBA\u8F6E\u6B21", default: 10 }
          },
          required: ["agent_name", "topic"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "clarify_user",
        description: "\u5411\u7528\u6237\u63D0\u95EE\u4EE5\u6F84\u6E05\u95EE\u9898",
        parameters: {
          type: "object",
          properties: {
            question: { type: "string", description: "\u8981\u5411\u7528\u6237\u63D0\u51FA\u7684\u95EE\u9898" }
          },
          required: ["question"]
        }
      }
    }
  ];
}
var AgentLoop = class {
  skillLoader;
  callbackUrl;
  constructor(skillLoader2, callbackUrl2) {
    this.skillLoader = skillLoader2;
    this.callbackUrl = callbackUrl2;
  }
  async run(sessionId) {
    const session2 = sessionManager.get(sessionId);
    if (!session2) return;
    try {
      await this.runInner(session2);
    } catch (err) {
      session2.status = "failed";
      session2.emit({ type: "error", content: err.message, agent: session2.agentName });
      session2.emitDone();
      await this.notifyCallback(session2);
    }
  }
  async runInner(session2) {
    const systemPrompt = this.skillLoader.getSystemPrompt(session2.agentName);
    const fullPrompt = session2.context ? systemPrompt + "\n\n## \u4EFB\u52A1\u4E0A\u4E0B\u6587\n" + session2.context : systemPrompt;
    const skills = this.skillLoader.getSkills(session2.agentName);
    const tools = [...skills.map((s) => ({
      type: "function",
      function: { name: s.name, description: s.description, parameters: s.parameters }
    })), ...builtinTools()];
    const model = this.skillLoader.getModel(session2.agentName);
    const provider = getProvider(model);
    session2.addMessage("user", session2.context ? `\u8BF7\u5F00\u59CB\u5DE5\u4F5C\u3002\u4EFB\u52A1\uFF1A${session2.context}` : "\u8BF7\u5F00\u59CB\u5DE5\u4F5C\u3002");
    for (let i = 0; i < MAX_ITERATIONS2; i++) {
      if (session2.status !== "running") break;
      const { fullText, toolCalls } = await this.streamLLM(provider, session2, tools, fullPrompt);
      if (fullText || toolCalls.length > 0) {
        session2.addMessage("assistant", fullText, toolCalls.length > 0 ? { tool_calls: toolCalls } : void 0);
      }
      if (toolCalls.length === 0) {
        session2.status = "completed";
        const autoAdvance2 = this.skillLoader.getAutoAdvance(session2.agentName);
        await this.finishSession(session2, autoAdvance2);
        return;
      }
      for (const tc of toolCalls) {
        session2.emit({ type: "tool_call", name: tc.name, arguments: tc.arguments, agent: session2.agentName });
        const result = await this.executeTool(session2, tc);
        session2.addMessage("tool", result, { tool_call_id: tc.id, name: tc.name });
        session2.emit({ type: "tool_result", name: tc.name, content: result, agent: session2.agentName });
        const advance = session2.status === "completed" && session2.artifacts.some((a) => a.type === "stage_advance");
        if (session2.status === "completed" || session2.status === "waiting_user") {
          await this.finishSession(session2, advance);
          return;
        }
      }
    }
    session2.status = "completed";
    const autoAdvance = this.skillLoader.getAutoAdvance(session2.agentName);
    await this.finishSession(session2, autoAdvance);
  }
  async streamLLM(provider, session2, tools, systemPrompt) {
    let fullText = "";
    const toolCalls = [];
    for await (const chunk of provider.stream({
      messages: session2.messages,
      tools,
      systemPrompt
    })) {
      if (chunk.type === "text" && chunk.content) {
        fullText += chunk.content;
        session2.emit({ type: "text", content: chunk.content, agent: session2.agentName });
      } else if (chunk.type === "tool_call" && chunk.id) {
        toolCalls.push({ id: chunk.id, name: chunk.name || "", arguments: chunk.arguments || "{}" });
      }
    }
    return { fullText, toolCalls };
  }
  async executeTool(session2, toolCall) {
    let args;
    try {
      args = JSON.parse(toolCall.arguments || "{}");
    } catch {
      args = {};
    }
    switch (toolCall.name) {
      case "advance_stage":
        session2.status = "completed";
        session2.artifacts.push({ type: "stage_advance", content: session2.taskId });
        return "\u9636\u6BB5\u5DF2\u63A8\u8FDB";
      case "clarify_user": {
        const question = args.question || "";
        session2.status = "waiting_user";
        session2.emit({ type: "clarify_user", question, agent: session2.agentName });
        const userResponse = await session2.waitForUserInput();
        session2.addMessage("user", userResponse);
        session2.status = "running";
        return `\u7528\u6237\u56DE\u590D\uFF1A${userResponse}`;
      }
      case "discuss_with_agent": {
        const target = args.agent_name || "";
        const topic = args.topic || "";
        if (!target) return "\u9519\u8BEF\uFF1A\u672A\u6307\u5B9A\u76EE\u6807 Agent";
        try {
          const board2 = await getOrCreateBoard(session2.taskId);
          const msg = await createMessage(board2.id, {
            speaker: session2.agentName,
            content: topic,
            trigger_type: "mention",
            mentions: [target]
          });
          return `\u5DF2\u5728\u8BA8\u8BBA\u533A @${target}\uFF0C\u6D88\u606F\u5DF2\u53D1\u9001\u3002\u7B49\u5F85 ${target} \u54CD\u5E94\u3002`;
        } catch (err) {
          return `\u53D1\u8D77\u8BA8\u8BBA\u5931\u8D25: ${err.message}`;
        }
      }
      case "write_artifact": {
        const artifact = {
          type: args.artifact_type || "document",
          title: args.title || "",
          content: args.content || ""
        };
        session2.artifacts.push(artifact);
        return "\u5236\u54C1\u5DF2\u4FDD\u5B58";
      }
      default: {
        const skill = this.skillLoader.getSkill(session2.agentName, toolCall.name);
        if (skill) {
          try {
            return await skill.execute(args);
          } catch (err) {
            return `\u5DE5\u5177\u6267\u884C\u5931\u8D25: ${err.message}`;
          }
        }
        return `\u672A\u77E5\u5DE5\u5177: ${toolCall.name}`;
      }
    }
  }
  async finishSession(session2, advance) {
    if (session2.status === "completed" || session2.status === "failed") {
      session2.emit({ type: "session_completed", agent: session2.agentName });
    } else {
      session2.emit({ type: "session_state_changed", status: session2.status, agent: session2.agentName });
    }
    session2.emitDone();
    await this.notifyCallback(session2, advance);
  }
  async notifyCallback(session2, advance = false) {
    const payload = {
      session_id: session2.id,
      task_id: session2.taskId,
      agent_name: session2.agentName,
      status: session2.status,
      artifacts: session2.artifacts,
      advance
    };
    try {
      await fetch(`${this.callbackUrl}/api/sessions/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
    }
  }
};

// src/engine/index.ts
var skillLoader = new SkillLoader();
var callbackUrl = `http://localhost:${process.env.PORT || "8000"}`;
async function startSessionForTask(taskId, agentName, context) {
  const liveSession = sessionManager.create({
    agentName,
    taskId,
    context: context || ""
  });
  await createSession({
    id: liveSession.id,
    agentName,
    taskId,
    status: "running"
  });
  await updateTask(taskId, { status: "running", agent_name: agentName });
  const loop = new AgentLoop(skillLoader, callbackUrl);
  loop.run(liveSession.id).catch(() => {
  });
  return { sessionId: liveSession.id };
}

// src/routes/task.ts
var task = new import_hono2.Hono();
task.post("/", async (c) => {
  const body = await c.req.json();
  const result = await createTask(body);
  const agentName = getAgentForStage(result.stage);
  if (agentName) {
    await startSessionForTask(result.id, agentName, result.description);
    const updated = await getTask(result.id);
    return c.json(updated || result);
  }
  return c.json(result);
});
task.get("/", async (c) => {
  const stage = c.req.query("stage");
  const result = await listTasks(stage);
  return c.json(result);
});
task.get("/:id", async (c) => {
  const result = await getTask(c.req.param("id"));
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
task.patch("/:id", async (c) => {
  const body = await c.req.json();
  const result = await updateTask(c.req.param("id"), body);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
task.post("/:id/advance", async (c) => {
  const id = c.req.param("id");
  const t = await getTask(id);
  if (!t) return c.json({ error: "not found" }, 404);
  const next = getNextStage(t.stage);
  if (!next) return c.json(t);
  const result = await updateTask(id, { stage: next });
  return c.json(result);
});
task.post("/:id/retry", async (c) => {
  const id = c.req.param("id");
  const t = await getTask(id);
  if (!t) return c.json({ error: "not found" }, 404);
  if (t.status !== "failed") return c.json({ error: "only failed tasks can be retried" }, 400);
  const agentName = getAgentForStage(t.stage);
  if (agentName) {
    await startSessionForTask(id, agentName, t.description);
    const updated = await getTask(id);
    return c.json(updated || t);
  }
  const result = await updateTask(id, { status: "pending" });
  return c.json(result);
});
task.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const t = await getTask(id);
  if (!t) return c.json({ error: "not found" }, 404);
  if (t.status !== "waiting_review") return c.json({ error: "only waiting_review tasks can be approved" }, 400);
  const updates = { status: "completed" };
  if (body.artifacts) updates.artifacts = body.artifacts;
  const result = await updateTask(id, updates);
  return c.json(result);
});
task.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const t = await getTask(id);
  if (!t) return c.json({ error: "not found" }, 404);
  if (t.status !== "waiting_review" && t.status !== "checking")
    return c.json({ error: "only waiting_review/checking tasks can be rejected" }, 400);
  const result = await updateTask(id, { status: "pending" });
  return c.json(result);
});
task.delete("/:id", async (c) => {
  const ok = await deleteTask(c.req.param("id"));
  if (!ok) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});
var task_default = task;

// src/routes/agent.ts
var import_hono3 = require("hono");
var import_fs3 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_js_yaml3 = __toESM(require("js-yaml"));
var agent = new import_hono3.Hono();
var agentCache = null;
function loadAgents() {
  if (agentCache) return agentCache;
  const agentsDir = import_path2.default.resolve(process.env.AGENTS_DIR || "agents");
  if (!import_fs3.default.existsSync(agentsDir)) return [];
  const dirs = import_fs3.default.readdirSync(agentsDir).filter(
    (d) => import_fs3.default.statSync(import_path2.default.join(agentsDir, d)).isDirectory()
  );
  agentCache = dirs.map((d) => {
    const cfgPath = import_path2.default.join(agentsDir, d, "agent.yaml");
    const cfg = import_fs3.default.existsSync(cfgPath) ? import_js_yaml3.default.load(import_fs3.default.readFileSync(cfgPath, "utf-8")) : {};
    return {
      name: cfg.name || d,
      role: cfg.role || "",
      stage: cfg.stage || "",
      model: cfg.model || "",
      description: cfg.role || cfg.name || d
    };
  });
  return agentCache;
}
agent.get("/", (c) => c.json(loadAgents()));
agent.get("/reload", (c) => {
  agentCache = null;
  return c.json(loadAgents());
});
var STAGE_ORDER = ["requirement", "design", "development", "testing", "done"];
agent.get("/stages", (c) => {
  const agents = loadAgents().filter((a) => a.stage);
  const stageMap = new Map(agents.map((a) => [a.stage, a]));
  const result = [];
  for (const key of STAGE_ORDER) {
    const a = stageMap.get(key);
    if (a) result.push({ key: a.stage, label: a.description, agent: a.name });
  }
  for (const a of agents) {
    if (!STAGE_ORDER.includes(a.stage)) {
      result.push({ key: a.stage, label: a.description, agent: a.name });
    }
  }
  return c.json(result);
});
var agent_default = agent;

// src/routes/session.ts
var import_hono4 = require("hono");
var session = new import_hono4.Hono();
session.post("/", async (c) => {
  const body = await c.req.json();
  const result = await createSession({
    agentName: body.agent_name,
    taskId: body.task_id || ""
  });
  return c.json(result);
});
session.get("/", async (c) => {
  const taskId = c.req.query("task_id");
  if (!taskId) return c.json({ error: "task_id required" }, 400);
  const sessions2 = await listSessionsByTask(taskId);
  return c.json({ sessions: sessions2 });
});
session.post("/discuss", async (c) => {
  const _body = await c.req.json();
  return c.json({ session_id: "pending", status: "running" });
});
session.post("/callback", async (c) => {
  const body = await c.req.json();
  const { session_id, task_id, agent_name, status, artifacts, advance } = body;
  await createSession({
    id: session_id,
    agentName: agent_name,
    taskId: task_id || "",
    status,
    artifacts
  });
  if (task_id) {
    const task2 = await getTask(task_id);
    if (task2) {
      const updates = {};
      const realArtifacts = (artifacts || []).filter(
        (a) => a.type !== "stage_advance"
      );
      if (realArtifacts.length > 0) {
        updates.artifacts = JSON.stringify([...task2.artifacts || [], ...realArtifacts]);
      }
      const hasStageAdvance = (artifacts || []).some(
        (a) => a.type === "stage_advance"
      );
      if (status === "failed") {
        updates.status = "failed";
      } else if ((advance || hasStageAdvance) && status === "completed") {
        const nextStage = getNextStage(task2.stage);
        if (nextStage) {
          updates.stage = nextStage;
          updates.status = "running";
        } else {
          updates.stage = "done";
          updates.status = "completed";
        }
      } else if (status === "completed") {
        const gate = getGate(task2.stage);
        if (gate?.type === "human_review") {
          updates.status = "waiting_review";
        } else {
          updates.status = "completed";
        }
      }
      if (Object.keys(updates).length > 0) {
        await updateTask(task_id, updates);
      }
      if ((advance || hasStageAdvance) && status === "completed") {
        const nextStage = getNextStage(task2.stage);
        if (nextStage) {
          const nextAgent = getAgentForStage(nextStage);
          if (nextAgent) {
            startSessionForTask(task_id, nextAgent, task2.description || "").catch(() => {
            });
          }
        }
      }
    }
  }
  return c.json({ status: "ok" });
});
session.get("/:id", async (c) => {
  const result = await getSession(c.req.param("id"));
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
session.get("/:id/stream", async (c) => {
  const liveSession = sessionManager.get(c.req.param("id"));
  if (!liveSession) return c.json({ error: "session not found" }, 404);
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}

`));
      };
      for (const evt of liveSession.events) {
        send(evt);
      }
      while (liveSession.status === "running" || liveSession.status === "waiting_user") {
        const evt = await liveSession.waitForEvent();
        if (!evt) break;
        send(evt);
        if (evt.type === "done" || evt.type === "session_completed") break;
      }
      controller.close();
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
});
session.get("/:id/events", async (c) => {
  const liveSession = sessionManager.get(c.req.param("id"));
  if (!liveSession) return c.json({ error: "session not found" }, 404);
  return c.json({ events: liveSession.events });
});
session.post("/:id/input", async (c) => {
  const body = await c.req.json();
  const liveSession = sessionManager.get(c.req.param("id"));
  if (liveSession) {
    liveSession.resolveUserInput(body.message || "");
  }
  return c.json({ status: "ok" });
});
var session_default = session;

// src/routes/chat.ts
var import_hono5 = require("hono");

// src/services/conversation.ts
var import_drizzle_orm4 = require("drizzle-orm");
async function getHistory(conversationId) {
  const db = getDb();
  const rows = await db.select({
    role: messages.role,
    content: messages.content,
    createdAt: messages.createdAt
  }).from(messages).where((0, import_drizzle_orm4.eq)(messages.conversationId, conversationId)).orderBy(messages.id);
  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    created_at: r.createdAt || ""
  }));
}

// src/routes/chat.ts
var chat = new import_hono5.Hono();
chat.post("/", async (c) => {
  const body = await c.req.json();
  return c.json({ error: "not implemented" }, 501);
});
chat.get("/history/:conversationId", async (c) => {
  const history = await getHistory(c.req.param("conversationId"));
  return c.json(history);
});
var chat_default = chat;

// src/routes/project.ts
var import_hono6 = require("hono");

// src/services/project.ts
var import_drizzle_orm5 = require("drizzle-orm");
var import_crypto5 = __toESM(require("crypto"));
function genId4() {
  return import_crypto5.default.randomBytes(4).toString("hex");
}
function now4() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function parseRow3(row) {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    tech_stack: JSON.parse(row.techStack || row.tech_stack || "[]"),
    conventions: row.conventions,
    git_initialized: false,
    git_remote: "",
    created_at: row.createdAt || row.created_at,
    updated_at: row.updatedAt || row.updated_at
  };
}
async function createProject(input) {
  const db = getDb();
  const id = genId4();
  const t = now4();
  await db.insert(projects).values({
    id,
    name: input.name,
    path: input.path ?? "",
    createdAt: t,
    updatedAt: t
  });
  return {
    id,
    name: input.name,
    path: input.path ?? "",
    tech_stack: [],
    conventions: "",
    git_initialized: false,
    git_remote: input.gitRemote ?? "",
    created_at: t,
    updated_at: t
  };
}
async function listProjects() {
  const db = getDb();
  const rows = await db.select().from(projects).orderBy((0, import_drizzle_orm5.desc)(projects.updatedAt));
  return rows.map(parseRow3);
}
async function getProject(id) {
  const db = getDb();
  const rows = await db.select().from(projects).where((0, import_drizzle_orm5.eq)(projects.id, id));
  if (rows.length === 0) return null;
  return parseRow3(rows[0]);
}
async function updateProject(id, input) {
  const existing = await getProject(id);
  if (!existing) return null;
  const db = getDb();
  const t = now4();
  const techStack = input.tech_stack ? JSON.parse(input.tech_stack) : existing.tech_stack;
  await db.update(projects).set({
    name: input.name ?? existing.name,
    path: input.path ?? existing.path,
    techStack: JSON.stringify(techStack),
    conventions: input.conventions ?? existing.conventions,
    updatedAt: t
  }).where((0, import_drizzle_orm5.eq)(projects.id, id));
  return getProject(id);
}
async function deleteProject(id) {
  const db = getDb();
  const result = await db.delete(projects).where((0, import_drizzle_orm5.eq)(projects.id, id));
  const changes = result.changes ?? result.rowsAffected ?? 0;
  return changes > 0;
}

// src/routes/project.ts
var project = new import_hono6.Hono();
project.post("/", async (c) => {
  const body = await c.req.json();
  const result = await createProject(body);
  return c.json(result);
});
project.get("/", async (c) => {
  const result = await listProjects();
  return c.json(result);
});
project.get("/:id", async (c) => {
  const result = await getProject(c.req.param("id"));
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
project.patch("/:id", async (c) => {
  const body = await c.req.json();
  const result = await updateProject(c.req.param("id"), body);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
project.delete("/:id", async (c) => {
  const ok = await deleteProject(c.req.param("id"));
  if (!ok) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});
var project_default = project;

// src/routes/memory.ts
var import_hono7 = require("hono");

// src/services/memory.ts
var import_drizzle_orm6 = require("drizzle-orm");
var import_crypto6 = __toESM(require("crypto"));
function genId5() {
  return import_crypto6.default.randomBytes(4).toString("hex");
}
function now5() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function parseRow4(row) {
  return {
    id: row.id,
    project_id: row.projectId || row.project_id,
    fact: row.fact,
    created_at: row.createdAt || row.created_at,
    updated_at: row.updatedAt || row.updated_at
  };
}
async function createMemory(projectId, input) {
  const db = getDb();
  const id = genId5();
  const t = now5();
  await db.insert(projectMemories).values({
    id,
    projectId,
    fact: input.fact,
    createdAt: t,
    updatedAt: t
  });
  return { id, project_id: projectId, fact: input.fact, created_at: t, updated_at: t };
}
async function listMemories(projectId) {
  const db = getDb();
  const rows = await db.select().from(projectMemories).where((0, import_drizzle_orm6.eq)(projectMemories.projectId, projectId)).orderBy(projectMemories.updatedAt);
  return rows.map(parseRow4);
}
async function updateMemory(id, input) {
  const db = getDb();
  const t = now5();
  await db.update(projectMemories).set({
    fact: input.fact,
    updatedAt: t
  }).where((0, import_drizzle_orm6.eq)(projectMemories.id, id));
  const rows = await db.select().from(projectMemories).where((0, import_drizzle_orm6.eq)(projectMemories.id, id));
  if (rows.length === 0) return null;
  return parseRow4(rows[0]);
}
async function deleteMemory(id) {
  const db = getDb();
  const result = await db.delete(projectMemories).where((0, import_drizzle_orm6.eq)(projectMemories.id, id));
  const changes = result.changes ?? result.rowsAffected ?? 0;
  return changes > 0;
}

// src/routes/memory.ts
var memory = new import_hono7.Hono();
memory.get("/:projectId/memories", async (c) => {
  const result = await listMemories(c.req.param("projectId"));
  return c.json(result);
});
memory.post("/:projectId/memories", async (c) => {
  const body = await c.req.json();
  const result = await createMemory(c.req.param("projectId"), body);
  return c.json(result);
});
var memory_default = memory;

// src/routes/memory-crud.ts
var import_hono8 = require("hono");
var memoryCrud = new import_hono8.Hono();
memoryCrud.patch("/:id", async (c) => {
  const body = await c.req.json();
  const result = await updateMemory(c.req.param("id"), body);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
memoryCrud.delete("/:id", async (c) => {
  const ok = await deleteMemory(c.req.param("id"));
  if (!ok) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});
var memory_crud_default = memoryCrud;

// src/routes/events.ts
var import_hono9 = require("hono");
var events = new import_hono9.Hono();
events.get("/", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}

`));
      };
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`:heartbeat

`));
      }, 15e3);
      const unsub = eventHub.subscribe("task_updated", send);
      const unsubDel = eventHub.subscribe("task_deleted", send);
      const unsubDisc = eventHub.subscribe("discussion_update", send);
      const req = c.req.raw;
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        unsubDel();
        unsubDisc();
        controller.close();
      });
      send({ type: "connected" });
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
});
var events_default = events;

// src/routes/discussion.ts
var import_hono10 = require("hono");
var taskDiscussion = new import_hono10.Hono();
taskDiscussion.get("/:id/discussion", async (c) => {
  const taskId = c.req.param("id");
  const board2 = await getOrCreateBoard(taskId);
  return c.json(board2);
});
var board = new import_hono10.Hono();
board.get("/:id/messages", async (c) => {
  const boardId = c.req.param("id");
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const messages2 = await listMessages(boardId, limit, offset);
  return c.json({ messages: messages2 });
});
board.post("/:id/messages", async (c) => {
  const boardId = c.req.param("id");
  const body = await c.req.json();
  const msg = await createMessage(boardId, {
    speaker: body.speaker,
    content: body.content,
    trigger_type: body.trigger_type,
    mentions: body.mentions,
    topics: body.topics,
    protocol_type: body.protocol_type,
    response_policy: body.response_policy,
    parent_id: body.parent_id
  });
  return c.json(msg);
});
board.patch("/:id/messages/:mid", async (c) => {
  const messageId = c.req.param("mid");
  const body = await c.req.json();
  const result = await addReaction(messageId, {
    agent_name: body.agent_name,
    action: body.action,
    content: body.content ?? ""
  });
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
board.post("/:id/protocols", async (c) => {
  const boardId = c.req.param("id");
  const body = await c.req.json();
  const msg = await createProtocol(boardId, {
    speaker: body.speaker,
    content: body.content,
    protocol_type: body.protocol_type,
    mentions: body.mentions ?? []
  });
  return c.json(msg);
});
board.patch("/:id/protocols/:mid", async (c) => {
  const messageId = c.req.param("mid");
  const body = await c.req.json();
  const result = await updateProtocolStatus(messageId, body.status);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
board.get("/:id/stream", (c) => {
  const boardId = c.req.param("id");
  const boardEvent = `board:${boardId}`;
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}

`));
      };
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`:heartbeat

`));
      }, 15e3);
      const unsub = eventHub.subscribe(boardEvent, send);
      const req = c.req.raw;
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        controller.close();
      });
      send({ type: "connected", board_id: boardId });
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
});

// src/app.ts
var app = new import_hono11.Hono();
app.use("*", (0, import_cors.cors)());
var dbInitialized = false;
app.use("*", async (_c, next) => {
  if (!dbInitialized) {
    getDb();
    dbInitialized = true;
  }
  await next();
});
app.route("/api/health", health_default);
app.route("/api/tasks", task_default);
app.route("/api/agents", agent_default);
app.route("/api/sessions", session_default);
app.route("/api/chat", chat_default);
app.route("/api/projects", project_default);
app.route("/api/projects", memory_default);
app.route("/api/projects/memories", memory_crud_default);
app.route("/api/events", events_default);
app.route("/api/tasks", taskDiscussion);
app.route("/api/boards", board);

// src/index.ts
var port = parseInt(process.env.PORT || "8000");
async function recoverStuckTasks() {
  const tasks2 = await listTasks();
  const stuck = tasks2.filter((t) => t.status === "running");
  for (const task2 of stuck) {
    const liveSessions = sessionManager.listByTask(task2.id);
    const runningLive = liveSessions.find((s) => s.status === "running");
    if (runningLive) continue;
    const dbSessions = await listSessionsByTask(task2.id);
    const latest = dbSessions.length > 0 ? dbSessions[dbSessions.length - 1] : null;
    if (latest) {
      if (latest.status === "completed") {
        const hasAdvance = latest.artifacts.some(
          (a) => a.type === "stage_advance"
        );
        if (hasAdvance) {
          const nextStage = getNextStage(task2.stage);
          if (nextStage) {
            const nextAgent = getAgentForStage(nextStage);
            await updateTask(task2.id, { stage: nextStage, status: "running" });
            if (nextAgent) {
              startSessionForTask(task2.id, nextAgent, task2.description || "").catch(() => {
              });
            }
          } else {
            await updateTask(task2.id, { status: "completed" });
          }
        } else {
          await updateTask(task2.id, { status: "completed" });
        }
        console.log(`[recovery] task ${task2.id} synced from session ${latest.id}`);
      } else if (latest.status === "failed") {
        await updateTask(task2.id, { status: "failed" });
        console.log(`[recovery] task ${task2.id} marked failed`);
      } else {
        await updateTask(task2.id, { status: "failed" });
        console.log(`[recovery] task ${task2.id} marked failed (session lost on restart)`);
      }
    } else {
      await updateTask(task2.id, { status: "pending" });
      console.log(`[recovery] task ${task2.id} reset to pending`);
    }
  }
  if (stuck.length > 0) {
    console.log(`[recovery] checked ${stuck.length} stuck task(s)`);
  }
}
console.log(`zcode server starting on port ${port}`);
(0, import_node_server.serve)({ fetch: app.fetch, port });
setTimeout(recoverStuckTasks, 500);
//# sourceMappingURL=index.js.map

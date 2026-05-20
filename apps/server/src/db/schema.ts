import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  stage: text("stage").notNull().default("requirement"),
  status: text("status").notNull().default("pending"),
  artifacts: text("artifacts").notNull().default("[]"),
  agentName: text("agent_name").notNull().default(""),
  conversationId: text("conversation_id").notNull().default(""),
  projectId: text("project_id").notNull().default(""),
  parentTaskId: text("parent_task_id").notNull().default(""),
  dependsOn: text("depends_on").notNull().default("[]"),
  gitBranch: text("git_branch").notNull().default(""),
  createdAt: text("created_at").default("(datetime('now'))"),
  updatedAt: text("updated_at").default("(datetime('now'))"),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  taskId: text("task_id").notNull().default(""),
  createdAt: text("created_at").default("(datetime('now'))"),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").default("(datetime('now'))"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  type: text("type").notNull().default("main"),
  agentName: text("agent_name").notNull().default(""),
  taskId: text("task_id").notNull().default(""),
  participants: text("participants").notNull().default("[]"),
  status: text("status").notNull().default("running"),
  parentSessionId: text("parent_session_id").notNull().default(""),
  maxRounds: integer("max_rounds").notNull().default(50),
  currentRound: integer("current_round").notNull().default(0),
  currentSpeaker: text("current_speaker").notNull().default(""),
  artifacts: text("artifacts").notNull().default("[]"),
  boardId: text("board_id").notNull().default(""),
  triggerMessageId: text("trigger_message_id").notNull().default(""),
  createdAt: text("created_at").default("(datetime('now'))"),
  updatedAt: text("updated_at").default("(datetime('now'))"),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  path: text("path").notNull().default(""),
  techStack: text("tech_stack").notNull().default("[]"),
  conventions: text("conventions").notNull().default(""),
  createdAt: text("created_at").default("(datetime('now'))"),
  updatedAt: text("updated_at").default("(datetime('now'))"),
});

export const projectMemories = sqliteTable("project_memories", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  fact: text("fact").notNull(),
  createdAt: text("created_at").default("(datetime('now'))"),
  updatedAt: text("updated_at").default("(datetime('now'))"),
});

export const discussionBoards = sqliteTable("discussion_boards", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id).unique(),
  participants: text("participants").notNull().default("[]"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").default("(datetime('now'))"),
  updatedAt: text("updated_at").default("(datetime('now'))"),
});

export const discussionMessages = sqliteTable("discussion_messages", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull().references(() => discussionBoards.id),
  speaker: text("speaker").notNull(),
  content: text("content").notNull(),
  triggerType: text("trigger_type").notNull().default("mention"),
  mentions: text("mentions").notNull().default("[]"),
  topics: text("topics").notNull().default("[]"),
  protocolType: text("protocol_type"),
  protocolStatus: text("protocol_status"),
  responsePolicy: text("response_policy"),
  reactions: text("reactions").notNull().default("[]"),
  parentId: text("parent_id").notNull().default(""),
  createdAt: text("created_at").default("(datetime('now'))"),
});

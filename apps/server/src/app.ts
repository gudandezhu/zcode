import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb, closeDb } from "./db";
import healthRoute from "./routes/health";
import taskRoute from "./routes/task";
import agentRoute from "./routes/agent";
import sessionRoute from "./routes/session";
import projectRoute from "./routes/project";
import memoryRoute from "./routes/memory";
import memoryCrudRoute from "./routes/memory-crud";
import eventsRoute from "./routes/events";
import { taskDiscussion, board as boardRoute } from "./routes/discussion";

const app = new Hono();
app.use("*", cors());

// Initialize DB on first request
let dbInitialized = false;
app.use("*", async (_c, next) => {
  if (!dbInitialized) {
    getDb();
    dbInitialized = true;
  }
  await next();
});

app.route("/api/health", healthRoute);
app.route("/api/tasks", taskRoute);
app.route("/api/agents", agentRoute);
app.route("/api/sessions", sessionRoute);
app.route("/api/projects", projectRoute);
app.route("/api/projects", memoryRoute);
app.route("/api/projects/memories", memoryCrudRoute);
app.route("/api/events", eventsRoute);
app.route("/api/tasks", taskDiscussion);
app.route("/api/boards", boardRoute);

export { app, closeDb };
export * as taskService from "./services/task";
export * as sessionService from "./services/session";
export * as conversationService from "./services/conversation";
export * as projectService from "./services/project";
export * as memoryService from "./services/memory";
export { eventHub } from "./services/events";
export * as pipelineService from "./services/pipeline";
export * as discussionService from "./services/discussion";

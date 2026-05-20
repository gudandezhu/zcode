import { Hono } from "hono";
import type { Artifact } from "@zcode/shared";
import * as svc from "../services/session";
import * as taskSvc from "../services/task";
import { getNextStage, getAgentForStage } from "../services/pipeline";
import { sessionManager } from "../engine/session";
import { startSessionForTask } from "../engine";

const session = new Hono();

session.post("/", async (c) => {
  const body = await c.req.json();
  const result = await svc.createSession({
    agentName: body.agentName,
    taskId: body.taskId || "",
  });
  return c.json(result);
});

session.get("/", async (c) => {
  const taskId = c.req.query("taskId");
  if (!taskId) return c.json({ error: "taskId required" }, 400);
  const sessions = await svc.listSessionsByTask(taskId);
  return c.json({ sessions });
});

session.post("/discuss", async (c) => {
  const _body = await c.req.json();
  return c.json({ sessionId: "pending", status: "running" });
});

session.post("/callback", async (c) => {
  const body = await c.req.json();
  const { sessionId, taskId, agentName, status, artifacts, advance } = body;

  // 1. Save session to DB
  await svc.createSession({
    id: sessionId,
    agentName: agentName,
    taskId: taskId || "",
    status,
    artifacts,
  });

  // 2. Complete session & update task
  if (taskId) {
    const task = await taskSvc.getTask(taskId);
    if (task) {
      await taskSvc.completeSession(sessionId, taskId, status, (artifacts || []) as Artifact[], advance);

      // 3. Handle stage advancement
      const hasStageAdvance = (artifacts || []).some(
        (a: { type?: string }) => a.type === "stage_advance",
      );

      if ((advance || hasStageAdvance) && status === "completed") {
        const nextStage = getNextStage(task.stage);
        if (nextStage) {
          const nextAgent = getAgentForStage(nextStage);
          if (nextAgent) {
            startSessionForTask(taskId, nextAgent, task.description || "").catch(() => {});
          }
        }
      }
    }
  }

  return c.json({ status: "ok" });
});

session.get("/:id", async (c) => {
  const result = await svc.getSession(c.req.param("id"));
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

session.get("/:id/stream", async (c) => {
  const liveSession = sessionManager.get(c.req.param("id"));
  if (!liveSession) return c.json({ error: "session not found" }, 404);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
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
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
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

export default session;

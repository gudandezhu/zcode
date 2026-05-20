import { Hono } from "hono";
import * as svc from "../services/task";
import { getNextStage, getAgentForStage } from "../services/pipeline";
import { startSessionForTask } from "../engine";

const task = new Hono();

task.post("/", async (c) => {
  const body = await c.req.json();
  const result = await svc.createTask(body);
  const agentName = getAgentForStage(result.stage);
  if (agentName) {
    await startSessionForTask(result.id, agentName, result.description);
    const updated = await svc.getTask(result.id);
    return c.json(updated || result);
  }
  return c.json(result);
});

task.get("/", async (c) => {
  const stage = c.req.query("stage");
  const result = await svc.listTasks(stage);
  return c.json(result);
});

task.get("/:id", async (c) => {
  const result = await svc.getTask(c.req.param("id"));
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

task.patch("/:id", async (c) => {
  const body = await c.req.json();
  const result = await svc.updateTask(c.req.param("id"), body);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

task.post("/:id/advance", async (c) => {
  const id = c.req.param("id");
  const t = await svc.getTask(id);
  if (!t) return c.json({ error: "not found" }, 404);
  const next = getNextStage(t.stage);
  if (!next) return c.json(t);
  const result = await svc.updateTask(id, { stage: next as any });
  return c.json(result);
});

task.post("/:id/retry", async (c) => {
  const id = c.req.param("id");
  try {
    const result = await svc.transitionTask(id, "retry");
    const agentName = getAgentForStage(result.stage);
    if (agentName) {
      await startSessionForTask(id, agentName, result.description);
      const updated = await svc.getTask(id);
      return c.json(updated || result);
    }
    return c.json(result);
  } catch (e: any) {
    if (e.message?.includes("not found")) return c.json({ error: "not found" }, 404);
    return c.json({ error: e.message }, 400);
  }
});

task.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  try {
    return c.json(await svc.transitionTask(id, "approve"));
  } catch (e: any) {
    if (e.message?.includes("not found")) return c.json({ error: "not found" }, 404);
    return c.json({ error: e.message }, 400);
  }
});

task.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  try {
    return c.json(await svc.transitionTask(id, "reject"));
  } catch (e: any) {
    if (e.message?.includes("not found")) return c.json({ error: "not found" }, 404);
    return c.json({ error: e.message }, 400);
  }
});

task.delete("/:id", async (c) => {
  const ok = await svc.deleteTask(c.req.param("id"));
  if (!ok) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

export default task;

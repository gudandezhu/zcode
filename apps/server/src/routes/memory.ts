import { Hono } from "hono";
import * as svc from "../services/memory";

const memory = new Hono();

// GET /api/projects/:projectId/memories
memory.get("/:projectId/memories", async (c) => {
  const result = await svc.listMemories(c.req.param("projectId"));
  return c.json(result);
});

// POST /api/projects/:projectId/memories
memory.post("/:projectId/memories", async (c) => {
  const body = await c.req.json();
  const result = await svc.createMemory(c.req.param("projectId"), body);
  return c.json(result);
});

export default memory;

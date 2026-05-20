import { Hono } from "hono";
import * as svc from "../services/project";

const project = new Hono();

project.post("/", async (c) => {
  const body = await c.req.json();
  const result = await svc.createProject(body);
  return c.json(result);
});

project.get("/", async (c) => {
  const result = await svc.listProjects();
  return c.json(result);
});

project.get("/:id", async (c) => {
  const result = await svc.getProject(c.req.param("id"));
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

project.patch("/:id", async (c) => {
  const body = await c.req.json();
  const result = await svc.updateProject(c.req.param("id"), body);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

project.delete("/:id", async (c) => {
  const ok = await svc.deleteProject(c.req.param("id"));
  if (!ok) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

export default project;

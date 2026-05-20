import { Hono } from "hono";
import * as svc from "../services/memory";

const memoryCrud = new Hono();

memoryCrud.patch("/:id", async (c) => {
  const body = await c.req.json();
  const result = await svc.updateMemory(c.req.param("id"), body);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

memoryCrud.delete("/:id", async (c) => {
  const ok = await svc.deleteMemory(c.req.param("id"));
  if (!ok) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

export default memoryCrud;

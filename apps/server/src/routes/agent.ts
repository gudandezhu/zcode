import { Hono } from "hono";
import { getPipelineStages } from "../services/pipeline";

const agent = new Hono();

agent.get("/stages", (c) => {
  return c.json(getPipelineStages());
});

export default agent;

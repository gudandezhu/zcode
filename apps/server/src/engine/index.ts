export { LiveSession, SessionManager, sessionManager } from "./session";
export { AgentLoop } from "./agent-loop";
export { SkillLoader } from "./skill-loader";
export { AnthropicProvider, getProvider } from "./provider";
export type { LLMProvider, StreamChunk } from "./provider";
export type { Skill, AgentConfig } from "./skill-loader";

import { SkillLoader } from "./skill-loader";
import { AgentLoop } from "./agent-loop";
import { sessionManager } from "./session";
import * as sessionSvc from "../services/session";
import * as taskSvc from "../services/task";

const skillLoader = new SkillLoader();
const callbackUrl = `http://localhost:${process.env.PORT || "8000"}`;

export function getSkillLoader(): SkillLoader {
  return skillLoader;
}

export async function startSessionForTask(
  taskId: string,
  agentName: string,
  context?: string,
): Promise<{ sessionId: string }> {
  const liveSession = sessionManager.create({
    agentName,
    taskId,
    context: context || "",
  });

  await sessionSvc.createSession({
    id: liveSession.id,
    agentName,
    taskId,
    status: "running",
  });

  await taskSvc.transitionTask(taskId, "start");
  await taskSvc.updateTask(taskId, { agentName: agentName });

  const loop = new AgentLoop(skillLoader, callbackUrl);
  loop.run(liveSession.id).catch(() => {});

  return { sessionId: liveSession.id };
}

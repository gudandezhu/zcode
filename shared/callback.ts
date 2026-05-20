import type { Artifact } from "./task";

export interface CallbackAction {
  type: "advance" | "discuss" | "clarify" | "stop";
  nextAgent?: string;
  reason?: string;
  topic?: string;
  participants?: string[];
}

export interface SessionCallback {
  sessionId: string;
  taskId: string;
  agentName: string;
  status: string;
  artifacts: Artifact[];
  advance: boolean;
  action?: CallbackAction;
}

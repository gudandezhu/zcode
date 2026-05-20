import type { Artifact } from "./task";

export type SessionType = "main" | "discussion";
export type SessionStatus = "running" | "waiting_user" | "completed" | "failed";

export interface Session {
  id: string;
  type: SessionType;
  agentName: string;
  taskId: string;
  participants: string[];
  status: SessionStatus;
  parentSessionId: string;
  maxRounds: number;
  currentRound: number;
  currentSpeaker: string;
  artifacts: Artifact[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionCreate {
  agentName: string;
  taskId?: string;
  context?: string;
}

export interface DiscussionCreate {
  initiator: string;
  participant: string;
  taskId?: string;
  topic?: string;
  maxRounds?: number;
  parentSessionId?: string;
}

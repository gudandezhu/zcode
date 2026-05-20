export type TaskStage = "requirement" | "design" | "development" | "testing" | "done";
export type TaskStatus = "pending" | "running" | "waiting_review" | "checking" | "completed" | "failed";

export type TaskEvent = "start" | "complete" | "fail" | "approve" | "reject" | "advance" | "retry" | "pass";

export const TASK_TRANSITIONS: Record<TaskStatus, Partial<Record<TaskEvent, TaskStatus>>> = {
  pending: { start: "running" },
  running: { complete: "waiting_review", fail: "failed" },
  waiting_review: { approve: "completed", reject: "pending" },
  checking: { pass: "completed", fail: "failed" },
  completed: {},
  failed: { retry: "pending" },
};

export interface Artifact {
  type: string;
  title?: string;
  content?: string;
}

export interface SessionSummary {
  currentSessionStatus: string;
  currentRound: number;
  maxRounds: number;
  lastAction: string;
  activeSessionId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  stage: TaskStage;
  status: TaskStatus;
  artifacts: Artifact[];
  agentName: string;
  conversationId: string;
  projectId: string;
  parentTaskId: string;
  dependsOn: string[];
  gitBranch: string;
  createdAt: string;
  updatedAt: string;
  sessionSummary?: SessionSummary;
}

export interface TaskCreate {
  title: string;
  description?: string;
  stage?: TaskStage;
  parentTaskId?: string;
  dependsOn?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  stage?: TaskStage;
  status?: TaskStatus;
  artifacts?: Artifact[];
  agentName?: string;
  parentTaskId?: string;
  dependsOn?: string;
  gitBranch?: string;
}

import type { Task, TaskCreate, TaskUpdate, TaskEvent, Artifact } from "@zcode/shared";
import { TASK_TRANSITIONS } from "@zcode/shared";

import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { tasks } from "../db/schema";
import { eventHub } from "./events";
import { getAgentForStage, getNextStage, getGate } from "./pipeline";
import * as discussionSvc from "./discussion";
import crypto from "crypto";

function genId(): string {
  return crypto.randomBytes(4).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

export async function createTask(input: TaskCreate): Promise<Task> {
  const db = getDb();
  const id = genId();
  const t = now();
  const stage = input.stage || "requirement";
  const dependsOn = input.dependsOn
    ? (typeof input.dependsOn === "string" ? JSON.parse(input.dependsOn) : input.dependsOn)
    : [];
  await db.insert(tasks).values({
    id,
    title: input.title,
    description: input.description ?? "",
    stage,
    status: "pending",
    parentTaskId: input.parentTaskId ?? "",
    dependsOn,
    createdAt: t,
    updatedAt: t,
  });
  const task: Task = {
    id, title: input.title, description: input.description ?? "",
    stage, status: "pending", artifacts: [],
    agentName: "", conversationId: "", projectId: "",
    parentTaskId: input.parentTaskId ?? "",
    dependsOn,
    gitBranch: "", createdAt: t, updatedAt: t,
  };
  eventHub.publish("task_updated", task);
  return task;
}

export async function listTasks(stage?: string): Promise<Task[]> {
  const db = getDb();
  const rows = stage
    ? db.select().from(tasks).where(eq(tasks.stage, stage)).orderBy(desc(tasks.updatedAt))
    : db.select().from(tasks).orderBy(desc(tasks.updatedAt));
  return (await rows) as Task[];
}

export async function getTask(id: string): Promise<Task | null> {
  const db = getDb();
  const rows = await db.select().from(tasks).where(eq(tasks.id, id));
  if (rows.length === 0) return null;
  return rows[0] as Task;
}

export async function updateTask(id: string, input: TaskUpdate): Promise<Task | null> {
  const existing = await getTask(id);
  if (!existing) return null;
  const db = getDb();
  const t = now();
  const artifacts = input.artifacts !== undefined
    ? input.artifacts
    : existing.artifacts;
  const dependsOn = input.dependsOn !== undefined
    ? (typeof input.dependsOn === "string" ? JSON.parse(input.dependsOn) : [input.dependsOn])
    : existing.dependsOn;
  await db.update(tasks).set({
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    stage: input.stage ?? existing.stage,
    status: input.status ?? existing.status,
    artifacts,
    agentName: input.agentName ?? existing.agentName,
    parentTaskId: input.parentTaskId ?? existing.parentTaskId,
    dependsOn,
    gitBranch: input.gitBranch ?? existing.gitBranch,
    updatedAt: t,
  }).where(eq(tasks.id, id));
  const updated: Task = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    stage: input.stage ?? existing.stage,
    status: input.status ?? existing.status,
    artifacts,
    agentName: input.agentName ?? existing.agentName,
    parentTaskId: input.parentTaskId ?? existing.parentTaskId,
    dependsOn,
    gitBranch: input.gitBranch ?? existing.gitBranch,
    updatedAt: t,
  };
  eventHub.publish("task_updated", updated);

  // Auto-add agent to discussion board when stage changes
  if (input.stage && input.stage !== existing.stage) {
    const agentName = getAgentForStage(input.stage);
    if (agentName) {
      try {
        const board = await discussionSvc.getBoardByTask(id);
        if (board) {
          await discussionSvc.addParticipant(board.id, agentName);
        }
      } catch { /* board may not exist yet */ }
    }
  }

  return updated;
}

export async function deleteTask(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(tasks).where(eq(tasks.id, id));
  const changes = (result as { changes?: number; rowsAffected?: number }).changes ?? (result as { rowsAffected?: number }).rowsAffected ?? 0;
  if (changes > 0) {
    eventHub.publish("task_deleted", { id });
    return true;
  }
  return false;
}

export async function setTaskStatus(taskId: string, status: string): Promise<void> {
  await updateTask(taskId, { status: status as Task["status"] });
}

export async function transitionTask(id: string, event: TaskEvent): Promise<Task> {
  const task = await getTask(id);
  if (!task) throw new Error(`Task ${id} not found`);

  const transitions = TASK_TRANSITIONS[task.status];
  const newStatus = transitions[event];
  if (!newStatus) {
    throw new Error(`Cannot '${event}' a task in '${task.status}' state`);
  }

  const updated = await updateTask(id, { status: newStatus });
  if (!updated) throw new Error(`Task ${id} update failed`);
  return updated;
}

export async function completeSession(
  sessionId: string,
  taskId: string,
  sessionStatus: string,
  artifacts: Artifact[],
  advance?: boolean,
): Promise<Task> {
  const task = await getTask(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  // Merge non-internal artifacts
  const realArtifacts = (artifacts || []).filter(
    (a) => a.type !== "stage_advance",
  );
  const updates: TaskUpdate = {};
  if (realArtifacts.length > 0) {
    updates.artifacts = [...(task.artifacts || []), ...realArtifacts];
  }

  const shouldAdvance = advance || (artifacts || []).some(
    (a) => a.type === "stage_advance",
  );

  if (sessionStatus === "failed") {
    updates.status = "failed";
  } else if (sessionStatus === "completed" && shouldAdvance) {
    const nextStage = getNextStage(task.stage);
    if (nextStage) {
      updates.stage = nextStage as Task["stage"];
      updates.status = "running";
    } else {
      updates.stage = "done";
      updates.status = "completed";
    }
  } else if (sessionStatus === "completed") {
    const gate = getGate(task.stage);
    if (gate?.type === "human_review") {
      updates.status = "waiting_review";
    } else {
      updates.status = "completed";
    }
  }

  if (Object.keys(updates).length > 0) {
    const updated = await updateTask(taskId, updates);
    if (!updated) throw new Error(`Task ${taskId} update failed`);
    return updated;
  }
  return task;
}

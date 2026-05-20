import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { sessions } from "../db/schema";
import type { Session, Artifact } from "@zcode/shared";
import crypto from "crypto";

function genId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export async function createSession(input: {
  id?: string;
  agentName: string;
  taskId: string;
  type?: string;
  status?: string;
  participants?: string[];
  maxRounds?: number;
  parentSessionId?: string;
  artifacts?: Artifact[];
  boardId?: string;
  triggerMessageId?: string;
}): Promise<Session> {
  const db = getDb();
  const id = input.id || genId();
  const t = now();
  await db.insert(sessions).values({
    id,
    type: input.type || "main",
    agentName: input.agentName,
    taskId: input.taskId,
    participants: input.participants || [],
    status: input.status || "running",
    parentSessionId: input.parentSessionId || "",
    maxRounds: input.maxRounds || 50,
    currentRound: 0,
    currentSpeaker: "",
    artifacts: input.artifacts || [],
    boardId: input.boardId || "",
    triggerMessageId: input.triggerMessageId || "",
    createdAt: t,
    updatedAt: t,
  }).onConflictDoUpdate({
    target: sessions.id,
    set: {
      status: input.status || "running",
      artifacts: input.artifacts || [],
      updatedAt: t,
    },
  });
  return {
    id, type: (input.type || "main") as Session["type"],
    agentName: input.agentName, taskId: input.taskId,
    participants: input.participants || [],
    status: (input.status || "running") as Session["status"],
    parentSessionId: input.parentSessionId || "",
    maxRounds: input.maxRounds || 50, currentRound: 0,
    currentSpeaker: "",
    artifacts: input.artifacts || [],
    createdAt: t, updatedAt: t,
  };
}

export async function getSession(id: string): Promise<Session | null> {
  const db = getDb();
  const rows = await db.select().from(sessions).where(eq(sessions.id, id));
  if (rows.length === 0) return null;
  return rows[0] as unknown as Session;
}

export async function updateSessionStatus(id: string, status: string): Promise<void> {
  const db = getDb();
  await db.update(sessions).set({ status, updatedAt: now() }).where(eq(sessions.id, id));
}

export async function listSessionsByTask(taskId: string): Promise<Session[]> {
  const db = getDb();
  const rows = await db.select().from(sessions)
    .where(eq(sessions.taskId, taskId))
    .orderBy(sessions.createdAt);
  return rows as unknown as Session[];
}

export async function getMainSessionForTask(taskId: string): Promise<Session | null> {
  const db = getDb();
  const rows = await db.select().from(sessions)
    .where(and(eq(sessions.taskId, taskId), eq(sessions.type, "main")))
    .orderBy(desc(sessions.createdAt))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0] as unknown as Session;
}

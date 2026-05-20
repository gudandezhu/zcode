import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { sessions } from "../db/schema";
import type { Session } from "@zcode/shared";
import crypto from "crypto";

function genId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function mapRow(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    type: (row.type as string) as Session["type"],
    agentName: (row.agentName as string) || "",
    taskId: (row.taskId as string) || "",
    participants: JSON.parse((row.participants as string) || "[]"),
    status: (row.status as string) as Session["status"],
    parentSessionId: (row.parentSessionId as string) || "",
    maxRounds: (row.maxRounds as number) || 50,
    currentRound: (row.currentRound as number) || 0,
    currentSpeaker: (row.currentSpeaker as string) || "",
    artifacts: JSON.parse((row.artifacts as string) || "[]"),
    createdAt: (row.createdAt as string) || "",
    updatedAt: (row.updatedAt as string) || "",
  };
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
  artifacts?: Record<string, unknown>[];
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
    participants: JSON.stringify(input.participants || []),
    status: input.status || "running",
    parentSessionId: input.parentSessionId || "",
    maxRounds: input.maxRounds || 50,
    currentRound: 0,
    currentSpeaker: "",
    artifacts: JSON.stringify(input.artifacts || []),
    boardId: input.boardId || "",
    triggerMessageId: input.triggerMessageId || "",
    createdAt: t,
    updatedAt: t,
  }).onConflictDoUpdate({
    target: sessions.id,
    set: {
      status: input.status || "running",
      artifacts: JSON.stringify(input.artifacts || []),
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
    artifacts: (input.artifacts || []) as unknown as Session["artifacts"],
    createdAt: t, updatedAt: t,
  };
}

export async function getSession(id: string): Promise<Session | null> {
  const db = getDb();
  const rows = await db.select().from(sessions).where(eq(sessions.id, id));
  if (rows.length === 0) return null;
  return mapRow(rows[0]);
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
  return rows.map(mapRow);
}

export async function getMainSessionForTask(taskId: string): Promise<Session | null> {
  const db = getDb();
  const rows = await db.select().from(sessions)
    .where(and(eq(sessions.taskId, taskId), eq(sessions.type, "main")))
    .orderBy(desc(sessions.createdAt))
    .limit(1);
  if (rows.length === 0) return null;
  return mapRow(rows[0]);
}

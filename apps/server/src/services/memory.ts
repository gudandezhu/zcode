import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { projectMemories } from "../db/schema";
import type { Memory } from "@zcode/shared";
import crypto from "crypto";

function genId(): string {
  return crypto.randomBytes(4).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

export async function createMemory(
  projectId: string,
  input: { fact: string },
): Promise<Memory> {
  const db = getDb();
  const id = genId();
  const t = now();
  await db.insert(projectMemories).values({
    id,
    projectId,
    fact: input.fact,
    createdAt: t,
    updatedAt: t,
  });
  return { id, projectId, fact: input.fact, createdAt: t, updatedAt: t };
}

export async function listMemories(projectId: string): Promise<Memory[]> {
  const db = getDb();
  const rows = await db.select().from(projectMemories)
    .where(eq(projectMemories.projectId, projectId))
    .orderBy(projectMemories.updatedAt);
  return rows as Memory[];
}

export async function updateMemory(
  id: string,
  input: { fact?: string },
): Promise<Memory | null> {
  const db = getDb();
  const t = now();
  await db.update(projectMemories).set({
    fact: input.fact,
    updatedAt: t,
  }).where(eq(projectMemories.id, id));
  const rows = await db.select().from(projectMemories).where(eq(projectMemories.id, id));
  if (rows.length === 0) return null;
  return rows[0] as Memory;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(projectMemories).where(eq(projectMemories.id, id));
  const changes = (result as any).changes ?? (result as any).rowsAffected ?? 0;
  return changes > 0;
}

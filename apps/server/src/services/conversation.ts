import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { conversations, messages, tasks } from "../db/schema";
function now(): string {
  return new Date().toISOString();
}

export async function ensureConversation(
  conversationId: string,
  agentName: string,
  taskId: string,
): Promise<string> {
  const db = getDb();
  const t = now();
  await db.insert(conversations).values({
    id: conversationId,
    agentName,
    taskId,
    createdAt: t,
  }).onConflictDoNothing();
  if (taskId) {
    await db.update(tasks).set({
      conversationId,
      agentName,
    }).where(eq(tasks.id, taskId));
  }
  return conversationId;
}

export async function getHistory(conversationId: string): Promise<
  { role: string; content: string; created_at: string }[]
> {
  const db = getDb();
  const rows = await db.select({
    role: messages.role,
    content: messages.content,
    createdAt: messages.createdAt,
  }).from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.id);
  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    created_at: r.createdAt || "",
  }));
}

export async function saveMessage(
  conversationId: string,
  role: string,
  content: string,
): Promise<void> {
  const db = getDb();
  await db.insert(messages).values({
    conversationId,
    role,
    content,
    createdAt: now(),
  });
}

import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { discussionBoards, discussionMessages } from "../db/schema";
import { eventHub } from "./events";
import * as sessionSvc from "./session";
import { SkillLoader } from "../engine/skill-loader";
import type {
  DiscussionBoard,
  DiscussionMessage,
  BoardMessageCreate,
  ProtocolCreate,
  Reaction,
} from "@zcode/shared";
import crypto from "crypto";

function genId(): string {
  return crypto.randomBytes(4).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function mapBoard(row: Record<string, unknown>): DiscussionBoard {
  return {
    id: row.id as string,
    taskId: (row.taskId as string) || "",
    participants: JSON.parse((row.participants as string) || "[]"),
    status: (row.status as string) as DiscussionBoard["status"],
    createdAt: (row.createdAt as string) || "",
    updatedAt: (row.updatedAt as string) || "",
  };
}

function mapMessage(row: Record<string, unknown>): DiscussionMessage {
  return {
    id: row.id as string,
    boardId: (row.boardId as string) || "",
    speaker: row.speaker as string,
    content: row.content as string,
    triggerType: (row.triggerType as string) as DiscussionMessage["triggerType"],
    mentions: JSON.parse((row.mentions as string) || "[]"),
    topics: JSON.parse((row.topics as string) || "[]"),
    protocolType: (row.protocolType ?? null) as DiscussionMessage["protocolType"],
    protocolStatus: (row.protocolStatus ?? null) as DiscussionMessage["protocolStatus"],
    responsePolicy: (row.responsePolicy ?? null) as DiscussionMessage["responsePolicy"],
    reactions: JSON.parse((row.reactions as string) || "[]"),
    parentId: (row.parentId as string) || "",
    createdAt: (row.createdAt as string) || "",
  };
}

export async function getOrCreateBoard(taskId: string): Promise<DiscussionBoard> {
  const db = getDb();
  const rows = await db
    .select()
    .from(discussionBoards)
    .where(eq(discussionBoards.taskId, taskId));

  if (rows.length > 0) return mapBoard(rows[0]);

  const id = genId();
  const t = now();
  await db.insert(discussionBoards).values({
    id,
    taskId,
    participants: "[]",
    status: "active",
    createdAt: t,
    updatedAt: t,
  });
  return {
    id,
    taskId,
    participants: [],
    status: "active",
    createdAt: t,
    updatedAt: t,
  };
}

export async function getBoardByTask(taskId: string): Promise<DiscussionBoard | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(discussionBoards)
    .where(eq(discussionBoards.taskId, taskId));
  return rows.length > 0 ? mapBoard(rows[0]) : null;
}

export async function addParticipant(boardId: string, agentName: string): Promise<DiscussionBoard | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(discussionBoards)
    .where(eq(discussionBoards.id, boardId));
  if (rows.length === 0) return null;

  const board = mapBoard(rows[0]);
  if (board.participants.includes(agentName)) return board;

  const updated = [...board.participants, agentName];
  const t = now();
  await db
    .update(discussionBoards)
    .set({ participants: JSON.stringify(updated), updatedAt: t })
    .where(eq(discussionBoards.id, boardId));

  return { ...board, participants: updated, updatedAt: t };
}

export async function listMessages(
  boardId: string,
  limit = 50,
  offset = 0,
): Promise<DiscussionMessage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(discussionMessages)
    .where(eq(discussionMessages.boardId, boardId))
    .orderBy(desc(discussionMessages.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map(mapMessage).reverse();
}

export async function createMessage(
  boardId: string,
  input: BoardMessageCreate,
): Promise<DiscussionMessage> {
  const db = getDb();
  const id = genId();
  const t = now();

  await db.insert(discussionMessages).values({
    id,
    boardId,
    speaker: input.speaker,
    content: input.content,
    triggerType: input.triggerType ?? "mention",
    mentions: JSON.stringify(input.mentions ?? []),
    topics: JSON.stringify(input.topics ?? []),
    protocolType: input.protocolType ?? null,
    responsePolicy: input.responsePolicy ?? null,
    reactions: "[]",
    parentId: input.parentId ?? "",
    createdAt: t,
  });

  // Auto-add mentioned agents as participants
  if (input.mentions && input.mentions.length > 0) {
    for (const name of input.mentions) {
      await addParticipant(boardId, name);
    }
  }
  // Add speaker as participant
  await addParticipant(boardId, input.speaker);

  const msg: DiscussionMessage = {
    id,
    boardId,
    speaker: input.speaker,
    content: input.content,
    triggerType: input.triggerType ?? "mention",
    mentions: input.mentions ?? [],
    topics: input.topics ?? [],
    protocolType: input.protocolType ?? null,
    protocolStatus: null,
    responsePolicy: input.responsePolicy ?? null,
    reactions: [],
    parentId: input.parentId ?? "",
    createdAt: t,
  };

  // Lookup taskId for event publishing
  const taskId = await lookupTaskId(boardId);
  publishBoardEvent(boardId, taskId, "board_message", `${input.speaker} 发送了消息`, { message: msg });

  // Trigger mini-sessions for @mentioned agents
  if (input.mentions && input.mentions.length > 0) {
    await triggerMentionSessions(boardId, taskId, id, input.mentions);
  }

  return msg;
}

export async function addReaction(
  messageId: string,
  reaction: Reaction,
): Promise<DiscussionMessage | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(discussionMessages)
    .where(eq(discussionMessages.id, messageId));
  if (rows.length === 0) return null;

  const msg = mapMessage(rows[0]);
  const reactions = [...msg.reactions, reaction];
  await db
    .update(discussionMessages)
    .set({ reactions: JSON.stringify(reactions) })
    .where(eq(discussionMessages.id, messageId));

  const updated = { ...msg, reactions };
  const taskId = await lookupTaskId(msg.boardId);
  publishBoardEvent(msg.boardId, taskId, "board_reaction", `${reaction.agentName} ${reaction.action}`, { reaction });
  return updated;
}

export async function createProtocol(
  boardId: string,
  input: ProtocolCreate,
): Promise<DiscussionMessage> {
  const msg = await createMessage(boardId, {
    speaker: input.speaker,
    content: input.content,
    triggerType: "protocol",
    mentions: input.mentions,
    protocolType: input.protocolType,
    responsePolicy: "must_follow_protocol",
  });

  // Set initial protocol status to pending
  const db = getDb();
  await db
    .update(discussionMessages)
    .set({ protocolStatus: "pending" })
    .where(eq(discussionMessages.id, msg.id));

  const taskId = await lookupTaskId(boardId);
  publishBoardEvent(boardId, taskId, "board_protocol_update", `${input.speaker} 发起了 ${input.protocolType}`, {
    protocolType: input.protocolType,
    messageId: msg.id,
  });

  return { ...msg, protocolStatus: "pending" };
}

export async function updateProtocolStatus(
  messageId: string,
  status: DiscussionMessage["protocolStatus"],
): Promise<DiscussionMessage | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(discussionMessages)
    .where(eq(discussionMessages.id, messageId));
  if (rows.length === 0) return null;

  await db
    .update(discussionMessages)
    .set({ protocolStatus: status })
    .where(eq(discussionMessages.id, messageId));

  const msg = mapMessage(rows[0]);
  const taskId = await lookupTaskId(msg.boardId);
  publishBoardEvent(msg.boardId, taskId, "board_protocol_update", `协议状态变更为 ${status}`, {
    messageId,
    protocolStatus: status,
  });
  return { ...msg, protocolStatus: status };
}

function publishBoardEvent(
  boardId: string,
  taskId: string,
  event: string,
  summary: string,
  data?: Record<string, unknown>,
) {
  const payload = { type: event, boardId, taskId, ...data };
  eventHub.publish(`board:${boardId}`, payload);
  eventHub.publish("discussion_update", {
    type: "discussion_update",
    taskId,
    boardId,
    event,
    summary,
  });
}

async function lookupTaskId(boardId: string): Promise<string> {
  const db = getDb();
  const rows = await db.select().from(discussionBoards).where(eq(discussionBoards.id, boardId));
  return rows.length > 0 ? mapBoard(rows[0]).taskId : "";
}

export async function triggerMentionSessions(
  boardId: string,
  taskId: string,
  messageId: string,
  mentions: string[],
): Promise<void> {
  for (const agentName of mentions) {
    await sessionSvc.createSession({
      agentName,
      taskId,
      type: "discussion",
      boardId,
      triggerMessageId: messageId,
      maxRounds: 5,
    });
  }
}

export async function matchTopicsAndAddParticipants(
  boardId: string,
  content: string,
  excludeAgents: string[],
): Promise<string[]> {
  const loader = new SkillLoader();
  const matched: string[] = [];
  const lowerContent = content.toLowerCase();

  for (const agentName of loader.listAgents()) {
    if (excludeAgents.includes(agentName)) continue;
    const cfg = loader.getAgent(agentName);
    if (!cfg) continue;
    const topics = (cfg as any).discussion?.topics as string[] | undefined;
    if (!topics) continue;
    const isMatch = topics.some((t) => lowerContent.includes(t.toLowerCase()));
    if (isMatch) {
      await addParticipant(boardId, agentName);
      matched.push(agentName);
    }
  }
  return matched;
}

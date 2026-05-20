import { Hono } from "hono";
import * as svc from "../services/discussion";
import { eventHub } from "../services/events";

const taskDiscussion = new Hono();

// GET /api/tasks/:id/discussion
taskDiscussion.get("/:id/discussion", async (c) => {
  const taskId = c.req.param("id");
  const board = await svc.getOrCreateBoard(taskId);
  return c.json(board);
});

export { taskDiscussion };

const board = new Hono();

// GET /api/boards/:id/messages?limit=&offset=
board.get("/:id/messages", async (c) => {
  const boardId = c.req.param("id");
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const messages = await svc.listMessages(boardId, limit, offset);
  return c.json({ messages });
});

// POST /api/boards/:id/messages
board.post("/:id/messages", async (c) => {
  const boardId = c.req.param("id");
  const body = await c.req.json();
  const msg = await svc.createMessage(boardId, {
    speaker: body.speaker,
    content: body.content,
    triggerType: body.triggerType,
    mentions: body.mentions,
    topics: body.topics,
    protocolType: body.protocolType,
    responsePolicy: body.responsePolicy,
    parentId: body.parentId,
  });
  return c.json(msg);
});

// PATCH /api/boards/:id/messages/:mid — add reaction
board.patch("/:id/messages/:mid", async (c) => {
  const messageId = c.req.param("mid");
  const body = await c.req.json();
  const result = await svc.addReaction(messageId, {
    agentName: body.agentName,
    action: body.action,
    content: body.content ?? "",
  });
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

// POST /api/boards/:id/protocols
board.post("/:id/protocols", async (c) => {
  const boardId = c.req.param("id");
  const body = await c.req.json();
  const msg = await svc.createProtocol(boardId, {
    speaker: body.speaker,
    content: body.content,
    protocolType: body.protocolType,
    mentions: body.mentions ?? [],
  });
  return c.json(msg);
});

// PATCH /api/boards/:id/protocols/:mid — update protocol status
board.patch("/:id/protocols/:mid", async (c) => {
  const messageId = c.req.param("mid");
  const body = await c.req.json();
  const result = await svc.updateProtocolStatus(messageId, body.status);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});

// GET /api/boards/:id/stream — Board-level SSE
board.get("/:id/stream", (c) => {
  const boardId = c.req.param("id");
  const boardEvent = `board:${boardId}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`:heartbeat\n\n`));
      }, 15000);

      const unsub = eventHub.subscribe(boardEvent, send);

      const req = c.req.raw;
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        controller.close();
      });

      send({ type: "connected", boardId });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export { board };
export default board;

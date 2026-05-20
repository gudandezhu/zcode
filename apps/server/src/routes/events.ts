import { Hono } from "hono";
import { eventHub } from "../services/events";

const events = new Hono();

events.get("/", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      // heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`:heartbeat\n\n`));
      }, 15000);
      // subscribe to events
      const unsub = eventHub.subscribe("task_updated", send);
      const unsubDel = eventHub.subscribe("task_deleted", send);
      const unsubDisc = eventHub.subscribe("discussion_update", send);
      // cleanup on abort
      const req = c.req.raw;
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        unsubDel();
        unsubDisc();
        controller.close();
      });
      // send initial connection
      send({ type: "connected" });
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

export default events;

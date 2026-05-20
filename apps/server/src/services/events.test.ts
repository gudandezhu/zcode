import { describe, it, expect } from "vitest";
import { eventHub } from "./events";

describe("EventHub", () => {
  // Use a unique event name per test to avoid cross-test interference
  let counter = 0;
  function uniqueEvent() {
    return `test-event-${++counter}-${Date.now()}`;
  }

  it("subscribe and publish fires listener", () => {
    const evt = uniqueEvent();
    const received: unknown[] = [];
    eventHub.subscribe(evt, (data) => received.push(data));

    eventHub.publish(evt, { msg: "hello" });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ msg: "hello" });
  });

  it("multiple listeners for same event", () => {
    const evt = uniqueEvent();
    const received1: unknown[] = [];
    const received2: unknown[] = [];
    eventHub.subscribe(evt, (data) => received1.push(data));
    eventHub.subscribe(evt, (data) => received2.push(data));

    eventHub.publish(evt, 42);

    expect(received1).toEqual([42]);
    expect(received2).toEqual([42]);
  });

  it("unsubscribe stops notifications", () => {
    const evt = uniqueEvent();
    const received: unknown[] = [];
    const unsub = eventHub.subscribe(evt, (data) => received.push(data));

    unsub();
    eventHub.publish(evt, "after-unsub");

    expect(received).toHaveLength(0);
  });

  it("publish with no subscribers is safe", () => {
    expect(() => eventHub.publish("nonexistent-" + Date.now(), "data")).not.toThrow();
  });

  it("subscribe returns unsubscribe function", () => {
    const evt = uniqueEvent();
    const unsub = eventHub.subscribe(evt, () => {});
    expect(typeof unsub).toBe("function");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LiveSession, SessionManager } from "./session";

describe("LiveSession", () => {
  it("construction with defaults", () => {
    const s = new LiveSession({ agentName: "test-agent" });
    expect(s.agentName).toBe("test-agent");
    expect(s.sessionType).toBe("main");
    expect(s.taskId).toBe("");
    expect(s.context).toBe("");
    expect(s.participants).toEqual([]);
    expect(s.status).toBe("running");
    expect(s.parentSessionId).toBe("");
    expect(s.maxRounds).toBe(50);
    expect(s.currentRound).toBe(0);
    expect(s.currentSpeaker).toBe("");
    expect(s.artifacts).toEqual([]);
    expect(s.messages).toEqual([]);
    expect(s.events).toEqual([]);
    expect(s.id).toBeTruthy();
  });

  it("construction with custom options", () => {
    const s = new LiveSession({
      agentName: "dev-agent",
      taskId: "task-1",
      context: "build feature X",
      sessionType: "discussion",
      participants: ["agent-a", "agent-b"],
      maxRounds: 10,
      parentSessionId: "parent-123",
    });
    expect(s.agentName).toBe("dev-agent");
    expect(s.taskId).toBe("task-1");
    expect(s.context).toBe("build feature X");
    expect(s.sessionType).toBe("discussion");
    expect(s.participants).toEqual(["agent-a", "agent-b"]);
    expect(s.maxRounds).toBe(10);
    expect(s.parentSessionId).toBe("parent-123");
  });

  it("addMessage pushes to messages array", () => {
    const s = new LiveSession({ agentName: "a" });
    s.addMessage("user", "hello");
    s.addMessage("assistant", "world", { extra: "data" });

    expect(s.messages).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "world", extra: "data" },
    ]);
  });

  it("messages getter returns copy", () => {
    const s = new LiveSession({ agentName: "a" });
    s.addMessage("user", "hello");
    const msgs = s.messages;
    msgs.push({ role: "hacked", content: "nope" } as any);
    expect(s.messages).toHaveLength(1);
  });

  it("emit and waitForEvent async flow", async () => {
    const s = new LiveSession({ agentName: "a" });

    const eventP = s.waitForEvent();
    s.emit({ type: "text", content: "hello" });

    const evt = await eventP;
    expect(evt).toEqual({ type: "text", content: "hello" });
    expect(s.events).toEqual([{ type: "text", content: "hello" }]);
  });

  it("emit resolves multiple waiting promises", async () => {
    const s = new LiveSession({ agentName: "a" });
    const p1 = s.waitForEvent();
    const p2 = s.waitForEvent();

    s.emit({ type: "text", content: "broadcast" });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ type: "text", content: "broadcast" });
    expect(r2).toEqual({ type: "text", content: "broadcast" });
  });

  it("emitDone resolves waiting with null", async () => {
    const s = new LiveSession({ agentName: "a" });
    const eventP = s.waitForEvent();

    s.emitDone();

    const evt = await eventP;
    expect(evt).toBeNull();
  });

  it("waitForUserInput and resolveUserInput pair", async () => {
    const s = new LiveSession({ agentName: "a" });

    const inputP = s.waitForUserInput();
    s.resolveUserInput("my answer");

    const input = await inputP;
    expect(input).toBe("my answer");
  });

  it("resolveUserInput with no pending resolver does nothing", () => {
    const s = new LiveSession({ agentName: "a" });
    expect(() => s.resolveUserInput("ignored")).not.toThrow();
  });

  it("isExpired returns false for running status", () => {
    const s = new LiveSession({ agentName: "a" });
    s.status = "running";
    expect(s.isExpired()).toBe(false);
  });

  it("isExpired returns false for waiting_user status", () => {
    const s = new LiveSession({ agentName: "a" });
    s.status = "waiting_user";
    expect(s.isExpired()).toBe(false);
  });

  it("isExpired returns true for old completed sessions", () => {
    const s = new LiveSession({ agentName: "a" });
    s.status = "completed";
    s.updatedAt = Date.now() - 3600_000 - 1; // > 1 hour ago
    expect(s.isExpired()).toBe(true);
  });

  it("isExpired returns false for recent completed sessions", () => {
    const s = new LiveSession({ agentName: "a" });
    s.status = "completed";
    s.updatedAt = Date.now() - 1000; // 1 second ago
    expect(s.isExpired()).toBe(false);
  });

  it("isExpired returns true for old failed sessions", () => {
    const s = new LiveSession({ agentName: "a" });
    s.status = "failed";
    s.updatedAt = Date.now() - 3600_000 - 1;
    expect(s.isExpired()).toBe(true);
  });
});

describe("SessionManager", () => {
  let mgr: SessionManager;

  beforeEach(() => {
    mgr = new SessionManager();
  });

  it("create adds session and returns it", () => {
    const s = mgr.create({ agentName: "test-agent" });
    expect(s.id).toBeTruthy();
    expect(s.agentName).toBe("test-agent");
    expect(mgr.get(s.id)).toBe(s);
  });

  it("get returns undefined for unknown id", () => {
    expect(mgr.get("nonexistent")).toBeUndefined();
  });

  it("listByTask returns sessions for given task", () => {
    const s1 = mgr.create({ agentName: "a", taskId: "task-1" });
    const s2 = mgr.create({ agentName: "b", taskId: "task-1" });
    mgr.create({ agentName: "c", taskId: "task-2" });

    const result = mgr.listByTask("task-1");
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toContain(s1.id);
    expect(result.map((s) => s.id)).toContain(s2.id);
  });

  it("listByTask returns empty array for unknown task", () => {
    expect(mgr.listByTask("nonexistent")).toEqual([]);
  });

  it("cleanup removes expired sessions", () => {
    const s1 = mgr.create({ agentName: "a" });
    const s2 = mgr.create({ agentName: "b" });
    s2.status = "completed";
    s2.updatedAt = Date.now() - 3600_000 - 1; // expired

    mgr.cleanup();

    expect(mgr.get(s1.id)).toBe(s1); // running, not cleaned up
    expect(mgr.get(s2.id)).toBeUndefined(); // completed + expired, cleaned up
  });
});

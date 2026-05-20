import { describe, it, expect } from "vitest";
import * as sessionSvc from "./session";

describe("session service", () => {
  it("createSession returns session with defaults", async () => {
    const s = await sessionSvc.createSession({
      agentName: "test-agent",
      taskId: "task-1",
    });

    expect(s.id).toBeTruthy();
    expect(s.type).toBe("main");
    expect(s.agentName).toBe("test-agent");
    expect(s.taskId).toBe("task-1");
    expect(s.participants).toEqual([]);
    expect(s.status).toBe("running");
    expect(s.parentSessionId).toBe("");
    expect(s.maxRounds).toBe(50);
    expect(s.currentRound).toBe(0);
    expect(s.currentSpeaker).toBe("");
    expect(s.artifacts).toEqual([]);
  });

  it("createSession with all options", async () => {
    const s = await sessionSvc.createSession({
      agentName: "dev",
      taskId: "t2",
      type: "discussion",
      status: "completed",
      participants: ["a", "b"],
      maxRounds: 10,
      parentSessionId: "parent-1",
      artifacts: [{ type: "doc", content: "hello" }],
    });

    expect(s.type).toBe("discussion");
    expect(s.status).toBe("completed");
    expect(s.participants).toEqual(["a", "b"]);
    expect(s.maxRounds).toBe(10);
    expect(s.parentSessionId).toBe("parent-1");
    expect(s.artifacts).toEqual([{ type: "doc", content: "hello" }]);
  });

  it("createSession with custom id", async () => {
    const s = await sessionSvc.createSession({
      id: "custom-id-123",
      agentName: "a",
      taskId: "t1",
    });
    expect(s.id).toBe("custom-id-123");
  });

  it("createSession upserts on conflict", async () => {
    const s1 = await sessionSvc.createSession({
      id: "upsert-test",
      agentName: "a",
      taskId: "t1",
      status: "running",
    });

    const s2 = await sessionSvc.createSession({
      id: "upsert-test",
      agentName: "a",
      taskId: "t1",
      status: "completed",
    });

    // Should update, not fail
    expect(s2.status).toBe("completed");
  });

  it("getSession returns created session", async () => {
    const created = await sessionSvc.createSession({
      agentName: "fetch-agent",
      taskId: "t3",
    });

    const fetched = await sessionSvc.getSession(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.agentName).toBe("fetch-agent");
    expect(fetched!.taskId).toBe("t3");
  });

  it("getSession returns null for nonexistent", async () => {
    const fetched = await sessionSvc.getSession("nonexistent");
    expect(fetched).toBeNull();
  });

  it("updateSessionStatus changes status", async () => {
    const created = await sessionSvc.createSession({
      agentName: "a",
      taskId: "t4",
    });

    await sessionSvc.updateSessionStatus(created.id, "completed");

    const fetched = await sessionSvc.getSession(created.id);
    expect(fetched!.status).toBe("completed");
  });

  it("listSessionsByTask returns sessions for task", async () => {
    await sessionSvc.createSession({ agentName: "a", taskId: "list-test" });
    await sessionSvc.createSession({ agentName: "b", taskId: "list-test" });
    await sessionSvc.createSession({ agentName: "c", taskId: "other" });

    const list = await sessionSvc.listSessionsByTask("list-test");
    expect(list).toHaveLength(2);
    expect(list.every((s) => s.taskId === "list-test")).toBe(true);
  });

  it("getMainSessionForTask returns main type session", async () => {
    await sessionSvc.createSession({
      agentName: "main-agent",
      taskId: "main-test",
      type: "main",
    });
    await sessionSvc.createSession({
      agentName: "disc-agent",
      taskId: "main-test",
      type: "discussion",
    });

    const main = await sessionSvc.getMainSessionForTask("main-test");
    expect(main).not.toBeNull();
    expect(main!.type).toBe("main");
    expect(main!.agentName).toBe("main-agent");
  });

  it("getMainSessionForTask returns null when no main session", async () => {
    const result = await sessionSvc.getMainSessionForTask("no-sessions");
    expect(result).toBeNull();
  });

  it("createSession and getSession round-trip preserves data", async () => {
    const created = await sessionSvc.createSession({
      agentName: "round-trip",
      taskId: "rt-task",
      type: "discussion",
      participants: ["p1", "p2"],
      maxRounds: 5,
      parentSessionId: "parent",
    });

    const fetched = await sessionSvc.getSession(created.id);
    expect(fetched).toMatchObject({
      id: created.id,
      agentName: "round-trip",
      taskId: "rt-task",
      type: "discussion",
      participants: ["p1", "p2"],
      maxRounds: 5,
      parentSessionId: "parent",
    });
  });
});

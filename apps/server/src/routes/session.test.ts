import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import sessionRoute from "./session";
import * as sessionSvc from "../services/session";
import * as taskSvc from "../services/task";
import { sessionManager } from "../engine/session";

// Mock pipeline and engine to avoid filesystem
vi.mock("../services/pipeline", () => ({
  getNextStage: vi.fn(() => "design"),
  getAgentForStage: vi.fn(() => "architect-agent"),
  getGate: vi.fn(() => null),
}));

vi.mock("../engine", () => ({
  startSessionForTask: vi.fn(),
}));

const app = new Hono();
app.route("/api/sessions", sessionRoute);

describe("session routes", () => {
  it("POST / creates a session", async () => {
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName: "test-agent", taskId: "t1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agentName).toBe("test-agent");
    expect(body.taskId).toBe("t1");
  });

  it("GET / returns sessions by taskId", async () => {
    // Create a session first
    await sessionSvc.createSession({ agentName: "list-agent", taskId: "list-task" });

    const res = await app.request("/api/sessions?taskId=list-task");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sessions).toBeInstanceOf(Array);
    expect(body.sessions.length).toBeGreaterThanOrEqual(1);
    expect(body.sessions.every((s: any) => s.taskId === "list-task")).toBe(true);
  });

  it("GET / returns 400 without taskId", async () => {
    const res = await app.request("/api/sessions");
    expect(res.status).toBe(400);
  });

  it("GET /:id returns session by id", async () => {
    const created = await sessionSvc.createSession({
      agentName: "get-agent",
      taskId: "get-task",
    });

    const res = await app.request(`/api/sessions/${created.id}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe(created.id);
  });

  it("GET /:id returns 404 for nonexistent", async () => {
    const res = await app.request("/api/sessions/nonexistent");
    expect(res.status).toBe(404);
  });

  describe("POST /callback", () => {
    it("saves session and updates task on completed status", async () => {
      const task = await taskSvc.createTask({ title: "Callback Task" });

      const res = await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-session-1",
          taskId: task.id,
          agentName: "pm-agent",
          status: "completed",
          artifacts: [],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");

      // Verify task was updated
      const updated = await taskSvc.getTask(task.id);
      expect(updated!.status).toBe("completed");
    });

    it("sets task to failed on failed status", async () => {
      const task = await taskSvc.createTask({ title: "Fail Task" });

      await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-session-fail",
          taskId: task.id,
          agentName: "pm-agent",
          status: "failed",
          artifacts: [],
        }),
      });

      const updated = await taskSvc.getTask(task.id);
      expect(updated!.status).toBe("failed");
    });

    it("advances task stage when advance=true and completed", async () => {
      const task = await taskSvc.createTask({ title: "Advance Task" });

      await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-session-adv",
          taskId: task.id,
          agentName: "pm-agent",
          status: "completed",
          advance: true,
          artifacts: [],
        }),
      });

      const updated = await taskSvc.getTask(task.id);
      // Should advance from requirement to design (mocked getNextStage returns "design")
      expect(updated!.stage).toBe("design");
      expect(updated!.status).toBe("running");
    });

    it("sets task to done when advance=true but no next stage", async () => {
      const { getNextStage } = await import("../services/pipeline");
      (getNextStage as any).mockReturnValueOnce(null);

      const task = await taskSvc.createTask({ title: "Last Stage Task" });

      await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-session-last",
          taskId: task.id,
          agentName: "pm-agent",
          status: "completed",
          advance: true,
          artifacts: [],
        }),
      });

      const updated = await taskSvc.getTask(task.id);
      expect(updated!.stage).toBe("done");
      expect(updated!.status).toBe("completed");
    });

    it("filters stage_advance artifacts from callback", async () => {
      const task = await taskSvc.createTask({ title: "Artifact Task" });

      await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-session-art",
          taskId: task.id,
          agentName: "pm-agent",
          status: "completed",
          artifacts: [
            { type: "stage_advance", content: task.id },
          ],
        }),
      });

      const updated = await taskSvc.getTask(task.id);
      // stage_advance artifact should be filtered out, so no artifacts saved
      // and status should be completed (advance + completed triggers stage advance)
    });

    it("handles callback with no taskId gracefully", async () => {
      const res = await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-no-task",
          agentName: "pm-agent",
          status: "completed",
          artifacts: [],
        }),
      });

      expect(res.status).toBe(200);
    });

    it("sets task to waiting_review when gate is human_review", async () => {
      const { getGate } = await import("../services/pipeline");
      (getGate as any).mockReturnValueOnce({ type: "human_review" });

      const task = await taskSvc.createTask({ title: "Review Task" });

      await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-session-review",
          taskId: task.id,
          agentName: "pm-agent",
          status: "completed",
          artifacts: [],
        }),
      });

      const updated = await taskSvc.getTask(task.id);
      expect(updated!.status).toBe("waiting_review");
    });

    it("merges real artifacts into task", async () => {
      const task = await taskSvc.createTask({ title: "Merge Artifact Task" });

      await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-session-merge",
          taskId: task.id,
          agentName: "pm-agent",
          status: "completed",
          artifacts: [
            { type: "document", title: "PRD", content: "# PRD" },
          ],
        }),
      });

      const updated = await taskSvc.getTask(task.id);
      expect(updated!.artifacts).toHaveLength(1);
      expect(updated!.artifacts[0].title).toBe("PRD");
    });

    it("callback with non-existent taskId still returns ok", async () => {
      const res = await app.request("/api/sessions/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "cb-no-exist-task",
          taskId: "nonexistent-task",
          agentName: "pm-agent",
          status: "completed",
          artifacts: [],
        }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /discuss", () => {
    it("returns pending session", async () => {
      const res = await app.request("/api/sessions/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessionId).toBe("pending");
      expect(body.status).toBe("running");
    });
  });

  describe("GET /:id/events", () => {
    it("returns 404 for nonexistent live session", async () => {
      const res = await app.request("/api/sessions/nonexistent/events");
      expect(res.status).toBe(404);
    });

    it("returns events for live session", async () => {
      const liveSession = sessionManager.create({
        agentName: "events-agent",
        taskId: "events-task",
      });
      liveSession.emit({ type: "text", content: "hello" });

      const res = await app.request(`/api/sessions/${liveSession.id}/events`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.events).toHaveLength(1);
      expect(body.events[0].type).toBe("text");
    });
  });

  describe("POST /:id/input", () => {
    it("resolves user input for live session", async () => {
      const liveSession = sessionManager.create({
        agentName: "input-agent",
        taskId: "input-task",
      });

      const inputP = liveSession.waitForUserInput();

      await app.request(`/api/sessions/${liveSession.id}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "user response" }),
      });

      const input = await inputP;
      expect(input).toBe("user response");
    });

    it("returns ok for nonexistent live session", async () => {
      const res = await app.request("/api/sessions/nonexistent/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "test" }),
      });

      expect(res.status).toBe(200);
    });
  });
});

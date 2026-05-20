import { describe, it, expect, vi, beforeEach } from "vitest";
import * as taskSvc from "./task";

// Mock pipeline and discussion to avoid filesystem access
vi.mock("./pipeline", () => ({
  getAgentForStage: vi.fn(() => "pm-agent"),
  getNextStage: vi.fn(() => null),
  getGate: vi.fn(() => null),
}));

vi.mock("./discussion", () => ({
  getBoardByTask: vi.fn(() => null),
  addParticipant: vi.fn(),
}));

vi.mock("../engine", () => ({
  startSessionForTask: vi.fn(),
}));

vi.mock("./session", () => ({
  createSession: vi.fn(),
  listSessionsByTask: vi.fn(() => []),
}));

describe("transitionTask", () => {
  // Legal transitions
  it("pending + start → running", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    const result = await taskSvc.transitionTask(task.id, "start");
    expect(result.status).toBe("running");
  });

  it("running + fail → failed", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    const result = await taskSvc.transitionTask(task.id, "fail");
    expect(result.status).toBe("failed");
  });

  it("running + complete → waiting_review", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    const result = await taskSvc.transitionTask(task.id, "complete");
    expect(result.status).toBe("waiting_review");
  });

  it("waiting_review + approve → completed", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    await taskSvc.transitionTask(task.id, "complete");
    const result = await taskSvc.transitionTask(task.id, "approve");
    expect(result.status).toBe("completed");
  });

  it("waiting_review + reject → pending", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    await taskSvc.transitionTask(task.id, "complete");
    const result = await taskSvc.transitionTask(task.id, "reject");
    expect(result.status).toBe("pending");
  });

  it("failed + retry → pending", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    await taskSvc.transitionTask(task.id, "fail");
    const result = await taskSvc.transitionTask(task.id, "retry");
    expect(result.status).toBe("pending");
  });

  // Illegal transitions
  it("rejects illegal: pending + approve", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await expect(taskSvc.transitionTask(task.id, "approve")).rejects.toThrow(/Cannot/);
  });

  it("rejects illegal: completed + retry", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    await taskSvc.transitionTask(task.id, "complete");
    await taskSvc.transitionTask(task.id, "approve");
    await expect(taskSvc.transitionTask(task.id, "retry")).rejects.toThrow(/Cannot/);
  });

  // DB persistence
  it("persists new status to DB", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    const fetched = await taskSvc.getTask(task.id);
    expect(fetched!.status).toBe("running");
  });

  // Nonexistent task
  it("throws for nonexistent task", async () => {
    await expect(taskSvc.transitionTask("nonexistent", "start")).rejects.toThrow(/not found/);
  });
});

describe("task service", () => {
  it("createTask returns a task with correct defaults", async () => {
    const task = await taskSvc.createTask({ title: "Test Task" });

    expect(task.id).toBeTruthy();
    expect(task.title).toBe("Test Task");
    expect(task.description).toBe("");
    expect(task.stage).toBe("requirement");
    expect(task.status).toBe("pending");
    expect(task.artifacts).toEqual([]);
    expect(task.agentName).toBe("");
    expect(task.parentTaskId).toBe("");
    expect(task.dependsOn).toEqual([]);
    expect(task.gitBranch).toBe("");
  });

  it("createTask with all options", async () => {
    const task = await taskSvc.createTask({
      title: "Feature",
      description: "Build feature X",
      stage: "design",
      parentTaskId: "parent-1",
      dependsOn: '["task-a"]',
    });

    expect(task.title).toBe("Feature");
    expect(task.description).toBe("Build feature X");
    expect(task.stage).toBe("design");
    expect(task.parentTaskId).toBe("parent-1");
    expect(task.dependsOn).toEqual(["task-a"]);
  });

  it("createTask with dependsOn as JSON string", async () => {
    const task = await taskSvc.createTask({
      title: "Task",
      dependsOn: '["a", "b"]',
    });
    expect(task.dependsOn).toEqual(["a", "b"]);
  });

  it("getTask returns created task", async () => {
    const created = await taskSvc.createTask({ title: "Round Trip" });
    const fetched = await taskSvc.getTask(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.title).toBe("Round Trip");
  });

  it("getTask returns null for nonexistent id", async () => {
    const fetched = await taskSvc.getTask("nonexistent");
    expect(fetched).toBeNull();
  });

  it("listTasks returns all tasks", async () => {
    await taskSvc.createTask({ title: "T1" });
    await taskSvc.createTask({ title: "T2" });

    const list = await taskSvc.listTasks();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((t) => t.title === "T1")).toBe(true);
    expect(list.some((t) => t.title === "T2")).toBe(true);
  });

  it("listTasks filters by stage", async () => {
    await taskSvc.createTask({ title: "Req", stage: "requirement" });
    await taskSvc.createTask({ title: "Dev", stage: "development" });

    const reqTasks = await taskSvc.listTasks("requirement");
    expect(reqTasks.every((t) => t.stage === "requirement")).toBe(true);
  });

  it("updateTask modifies existing task", async () => {
    const created = await taskSvc.createTask({ title: "Original" });
    const updated = await taskSvc.updateTask(created.id, {
      title: "Updated",
      status: "running",
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Updated");
    expect(updated!.status).toBe("running");
    expect(updated!.id).toBe(created.id);
  });

  it("updateTask returns null for nonexistent id", async () => {
    const result = await taskSvc.updateTask("nonexistent", { title: "X" });
    expect(result).toBeNull();
  });

  it("updateTask with artifacts array", async () => {
    const created = await taskSvc.createTask({ title: "Art" });
    const updated = await taskSvc.updateTask(created.id, {
      artifacts: [{ type: "doc", title: "PRD" }],
    });

    expect(updated!.artifacts).toEqual([{ type: "doc", title: "PRD" }]);
  });

  it("deleteTask removes task", async () => {
    const created = await taskSvc.createTask({ title: "To Delete" });
    const deleted = await taskSvc.deleteTask(created.id);
    expect(deleted).toBe(true);

    const fetched = await taskSvc.getTask(created.id);
    expect(fetched).toBeNull();
  });

  it("deleteTask returns false for nonexistent id", async () => {
    const deleted = await taskSvc.deleteTask("nonexistent");
    expect(deleted).toBe(false);
  });

  it("setTaskStatus updates status", async () => {
    const created = await taskSvc.createTask({ title: "Status" });
    await taskSvc.setTaskStatus(created.id, "running");

    const fetched = await taskSvc.getTask(created.id);
    expect(fetched!.status).toBe("running");
  });

  it("createTask and getTask round-trip preserves data", async () => {
    const created = await taskSvc.createTask({
      title: "Full Round Trip",
      description: "desc",
      stage: "design",
      parentTaskId: "p1",
      dependsOn: '["d1"]',
    });

    const fetched = await taskSvc.getTask(created.id);
    expect(fetched).toMatchObject({
      id: created.id,
      title: "Full Round Trip",
      description: "desc",
      stage: "design",
      status: "pending",
      parentTaskId: "p1",
      dependsOn: ["d1"],
    });
  });
});

describe("completeSession", () => {
  it("marks task failed when session fails", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    await taskSvc.completeSession("sess-1", task.id, "failed", []);

    const fetched = await taskSvc.getTask(task.id);
    expect(fetched!.status).toBe("failed");
  });

  it("marks task completed when session completes with no next stage", async () => {
    const task = await taskSvc.createTask({ title: "T" });
    await taskSvc.transitionTask(task.id, "start");
    await taskSvc.completeSession("sess-1", task.id, "completed", []);

    const fetched = await taskSvc.getTask(task.id);
    expect(fetched!.status).toBe("completed");
  });

  it("throws for nonexistent task", async () => {
    await expect(
      taskSvc.completeSession("sess-1", "nonexistent", "failed", []),
    ).rejects.toThrow(/not found/);
  });
});

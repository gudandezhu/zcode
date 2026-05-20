import { describe, it, expect } from "vitest";
import { applyTaskEvents, isDiscussionEvent } from "./event-stream";
import type { Task } from "@/lib/api";

const baseTask = (id: string, title: string): Task =>
  ({
    id,
    title,
    description: "",
    stage: "requirement",
    status: "pending",
    artifacts: [],
    agentName: "",
    conversationId: "",
    projectId: "",
    parentTaskId: "",
    dependsOn: [],
    gitBranch: "",
    createdAt: "",
    updatedAt: "",
  }) as Task;

describe("event-stream", () => {
  describe("applyTaskEvents", () => {
    const tasks: Task[] = [baseTask("1", "A"), baseTask("2", "B")];

    it("task_updated replaces existing task by id", () => {
      const updated = baseTask("1", "A-updated");
      updated.status = "completed";
      const result = applyTaskEvents(tasks, {
        type: "task_updated",
        data: updated,
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("A-updated");
      expect(result[0].status).toBe("completed");
    });

    it("task_updated appends new task", () => {
      const newTask = baseTask("3", "C");
      const result = applyTaskEvents(tasks, {
        type: "task_updated",
        data: newTask,
      });
      expect(result).toHaveLength(3);
      expect(result[2].id).toBe("3");
    });

    it("task_deleted removes task", () => {
      const result = applyTaskEvents(tasks, {
        type: "task_deleted",
        data: { id: "1" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("unknown event type returns unchanged array", () => {
      const result = applyTaskEvents(tasks, {
        type: "unknown_event",
        data: {},
      });
      expect(result).toBe(tasks);
    });
  });

  describe("isDiscussionEvent", () => {
    it("returns true for discussion_update", () => {
      expect(isDiscussionEvent({ type: "discussion_update", data: {} })).toBe(
        true,
      );
    });

    it("returns false for other types", () => {
      expect(isDiscussionEvent({ type: "task_updated", data: {} })).toBe(
        false,
      );
      expect(isDiscussionEvent({ type: "task_deleted", data: {} })).toBe(
        false,
      );
      expect(isDiscussionEvent({ type: "other", data: {} })).toBe(false);
    });
  });
});

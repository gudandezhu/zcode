import { describe, it, expect } from "vitest";
import {
  getToolIcon,
  formatToolLabel,
  mergeEventsToSteps,
} from "./live-stream-logic";
import type { SessionEvent } from "./api";

describe("live-stream-logic", () => {
  describe("getToolIcon", () => {
    it("returns file for read/write/str_replace", () => {
      expect(getToolIcon("read")).toBe("file");
      expect(getToolIcon("write")).toBe("file");
      expect(getToolIcon("str_replace")).toBe("file");
    });

    it("returns search for search/web_search", () => {
      expect(getToolIcon("search")).toBe("search");
      expect(getToolIcon("web_search")).toBe("search");
    });

    it("returns terminal for bash/exec/command", () => {
      expect(getToolIcon("bash")).toBe("terminal");
      expect(getToolIcon("exec")).toBe("terminal");
      expect(getToolIcon("command")).toBe("terminal");
    });

    it("returns folder for ls/list/dir", () => {
      expect(getToolIcon("ls")).toBe("folder");
      expect(getToolIcon("list")).toBe("folder");
      expect(getToolIcon("dir")).toBe("folder");
    });

    it("returns wrench for unknown", () => {
      expect(getToolIcon("unknown")).toBe("wrench");
      expect(getToolIcon("foo_bar")).toBe("wrench");
    });
  });

  describe("formatToolLabel", () => {
    it("with valid JSON args returns first short value", () => {
      expect(formatToolLabel("mytool", '{"path": "/foo.ts"}')).toBe("/foo.ts");
    });

    it("with long value (>50 chars) returns tool name", () => {
      const longVal = "a".repeat(51);
      expect(formatToolLabel("mytool", `{"key": "${longVal}"}`)).toBe("mytool");
    });

    it("with invalid JSON returns tool name", () => {
      expect(formatToolLabel("mytool", "not-json")).toBe("mytool");
    });

    it("with empty args returns tool name", () => {
      expect(formatToolLabel("mytool")).toBe("mytool");
      expect(formatToolLabel("mytool", "")).toBe("mytool");
      expect(formatToolLabel("mytool", "{}")).toBe("mytool");
    });
  });

  describe("mergeEventsToSteps", () => {
    it("with text events creates output step", () => {
      const events: SessionEvent[] = [
        { type: "text", content: "Hello ", timestamp: 1 },
        { type: "text", content: "world", timestamp: 2 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe("output");
      expect(steps[0].detail).toBe("Hello world");
    });

    it("with tool_call + tool_result creates tool step", () => {
      const events: SessionEvent[] = [
        {
          type: "tool_call",
          name: "read",
          arguments: '{"path": "a.ts"}',
          timestamp: 1,
        },
        { type: "tool_result", content: "ok", timestamp: 2 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe("tool");
      expect(steps[0].status).toBe("done");
      expect(steps[0].detail).toBe("ok");
    });

    it("with error event creates error step", () => {
      const events: SessionEvent[] = [
        { type: "error", content: "boom", timestamp: 1 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe("error");
      expect(steps[0].status).toBe("error");
      expect(steps[0].label).toBe("boom");
    });

    it("with session_completed creates complete step", () => {
      const events: SessionEvent[] = [
        { type: "session_completed", timestamp: 1 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe("complete");
      expect(steps[0].label).toBe("执行完成");
    });

    it("with clarify_user sets clarifyQuestion", () => {
      const events: SessionEvent[] = [
        { type: "clarify_user", question: "What?", timestamp: 1 },
      ];
      const { steps, clarifyQuestion } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(0);
      expect(clarifyQuestion).toBe("What?");
    });

    it("closes text step when non-text event follows", () => {
      const events: SessionEvent[] = [
        { type: "text", content: "hi", timestamp: 1 },
        { type: "session_completed", timestamp: 2 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(2);
      expect(steps[0].type).toBe("output");
      expect(steps[0].status).toBe("done");
    });

    it("with tool_result > 120 chars does not set detail", () => {
      const longContent = "x".repeat(130);
      const events: SessionEvent[] = [
        {
          type: "tool_call",
          name: "read",
          arguments: "{}",
          timestamp: 1,
        },
        { type: "tool_result", content: longContent, timestamp: 2 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps[0].detail).toBeUndefined();
    });

    it("with consecutive tool_calls closes previous", () => {
      const events: SessionEvent[] = [
        {
          type: "tool_call",
          name: "read",
          arguments: "{}",
          timestamp: 1,
        },
        {
          type: "tool_call",
          name: "write",
          arguments: "{}",
          timestamp: 2,
        },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(2);
      expect(steps[0].status).toBe("done");
      expect(steps[1].status).toBe("active");
    });

    it("tool_result without prior tool_call is ignored", () => {
      const events: SessionEvent[] = [
        { type: "tool_result", content: "orphan", timestamp: 1 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps).toHaveLength(0);
    });

    it("error without content uses default label", () => {
      const events: SessionEvent[] = [
        { type: "error", timestamp: 1 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps[0].label).toBe("执行出错");
    });

    it("tool_result with empty content sets detail to empty string", () => {
      const events: SessionEvent[] = [
        { type: "tool_call", name: "test", arguments: "{}", timestamp: 1 },
        { type: "tool_result", content: "", timestamp: 2 },
      ];
      const { steps } = mergeEventsToSteps(events);
      expect(steps[0].detail).toBe("");
    });

    it("clarify_user without question does not set clarifyQuestion", () => {
      const events: SessionEvent[] = [
        { type: "clarify_user", timestamp: 1 },
      ];
      const { clarifyQuestion } = mergeEventsToSteps(events);
      expect(clarifyQuestion).toBeNull();
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  statusMap,
  statusDotColors,
  statusBorderColors,
  mapStatusMessage,
} from "./task-status";

const STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "waiting_review",
  "checking",
] as const;

const VALID_VARIANTS = ["default", "secondary", "destructive", "outline"];

describe("task-status", () => {
  describe("statusMap", () => {
    it("has entries for all 6 statuses", () => {
      for (const s of STATUSES) {
        expect(statusMap).toHaveProperty(s);
      }
      expect(Object.keys(statusMap).length).toBeGreaterThanOrEqual(6);
    });

    it("each entry has label (string) and valid variant", () => {
      for (const s of STATUSES) {
        const entry = statusMap[s];
        expect(typeof entry.label).toBe("string");
        expect(entry.label.length).toBeGreaterThan(0);
        expect(VALID_VARIANTS).toContain(entry.variant);
      }
    });
  });

  describe("statusDotColors", () => {
    it("has all 6 status keys", () => {
      for (const s of STATUSES) {
        expect(statusDotColors).toHaveProperty(s);
      }
    });
  });

  describe("statusBorderColors", () => {
    it("has all 6 status keys", () => {
      for (const s of STATUSES) {
        expect(statusBorderColors).toHaveProperty(s);
      }
    });
  });

  describe("mapStatusMessage", () => {
    it("returns correct Chinese message for each status", () => {
      expect(mapStatusMessage("completed")).toBe("任务已完成");
      expect(mapStatusMessage("failed")).toBe("任务执行失败");
      expect(mapStatusMessage("waiting_review")).toBe("任务待审批");
      expect(mapStatusMessage("checking")).toBe("任务正在自动检查");
      expect(mapStatusMessage("pending")).toBe("任务已创建");
      expect(mapStatusMessage("running")).toBe("任务运行中");
    });

    it("returns empty string for undefined/unknown status", () => {
      expect(mapStatusMessage(undefined)).toBe("");
      expect(mapStatusMessage("unknown_status")).toBe("");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";

const MOCK_PIPELINE = {
  stages: [
    {
      key: "requirement",
      agent: "pm-agent",
      next: "design",
      allowed_actions: ["advance_stage", "write_artifact"],
      gate: { type: "human_review", max_retries: 3, checks: [{ name: "review", command: "echo ok" }] },
    },
    {
      key: "design",
      agent: "architect-agent",
      next: "development",
      allowed_actions: ["advance_stage", "write_artifact", "discuss_with_agent"],
      gate: { type: "auto" },
    },
    {
      key: "development",
      agent: "dev-agent",
      next: "testing",
      allowed_actions: ["advance_stage", "write_artifact"],
    },
    {
      key: "testing",
      agent: "qa-agent",
      allowed_actions: ["advance_stage", "write_artifact"],
    },
  ],
};

describe("pipeline", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(MOCK_PIPELINE));
  });

  async function importPipeline() {
    const mod = await import("./pipeline");
    // Invalidate cache so each test reloads
    mod.invalidateCache();
    return mod;
  }

  it("getNextStage returns correct next stage", async () => {
    const { getNextStage } = await importPipeline();
    expect(getNextStage("requirement")).toBe("design");
    expect(getNextStage("design")).toBe("development");
    expect(getNextStage("development")).toBe("testing");
  });

  it("getNextStage returns null for last stage", async () => {
    const { getNextStage } = await importPipeline();
    expect(getNextStage("testing")).toBeNull();
  });

  it("getNextStage returns null for unknown stage", async () => {
    const { getNextStage } = await importPipeline();
    expect(getNextStage("nonexistent")).toBeNull();
  });

  it("getAgentForStage returns agent name", async () => {
    const { getAgentForStage } = await importPipeline();
    expect(getAgentForStage("requirement")).toBe("pm-agent");
    expect(getAgentForStage("design")).toBe("architect-agent");
    expect(getAgentForStage("development")).toBe("dev-agent");
    expect(getAgentForStage("testing")).toBe("qa-agent");
  });

  it("getAgentForStage returns empty string for unknown stage", async () => {
    const { getAgentForStage } = await importPipeline();
    expect(getAgentForStage("nonexistent")).toBe("");
  });

  it("isActionAllowed returns correct boolean", async () => {
    const { isActionAllowed } = await importPipeline();
    expect(isActionAllowed("requirement", "advance_stage")).toBe(true);
    expect(isActionAllowed("requirement", "write_artifact")).toBe(true);
    expect(isActionAllowed("requirement", "discuss_with_agent")).toBe(false);
    expect(isActionAllowed("design", "discuss_with_agent")).toBe(true);
    expect(isActionAllowed("development", "discuss_with_agent")).toBe(false);
  });

  it("isActionAllowed returns false for stage with no allowed_actions", async () => {
    const { isActionAllowed } = await importPipeline();
    expect(isActionAllowed("testing", "anything")).toBe(false);
  });

  it("getGate returns gate config for stage with gate", async () => {
    const { getGate } = await importPipeline();
    const gate = getGate("requirement");
    expect(gate).toEqual({
      type: "human_review",
      max_retries: 3,
      checks: [{ name: "review", command: "echo ok" }],
    });
  });

  it("getGate returns gate for auto type", async () => {
    const { getGate } = await importPipeline();
    expect(getGate("design")).toEqual({ type: "auto" });
  });

  it("getGate returns null for stage without gate", async () => {
    const { getGate } = await importPipeline();
    expect(getGate("development")).toBeNull();
    expect(getGate("testing")).toBeNull();
  });

  it("getGate returns null for unknown stage", async () => {
    const { getGate } = await importPipeline();
    expect(getGate("nonexistent")).toBeNull();
  });
});

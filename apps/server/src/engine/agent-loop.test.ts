import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiveSession, sessionManager } from "./session";
import type { Skill, AgentConfig } from "./skill-loader";

// Mock dependencies
vi.mock("./skill-loader", () => {
  const skills = new Map<string, Skill>();
  return {
    SkillLoader: class {
      private agents = new Map<string, AgentConfig>();

      constructor() {
        this.agents.set("pm-agent", {
          name: "pm-agent",
          role: "PM",
          stage: "requirement",
          model: "claude-sonnet-4-20250514",
          system_prompt: "You are a PM agent",
          auto_advance: true,
        });
      }

      getSystemPrompt(name: string) {
        return this.agents.get(name)?.system_prompt || "";
      }

      getModel(_name: string) {
        return "claude-sonnet-4-20250514";
      }

      getAutoAdvance(name: string) {
        const cfg = this.agents.get(name);
        return cfg ? !!cfg.auto_advance : false;
      }

      getSkills(_name: string): Skill[] {
        return [];
      }

      getSkill(_agent: string, _skill: string): Skill | undefined {
        return undefined;
      }
    },
  };
});

// Mock discussion service
vi.mock("../services/discussion", () => ({
  getOrCreateBoard: vi.fn(() => Promise.resolve({ id: "board-1" })),
  createMessage: vi.fn(() =>
    Promise.resolve({ id: "msg-1", speaker: "pm-agent", content: "topic" })
  ),
}));

describe("AgentLoop", () => {
  let mockStreamFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    // Clear sessionManager
    sessionManager.cleanup();
  });

  async function createLoop() {
    // Must import after mocks are set up
    const { AgentLoop } = await import("./agent-loop");
    const { SkillLoader } = await import("./skill-loader");
    const loader = new SkillLoader();
    return new AgentLoop(loader, "http://localhost:8000");
  }

  async function createMockProvider(textResponse: string) {
    const { AnthropicProvider } = await import("./provider");
    const provider = new AnthropicProvider();

    // Mock the provider's stream method
    const originalStream = provider.stream.bind(provider);
    provider.stream = async function* (_opts) {
      yield { type: "text", content: textResponse };
      yield { type: "done" };
    };

    // Patch getProvider to return our mock
    vi.doMock("./provider", async () => {
      const actual = await vi.importActual("./provider");
      return {
        ...actual,
        getProvider: () => provider,
      };
    });

    return provider;
  }

  describe("executeTool", () => {
    it("advance_stage sets status to completed and adds stage_advance artifact", async () => {
      const { AgentLoop } = await import("./agent-loop");
      const { SkillLoader } = await import("./skill-loader");
      const loop = new AgentLoop(new SkillLoader(), "http://localhost:8000");

      const session = sessionManager.create({
        agentName: "pm-agent",
        taskId: "task-1",
      });

      // Access private method via any
      const result = await (loop as any).executeTool(session, {
        id: "tc-1",
        name: "advance_stage",
        arguments: "{}",
      });

      expect(result).toBe("阶段已推进");
      expect(session.status).toBe("completed");
      expect(session.artifacts.some((a) => a.type === "stage_advance")).toBe(true);
    });

    it("write_artifact adds artifact to session", async () => {
      const { AgentLoop } = await import("./agent-loop");
      const { SkillLoader } = await import("./skill-loader");
      const loop = new AgentLoop(new SkillLoader(), "http://localhost:8000");

      const session = sessionManager.create({
        agentName: "pm-agent",
        taskId: "task-1",
      });

      const result = await (loop as any).executeTool(session, {
        id: "tc-2",
        name: "write_artifact",
        arguments: JSON.stringify({
          artifact_type: "document",
          title: "PRD",
          content: "# Product Requirements",
        }),
      });

      expect(result).toBe("制品已保存");
      expect(session.artifacts).toHaveLength(1);
      expect(session.artifacts[0]).toEqual({
        type: "document",
        title: "PRD",
        content: "# Product Requirements",
      });
    });

    it("clarify_user waits for user input and resumes", async () => {
      const { AgentLoop } = await import("./agent-loop");
      const { SkillLoader } = await import("./skill-loader");
      const loop = new AgentLoop(new SkillLoader(), "http://localhost:8000");

      const session = sessionManager.create({
        agentName: "pm-agent",
        taskId: "task-1",
      });

      const resultP = (loop as any).executeTool(session, {
        id: "tc-3",
        name: "clarify_user",
        arguments: JSON.stringify({ question: "What is the priority?" }),
      });

      // Wait a tick for the question to be emitted
      await new Promise((r) => setTimeout(r, 10));

      expect(session.status).toBe("waiting_user");

      // Simulate user response
      session.resolveUserInput("High priority");

      const result = await resultP;
      expect(result).toBe("用户回复：High priority");
      expect(session.status).toBe("running");
    });

    it("discuss_with_agent creates discussion message", async () => {
      const { AgentLoop } = await import("./agent-loop");
      const { SkillLoader } = await import("./skill-loader");
      const loop = new AgentLoop(new SkillLoader(), "http://localhost:8000");

      const session = sessionManager.create({
        agentName: "pm-agent",
        taskId: "task-1",
      });

      const result = await (loop as any).executeTool(session, {
        id: "tc-4",
        name: "discuss_with_agent",
        arguments: JSON.stringify({ agent_name: "architect-agent", topic: "API design" }),
      });

      expect(result).toContain("architect-agent");
    });

    it("discuss_with_agent returns error when no target agent", async () => {
      const { AgentLoop } = await import("./agent-loop");
      const { SkillLoader } = await import("./skill-loader");
      const loop = new AgentLoop(new SkillLoader(), "http://localhost:8000");

      const session = sessionManager.create({
        agentName: "pm-agent",
        taskId: "task-1",
      });

      const result = await (loop as any).executeTool(session, {
        id: "tc-5",
        name: "discuss_with_agent",
        arguments: JSON.stringify({ agent_name: "", topic: "test" }),
      });

      expect(result).toContain("未指定目标 Agent");
    });

    it("unknown tool returns error message", async () => {
      const { AgentLoop } = await import("./agent-loop");
      const { SkillLoader } = await import("./skill-loader");
      const loop = new AgentLoop(new SkillLoader(), "http://localhost:8000");

      const session = sessionManager.create({
        agentName: "pm-agent",
        taskId: "task-1",
      });

      const result = await (loop as any).executeTool(session, {
        id: "tc-6",
        name: "nonexistent_tool",
        arguments: "{}",
      });

      expect(result).toContain("未知工具");
    });

    it("handles invalid JSON in arguments", async () => {
      const { AgentLoop } = await import("./agent-loop");
      const { SkillLoader } = await import("./skill-loader");
      const loop = new AgentLoop(new SkillLoader(), "http://localhost:8000");

      const session = sessionManager.create({
        agentName: "pm-agent",
        taskId: "task-1",
      });

      const result = await (loop as any).executeTool(session, {
        id: "tc-7",
        name: "write_artifact",
        arguments: "not-valid-json",
      });

      // Should still work with empty args
      expect(result).toBe("制品已保存");
    });
  });
});

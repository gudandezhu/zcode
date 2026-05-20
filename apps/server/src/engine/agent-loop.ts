import type { Artifact } from "@zcode/shared";
import { LiveSession, sessionManager } from "./session";
import { SkillLoader } from "./skill-loader";
import { getProvider, type LLMProvider } from "./provider";
import * as discussionSvc from "../services/discussion";

const MAX_ITERATIONS = 50;

function builtinTools(): Record<string, unknown>[] {
  return [
    {
      type: "function",
      function: {
        name: "advance_stage",
        description: "确认当前阶段工作完成，推进任务到下一阶段",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    {
      type: "function",
      function: {
        name: "write_artifact",
        description: "保存产出物",
        parameters: {
          type: "object",
          properties: {
            artifact_type: { type: "string", description: "制品类型", default: "document" },
            title: { type: "string", description: "制品标题" },
            content: { type: "string", description: "制品内容" },
          },
          required: ["title", "content"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "discuss_with_agent",
        description: "与另一个 Agent 发起讨论",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "目标 Agent 名称" },
            topic: { type: "string", description: "讨论主题" },
            max_rounds: { type: "integer", description: "最大讨论轮次", default: 10 },
          },
          required: ["agent_name", "topic"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "clarify_user",
        description: "向用户提问以澄清问题",
        parameters: {
          type: "object",
          properties: {
            question: { type: "string", description: "要向用户提出的问题" },
          },
          required: ["question"],
        },
      },
    },
  ];
}

export class AgentLoop {
  private skillLoader: SkillLoader;
  private callbackUrl: string;

  constructor(skillLoader: SkillLoader, callbackUrl: string) {
    this.skillLoader = skillLoader;
    this.callbackUrl = callbackUrl;
  }

  async run(sessionId: string): Promise<void> {
    const session = sessionManager.get(sessionId);
    if (!session) return;

    try {
      await this.runInner(session);
    } catch (err: any) {
      session.status = "failed";
      session.emit({ type: "error", content: err.message, agent: session.agentName });
      session.emitDone();
      await this.notifyCallback(session);
    }
  }

  private async runInner(session: LiveSession): Promise<void> {
    const systemPrompt = this.skillLoader.getSystemPrompt(session.agentName);
    const fullPrompt = session.context
      ? systemPrompt + "\n\n## 任务上下文\n" + session.context
      : systemPrompt;

    const skills = this.skillLoader.getSkills(session.agentName);
    const tools = [...skills.map((s) => ({
      type: "function",
      function: { name: s.name, description: s.description, parameters: s.parameters },
    })), ...builtinTools()];

    const model = this.skillLoader.getModel(session.agentName);
    const provider = getProvider(model);

    session.addMessage("user", session.context ? `请开始工作。任务：${session.context}` : "请开始工作。");

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (session.status !== "running") break;

      const { fullText, toolCalls } = await this.streamLLM(provider, session, tools, fullPrompt);

      if (fullText || toolCalls.length > 0) {
        session.addMessage("assistant", fullText, toolCalls.length > 0 ? { tool_calls: toolCalls } : undefined);
      }

      if (toolCalls.length === 0) {
        session.status = "completed";
        const autoAdvance = this.skillLoader.getAutoAdvance(session.agentName);
        await this.finishSession(session, autoAdvance);
        return;
      }

      for (const tc of toolCalls) {
        session.emit({ type: "tool_call", name: tc.name, arguments: tc.arguments, agent: session.agentName });
        const result = await this.executeTool(session, tc);
        session.addMessage("tool", result, { tool_call_id: tc.id, name: tc.name });
        session.emit({ type: "tool_result", name: tc.name, content: result, agent: session.agentName });

        const advance = (session.status as string) === "completed" && session.artifacts.some((a) => a.type === "stage_advance");
        if ((session.status as string) === "completed" || (session.status as string) === "waiting_user") {
          await this.finishSession(session, advance);
          return;
        }
      }
    }

    session.status = "completed";
    const autoAdvance = this.skillLoader.getAutoAdvance(session.agentName);
    await this.finishSession(session, autoAdvance);
  }

  private async streamLLM(
    provider: LLMProvider,
    session: LiveSession,
    tools: Record<string, unknown>[],
    systemPrompt: string,
  ): Promise<{ fullText: string; toolCalls: { id: string; name: string; arguments: string }[] }> {
    let fullText = "";
    const toolCalls: { id: string; name: string; arguments: string }[] = [];

    for await (const chunk of provider.stream({
      messages: session.messages,
      tools,
      systemPrompt,
    })) {
      if (chunk.type === "text" && chunk.content) {
        fullText += chunk.content;
        session.emit({ type: "text", content: chunk.content, agent: session.agentName });
      } else if (chunk.type === "tool_call" && chunk.id) {
        toolCalls.push({ id: chunk.id, name: chunk.name || "", arguments: chunk.arguments || "{}" });
      }
    }

    return { fullText, toolCalls };
  }

  private async executeTool(
    session: LiveSession,
    toolCall: { id: string; name: string; arguments: string },
  ): Promise<string> {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.arguments || "{}");
    } catch {
      args = {};
    }

    switch (toolCall.name) {
      case "advance_stage":
        session.status = "completed";
        session.artifacts.push({ type: "stage_advance", content: session.taskId });
        return "阶段已推进";

      case "clarify_user": {
        const question = (args.question as string) || "";
        session.status = "waiting_user";
        session.emit({ type: "clarify_user", question, agent: session.agentName });
        const userResponse = await session.waitForUserInput();
        session.addMessage("user", userResponse);
        session.status = "running";
        return `用户回复：${userResponse}`;
      }

      case "discuss_with_agent": {
        const target = (args.agent_name as string) || "";
        const topic = (args.topic as string) || "";
        if (!target) return "错误：未指定目标 Agent";
        try {
          const board = await discussionSvc.getOrCreateBoard(session.taskId);
          const msg = await discussionSvc.createMessage(board.id, {
            speaker: session.agentName,
            content: topic,
            triggerType: "mention",
            mentions: [target],
          });
          return `已在讨论区 @${target}，消息已发送。等待 ${target} 响应。`;
        } catch (err: any) {
          return `发起讨论失败: ${err.message}`;
        }
      }

      case "write_artifact": {
        const artifact: Artifact = {
          type: (args.artifact_type as string) || "document",
          title: (args.title as string) || "",
          content: (args.content as string) || "",
        };
        session.artifacts.push(artifact);
        return "制品已保存";
      }

      default: {
        const skill = this.skillLoader.getSkill(session.agentName, toolCall.name);
        if (skill) {
          try {
            return await skill.execute(args);
          } catch (err: any) {
            return `工具执行失败: ${err.message}`;
          }
        }
        return `未知工具: ${toolCall.name}`;
      }
    }
  }

  private async finishSession(session: LiveSession, advance: boolean): Promise<void> {
    if (session.status === "completed" || session.status === "failed") {
      session.emit({ type: "session_completed", agent: session.agentName });
    } else {
      session.emit({ type: "session_state_changed", status: session.status, agent: session.agentName });
    }
    session.emitDone();
    await this.notifyCallback(session, advance);
  }

  private async notifyCallback(session: LiveSession, advance = false): Promise<void> {
    const payload = {
      sessionId: session.id,
      taskId: session.taskId,
      agentName: session.agentName,
      status: session.status,
      artifacts: session.artifacts,
      advance,
    };
    try {
      await fetch(`${this.callbackUrl}/api/sessions/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // callback failure is non-fatal
    }
  }
}

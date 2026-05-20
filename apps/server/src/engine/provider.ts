import Anthropic from "@anthropic-ai/sdk";

export interface StreamChunk {
  type: "thinking" | "text" | "tool_call" | "tool_call_end" | "done";
  content?: string;
  id?: string;
  name?: string;
  arguments?: string;
}

export interface LLMProvider {
  stream(opts: {
    messages: Record<string, unknown>[];
    tools?: Record<string, unknown>[];
    systemPrompt?: string;
  }): AsyncGenerator<StreamChunk>;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || "sk-placeholder";
      const opts: ConstructorParameters<typeof Anthropic>[0] = { apiKey };
      if (process.env.ANTHROPIC_BASE_URL) opts.baseURL = process.env.ANTHROPIC_BASE_URL;
      this.client = new Anthropic(opts);
    }
    return this.client;
  }

  async *stream(opts: {
    messages: Record<string, unknown>[];
    tools?: Record<string, unknown>[];
    systemPrompt?: string;
  }): AsyncGenerator<StreamChunk> {
    const client = this.getClient();
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    const apiTools = opts.tools?.map((t: any) => {
      const func = t.function || t;
      return {
        name: func.name,
        description: func.description || "",
        input_schema: func.parameters || { type: "object", properties: {} },
      };
    });

    // Convert messages to Anthropic format
    const apiMsgs: Anthropic.MessageParam[] = [];
    for (const m of opts.messages) {
      const role = m.role as string;
      if (role === "system") continue;
      if (role === "tool") {
        apiMsgs.push({
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: (m.tool_call_id as string) || "",
            content: m.content as string,
          }],
        });
      } else if (role === "assistant" && m.tool_calls) {
        const blocks: Anthropic.ContentBlockParam[] = [];
        if (m.content) blocks.push({ type: "text", text: m.content as string });
        for (const tc of m.tool_calls as any[]) {
          const func = tc.function || tc;
          blocks.push({
            type: "tool_use",
            id: tc.id || func.id || "",
            name: func.name || "",
            input: JSON.parse(func.arguments || "{}"),
          });
        }
        apiMsgs.push({ role: "assistant", content: blocks });
      } else {
        apiMsgs.push({ role: role as "user" | "assistant", content: m.content as string });
      }
    }

    const streamParams: Anthropic.MessageStreamParams = {
      model,
      max_tokens: 16384,
      messages: apiMsgs,
    };
    if (opts.systemPrompt) streamParams.system = opts.systemPrompt;
    if (apiTools) streamParams.tools = apiTools as any;

    const toolCalls = new Map<string, { id: string; name: string; arguments: string }>();
    let currentToolId: string | null = null;

    try {
      const stream = client.messages.stream(streamParams);
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            currentToolId = event.content_block.id;
            toolCalls.set(event.content_block.id, {
              id: event.content_block.id,
              name: event.content_block.name,
              arguments: "",
            });
          } else {
            currentToolId = null;
          }
        } else if (event.type === "content_block_delta") {
          const delta = event.delta as any;
          if (delta.text) {
            yield { type: "text", content: delta.text };
          } else if (delta.partial_json && currentToolId) {
            const tc = toolCalls.get(currentToolId);
            if (tc) tc.arguments += delta.partial_json;
          }
        } else if (event.type === "message_stop") {
          for (const [, tc] of toolCalls) {
            yield {
              type: "tool_call",
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments || "{}",
            };
          }
          if (toolCalls.size > 0) yield { type: "tool_call_end" };
          yield { type: "done" };
          return;
        }
      }
    } catch (err: any) {
      yield { type: "text", content: `[LLM Error: ${err.message}]` };
      yield { type: "done" };
    }
  }
}

export function getProvider(model: string): LLMProvider {
  // Route by model name prefix
  if (model.includes("claude") || model.includes("anthropic")) {
    return new AnthropicProvider();
  }
  // Default to Anthropic
  return new AnthropicProvider();
}

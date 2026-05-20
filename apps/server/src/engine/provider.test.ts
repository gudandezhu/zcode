import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Anthropic SDK
const mockStream = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = {
        stream: mockStream,
      };
    },
  };
});

describe("AnthropicProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    mockStream.mockReset();
  });

  async function getProvider() {
    const { AnthropicProvider } = await import("./provider");
    return new AnthropicProvider();
  }

  async function collectChunks(gen: AsyncGenerator<any>) {
    const chunks: any[] = [];
    for await (const chunk of gen) {
      chunks.push(chunk);
    }
    return chunks;
  }

  it("converts simple user/assistant messages", async () => {
    const events = [
      { type: "content_block_delta", delta: { text: "Hello" } },
      { type: "message_stop" },
    ];
    mockStream.mockReturnValue((async function* () {
      for (const e of events) yield e;
    })());

    const provider = await getProvider();
    const chunks = await collectChunks(provider.stream({
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
      ],
    }));

    expect(chunks.some((c) => c.type === "text" && c.content === "Hello")).toBe(true);
    expect(chunks[chunks.length - 1].type).toBe("done");

    // Verify API was called with correct message format
    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.messages).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]);
  });

  it("skips system messages", async () => {
    mockStream.mockReturnValue((async function* () {
      yield { type: "message_stop" };
    })());

    const provider = await getProvider();
    await collectChunks(provider.stream({
      messages: [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hi" },
      ],
    }));

    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.messages).toEqual([
      { role: "user", content: "Hi" },
    ]);
  });

  it("converts tool result messages", async () => {
    mockStream.mockReturnValue((async function* () {
      yield { type: "message_stop" };
    })());

    const provider = await getProvider();
    await collectChunks(provider.stream({
      messages: [
        { role: "tool", content: "result data", tool_call_id: "tc-1" },
      ],
    }));

    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.messages).toEqual([{
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: "tc-1",
        content: "result data",
      }],
    }]);
  });

  it("converts assistant messages with tool_calls", async () => {
    mockStream.mockReturnValue((async function* () {
      yield { type: "message_stop" };
    })());

    const provider = await getProvider();
    await collectChunks(provider.stream({
      messages: [
        {
          role: "assistant",
          content: "Let me check",
          tool_calls: [{
            id: "tc-1",
            function: { name: "search", arguments: '{"q":"test"}' },
          }],
        },
      ],
    }));

    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.messages).toEqual([{
      role: "assistant",
      content: [
        { type: "text", text: "Let me check" },
        { type: "tool_use", id: "tc-1", name: "search", input: { q: "test" } },
      ],
    }]);
  });

  it("handles tool_use content blocks in stream", async () => {
    const events = [
      {
        type: "content_block_start",
        content_block: { type: "tool_use", id: "tc-1", name: "advance_stage" },
      },
      {
        type: "content_block_delta",
        delta: { partial_json: '{"stage":"de' },
      },
      {
        type: "content_block_delta",
        delta: { partial_json: 'sign"}' },
      },
      { type: "message_stop" },
    ];
    mockStream.mockReturnValue((async function* () {
      for (const e of events) yield e;
    })());

    const provider = await getProvider();
    const chunks = await collectChunks(provider.stream({
      messages: [{ role: "user", content: "go" }],
    }));

    const toolCall = chunks.find((c) => c.type === "tool_call");
    expect(toolCall).toEqual({
      type: "tool_call",
      id: "tc-1",
      name: "advance_stage",
      arguments: '{"stage":"design"}',
    });
    expect(chunks.some((c) => c.type === "tool_call_end")).toBe(true);
  });

  it("handles LLM errors gracefully", async () => {
    mockStream.mockImplementation(() => {
      throw new Error("API rate limit");
    });

    const provider = await getProvider();
    const chunks = await collectChunks(provider.stream({
      messages: [{ role: "user", content: "test" }],
    }));

    const errorChunk = chunks.find((c) => c.type === "text");
    expect(errorChunk!.content).toContain("LLM Error");
    expect(chunks[chunks.length - 1].type).toBe("done");
  });

  it("passes systemPrompt and tools to API", async () => {
    mockStream.mockReturnValue((async function* () {
      yield { type: "message_stop" };
    })());

    const provider = await getProvider();
    const tools = [{
      type: "function",
      function: {
        name: "advance_stage",
        description: "Advance",
        parameters: { type: "object", properties: {} },
      },
    }];

    await collectChunks(provider.stream({
      messages: [{ role: "user", content: "go" }],
      tools,
      systemPrompt: "You are a PM agent",
    }));

    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.system).toBe("You are a PM agent");
    expect(callArgs.tools).toEqual([{
      name: "advance_stage",
      description: "Advance",
      input_schema: { type: "object", properties: {} },
    }]);
  });
});

describe("getProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    mockStream.mockReturnValue((async function* () {
      yield { type: "message_stop" };
    })());
  });

  it("returns AnthropicProvider for claude model", async () => {
    const { getProvider } = await import("./provider");
    const p = getProvider("claude-sonnet-4-20250514");
    expect(p).toBeDefined();
  });

  it("returns AnthropicProvider for unknown model as default", async () => {
    const { getProvider } = await import("./provider");
    const p = getProvider("gpt-4");
    expect(p).toBeDefined();
  });
});

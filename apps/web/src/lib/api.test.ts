import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTasks,
  createTask,
  streamSession,
} from "./api";

function mockSSEResponse(lines: string[], headers?: Record<string, string>) {
  const body = lines.join("\n") + "\n";
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    body: stream,
    headers: new Headers(headers || {}),
    json: async () => ({}),
  };
}

const mockFetch = vi.fn();

describe("api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  describe("fetchTasks", () => {
    it("constructs URL without stage parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => [],
      });
      await fetchTasks();
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toMatch(/\/api\/tasks$/);
      expect(calledUrl).not.toContain("stage=");
    });

    it("constructs URL with stage parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => [],
      });
      await fetchTasks("development");
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("stage=development");
    });
  });

  describe("createTask", () => {
    it("constructs request body correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ id: "1" }),
      });
      await createTask("Title", "Desc", "requirement");
      const call = mockFetch.mock.calls[0];
      expect(call[1].method).toBe("POST");
      const body = JSON.parse(call[1].body);
      expect(body).toEqual({
        title: "Title",
        description: "Desc",
        stage: "requirement",
      });
    });
  });

  describe("streamSession", () => {
    it("parses SSE data lines and detects done type", async () => {
      const events: unknown[] = [];
      const onEvent = vi.fn((e: unknown) => events.push(e));
      const onDone = vi.fn();

      mockFetch.mockResolvedValueOnce(
        mockSSEResponse([
          "data: " + JSON.stringify({ type: "text", content: "hi" }),
          "data: " + JSON.stringify({ type: "done" }),
        ]),
      );

      const ctrl = streamSession("sess1", onEvent, onDone);

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 50));

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });
});

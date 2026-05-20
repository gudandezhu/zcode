import { describe, it, expect, vi, beforeEach } from "vitest";
import * as discussionSvc from "./discussion";
import * as taskSvc from "./task";

// Mock session service to avoid DB side effects in discussion tests
vi.mock("./session", () => ({
  createSession: vi.fn(),
}));

const mockListAgents = vi.fn(() => ["pm-agent", "architect-agent"]);
const mockGetAgent = vi.fn((name: string) => {
  if (name === "architect-agent") {
    return { name, role: "Architect", discussion: { topics: ["API", "database"] } };
  }
  return { name, role: "PM" };
});

// Mock skill-loader to avoid filesystem access
vi.mock("../engine/skill-loader", () => {
  return {
    SkillLoader: class {
      listAgents() { return mockListAgents(); }
      getAgent(name: string) { return mockGetAgent(name); }
    },
  };
});

describe("discussion service", () => {
  async function makeTask(): Promise<string> {
    const t = await taskSvc.createTask({ title: "Discussion Task" });
    return t.id;
  }

  it("getOrCreateBoard creates new board for task", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    expect(board.id).toBeTruthy();
    expect(board.taskId).toBe(taskId);
    expect(board.participants).toEqual([]);
    expect(board.status).toBe("active");
  });

  it("getOrCreateBoard returns existing board on second call", async () => {
    const taskId = await makeTask();
    const b1 = await discussionSvc.getOrCreateBoard(taskId);
    const b2 = await discussionSvc.getOrCreateBoard(taskId);

    expect(b1.id).toBe(b2.id);
  });

  it("getBoardByTask returns board", async () => {
    const taskId = await makeTask();
    const created = await discussionSvc.getOrCreateBoard(taskId);
    const fetched = await discussionSvc.getBoardByTask(taskId);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
  });

  it("getBoardByTask returns null for nonexistent", async () => {
    const fetched = await discussionSvc.getBoardByTask("nonexistent");
    expect(fetched).toBeNull();
  });

  it("addParticipant adds new participant", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    const updated = await discussionSvc.addParticipant(board.id, "agent-a");
    expect(updated).not.toBeNull();
    expect(updated!.participants).toContain("agent-a");
  });

  it("addParticipant skips duplicate", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    await discussionSvc.addParticipant(board.id, "agent-a");
    const result = await discussionSvc.addParticipant(board.id, "agent-a");

    expect(result!.participants.filter((p) => p === "agent-a")).toHaveLength(1);
  });

  it("addParticipant returns null for nonexistent board", async () => {
    const result = await discussionSvc.addParticipant("nonexistent", "agent-a");
    expect(result).toBeNull();
  });

  it("createMessage adds message and auto-adds speaker as participant", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    const msg = await discussionSvc.createMessage(board.id, {
      speaker: "pm-agent",
      content: "Let's discuss the design",
    });

    expect(msg.id).toBeTruthy();
    expect(msg.boardId).toBe(board.id);
    expect(msg.speaker).toBe("pm-agent");
    expect(msg.content).toBe("Let's discuss the design");
    expect(msg.triggerType).toBe("mention");
    expect(msg.mentions).toEqual([]);
    expect(msg.topics).toEqual([]);
    expect(msg.reactions).toEqual([]);
  });

  it("createMessage auto-adds mentioned agents as participants", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    await discussionSvc.createMessage(board.id, {
      speaker: "pm-agent",
      content: "@architect-agent need your input",
      mentions: ["architect-agent"],
    });

    const fetched = await discussionSvc.getBoardByTask(taskId);
    expect(fetched!.participants).toContain("pm-agent");
    expect(fetched!.participants).toContain("architect-agent");
  });

  it("createMessage with parentId", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    const parent = await discussionSvc.createMessage(board.id, {
      speaker: "a",
      content: "parent msg",
    });

    const child = await discussionSvc.createMessage(board.id, {
      speaker: "b",
      content: "reply",
      parentId: parent.id,
    });

    expect(child.parentId).toBe(parent.id);
  });

  it("listMessages returns all messages for board", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    const m1 = await discussionSvc.createMessage(board.id, { speaker: "a", content: "msg1" });
    const m2 = await discussionSvc.createMessage(board.id, { speaker: "b", content: "msg2" });
    const m3 = await discussionSvc.createMessage(board.id, { speaker: "c", content: "msg3" });

    const msgs = await discussionSvc.listMessages(board.id);
    expect(msgs).toHaveLength(3);
    const ids = msgs.map((m) => m.id);
    expect(ids).toContain(m1.id);
    expect(ids).toContain(m2.id);
    expect(ids).toContain(m3.id);
  });

  it("addReaction adds reaction to message", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);
    const msg = await discussionSvc.createMessage(board.id, {
      speaker: "a",
      content: "proposal",
    });

    const updated = await discussionSvc.addReaction(msg.id, {
      agentName: "b",
      action: "approve",
      content: "LGTM",
    });

    expect(updated).not.toBeNull();
    expect(updated!.reactions).toHaveLength(1);
    expect(updated!.reactions[0]).toEqual({
      agentName: "b",
      action: "approve",
      content: "LGTM",
    });
  });

  it("addReaction returns null for nonexistent message", async () => {
    const result = await discussionSvc.addReaction("nonexistent", {
      agentName: "a",
      action: "approve",
      content: "",
    });
    expect(result).toBeNull();
  });

  it("createProtocol creates protocol message with pending status", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);

    const msg = await discussionSvc.createProtocol(board.id, {
      speaker: "pm-agent",
      content: "Please review the design",
      protocolType: "review_request",
      mentions: ["architect-agent"],
    });

    expect(msg.triggerType).toBe("protocol");
    expect(msg.protocolType).toBe("review_request");
    expect(msg.protocolStatus).toBe("pending");
    expect(msg.responsePolicy).toBe("must_follow_protocol");
  });

  it("updateProtocolStatus changes status", async () => {
    const taskId = await makeTask();
    const board = await discussionSvc.getOrCreateBoard(taskId);
    const msg = await discussionSvc.createProtocol(board.id, {
      speaker: "a",
      content: "review",
      protocolType: "review_request",
      mentions: [],
    });

    const updated = await discussionSvc.updateProtocolStatus(msg.id, "passed");
    expect(updated).not.toBeNull();
    expect(updated!.protocolStatus).toBe("passed");
  });

  it("updateProtocolStatus returns null for nonexistent", async () => {
    const result = await discussionSvc.updateProtocolStatus("nonexistent", "passed");
    expect(result).toBeNull();
  });

  describe("matchTopicsAndAddParticipants", () => {
    it("matches agents by topic and adds as participants", async () => {
      const taskId = await makeTask();
      const board = await discussionSvc.getOrCreateBoard(taskId);

      const matched = await discussionSvc.matchTopicsAndAddParticipants(
        board.id, "Let's discuss the API design", ["pm-agent"],
      );

      expect(matched).toContain("architect-agent");
    });

    it("returns empty when no topics match", async () => {
      const taskId = await makeTask();
      const board = await discussionSvc.getOrCreateBoard(taskId);

      const matched = await discussionSvc.matchTopicsAndAddParticipants(
        board.id, "random content with no keywords", [],
      );

      expect(matched).toHaveLength(0);
    });

    it("excludes specified agents", async () => {
      const taskId = await makeTask();
      const board = await discussionSvc.getOrCreateBoard(taskId);

      const matched = await discussionSvc.matchTopicsAndAddParticipants(
        board.id, "API design discussion", ["architect-agent"],
      );

      expect(matched).not.toContain("architect-agent");
    });
  });
});

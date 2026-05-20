import { describe, it, expect } from "vitest";
import * as memorySvc from "./memory";
import * as projectSvc from "./project";

describe("memory service", () => {
  async function makeProject(): Promise<string> {
    const p = await projectSvc.createProject({ name: "MemTest" });
    return p.id;
  }

  it("createMemory returns memory with correct data", async () => {
    const pid = await makeProject();
    const m = await memorySvc.createMemory(pid, { fact: "Uses React" });

    expect(m.id).toBeTruthy();
    expect(m.projectId).toBe(pid);
    expect(m.fact).toBe("Uses React");
    expect(m.createdAt).toBeTruthy();
    expect(m.updatedAt).toBeTruthy();
  });

  it("listMemories returns memories for project", async () => {
    const pid = await makeProject();
    await memorySvc.createMemory(pid, { fact: "Fact A" });
    await memorySvc.createMemory(pid, { fact: "Fact B" });

    const list = await memorySvc.listMemories(pid);
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.fact)).toContain("Fact A");
    expect(list.map((m) => m.fact)).toContain("Fact B");
  });

  it("listMemories returns empty for project with no memories", async () => {
    const pid = await makeProject();
    const list = await memorySvc.listMemories(pid);
    expect(list).toEqual([]);
  });

  it("updateMemory changes fact", async () => {
    const pid = await makeProject();
    const created = await memorySvc.createMemory(pid, { fact: "Old fact" });

    const updated = await memorySvc.updateMemory(created.id, { fact: "New fact" });
    expect(updated).not.toBeNull();
    expect(updated!.fact).toBe("New fact");
    expect(updated!.id).toBe(created.id);
  });

  it("updateMemory returns null for nonexistent", async () => {
    const result = await memorySvc.updateMemory("nonexistent", { fact: "X" });
    expect(result).toBeNull();
  });

  it("deleteMemory removes memory", async () => {
    const pid = await makeProject();
    const created = await memorySvc.createMemory(pid, { fact: "To delete" });

    const deleted = await memorySvc.deleteMemory(created.id);
    expect(deleted).toBe(true);

    // After deletion, list should not contain it
    const list = await memorySvc.listMemories(pid);
    expect(list.every((m) => m.id !== created.id)).toBe(true);
  });

  it("deleteMemory returns false for nonexistent", async () => {
    expect(await memorySvc.deleteMemory("nonexistent")).toBe(false);
  });

  it("createMemory and listMemories round-trip preserves data", async () => {
    const pid = await makeProject();
    const created = await memorySvc.createMemory(pid, {
      fact: "Uses TypeScript + React",
    });

    const list = await memorySvc.listMemories(pid);
    const fetched = list.find((m) => m.id === created.id);
    expect(fetched).toMatchObject({
      id: created.id,
      projectId: pid,
      fact: "Uses TypeScript + React",
    });
  });
});

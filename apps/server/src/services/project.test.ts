import { describe, it, expect } from "vitest";
import * as projectSvc from "./project";

describe("project service", () => {
  it("createProject returns project with defaults", async () => {
    const p = await projectSvc.createProject({ name: "Test Project" });

    expect(p.id).toBeTruthy();
    expect(p.name).toBe("Test Project");
    expect(p.path).toBe("");
    expect(p.techStack).toEqual([]);
    expect(p.conventions).toBe("");
    expect(p.gitInitialized).toBe(false);
    expect(p.gitRemote).toBe("");
    expect(p.createdAt).toBeTruthy();
    expect(p.updatedAt).toBeTruthy();
  });

  it("createProject with path and gitRemote", async () => {
    const p = await projectSvc.createProject({
      name: "MyApp",
      path: "/home/user/myapp",
      gitRemote: "https://github.com/user/myapp",
    });

    expect(p.path).toBe("/home/user/myapp");
    expect(p.gitRemote).toBe("https://github.com/user/myapp");
  });

  it("getProject returns created project", async () => {
    const created = await projectSvc.createProject({ name: "Fetch" });
    const fetched = await projectSvc.getProject(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.name).toBe("Fetch");
  });

  it("getProject returns null for nonexistent", async () => {
    expect(await projectSvc.getProject("nonexistent")).toBeNull();
  });

  it("getProject returns default project", async () => {
    const p = await projectSvc.getProject("default");
    expect(p).not.toBeNull();
    expect(p!.name).toBe("默认项目");
  });

  it("listProjects returns all projects", async () => {
    await projectSvc.createProject({ name: "P1" });
    await projectSvc.createProject({ name: "P2" });

    const list = await projectSvc.listProjects();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((p) => p.name === "P1")).toBe(true);
    expect(list.some((p) => p.name === "P2")).toBe(true);
  });

  it("updateProject modifies existing project", async () => {
    const created = await projectSvc.createProject({ name: "Original" });
    const updated = await projectSvc.updateProject(created.id, {
      name: "Updated",
      conventions: "Use tabs",
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated");
    expect(updated!.conventions).toBe("Use tabs");
  });

  it("updateProject with techStack", async () => {
    const created = await projectSvc.createProject({ name: "Tech" });
    const updated = await projectSvc.updateProject(created.id, {
      techStack: JSON.stringify(["React", "TypeScript"]),
    });

    expect(updated!.techStack).toEqual(["React", "TypeScript"]);
  });

  it("updateProject returns null for nonexistent", async () => {
    const result = await projectSvc.updateProject("nonexistent", { name: "X" });
    expect(result).toBeNull();
  });

  it("deleteProject removes project", async () => {
    const created = await projectSvc.createProject({ name: "DeleteMe" });
    const deleted = await projectSvc.deleteProject(created.id);
    expect(deleted).toBe(true);

    const fetched = await projectSvc.getProject(created.id);
    expect(fetched).toBeNull();
  });

  it("deleteProject returns false for nonexistent", async () => {
    expect(await projectSvc.deleteProject("nonexistent")).toBe(false);
  });

  it("createProject and getProject round-trip preserves data", async () => {
    const created = await projectSvc.createProject({
      name: "RoundTrip",
      path: "/rt",
    });

    const fetched = await projectSvc.getProject(created.id);
    // gitRemote is not stored in DB, only returned from createProject
    expect(fetched).toMatchObject({
      id: created.id,
      name: "RoundTrip",
      path: "/rt",
    });
  });
});

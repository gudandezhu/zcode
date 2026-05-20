import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { projects } from "../db/schema";
import type { Project } from "@zcode/shared";
import crypto from "crypto";

function genId(): string {
  return crypto.randomBytes(4).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

export async function createProject(input: {
  name: string;
  path?: string;
  gitRemote?: string;
}): Promise<Project> {
  const db = getDb();
  const id = genId();
  const t = now();
  await db.insert(projects).values({
    id,
    name: input.name,
    path: input.path ?? "",
    createdAt: t,
    updatedAt: t,
  });
  return {
    id, name: input.name, path: input.path ?? "",
    techStack: [], conventions: "",
    createdAt: t, updatedAt: t,
  };
}

export async function listProjects(): Promise<Project[]> {
  const db = getDb();
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return rows as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const db = getDb();
  const rows = await db.select().from(projects).where(eq(projects.id, id));
  if (rows.length === 0) return null;
  return rows[0] as Project;
}

export async function updateProject(
  id: string,
  input: { name?: string; path?: string; techStack?: string; conventions?: string },
): Promise<Project | null> {
  const existing = await getProject(id);
  if (!existing) return null;
  const db = getDb();
  const t = now();
  const techStack = input.techStack
    ? JSON.parse(input.techStack)
    : existing.techStack;
  await db.update(projects).set({
    name: input.name ?? existing.name,
    path: input.path ?? existing.path,
    techStack,
    conventions: input.conventions ?? existing.conventions,
    updatedAt: t,
  }).where(eq(projects.id, id));
  return getProject(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(projects).where(eq(projects.id, id));
  const changes = (result as any).changes ?? (result as any).rowsAffected ?? 0;
  return changes > 0;
}

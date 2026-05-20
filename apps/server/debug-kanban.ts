/**
 * Debug script: 模拟 Kanban 页面加载的完整调用链
 * 打印每一层的输入/输出
 */

// ========== Step 0: 初始化 DB ==========
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
import * as schema from "./src/db/schema";
import fs from "fs";
import yaml from "js-yaml";

console.log("=== Kanban 接口调用链 Debug ===\n");

// ========== 调用1: GET /api/tasks ==========
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📡 调用1: GET /api/tasks");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// --- Step 1: Route handler (task.ts:20-24) ---
console.log("Step 1: Route handler → task.get('/')");
console.log("  输入: c.req.query('stage') = undefined (无过滤)");
console.log("  调用: svc.listTasks(stage)\n");

// --- Step 2: listTasks (services/task.ts:68-74) ---
console.log("Step 2: listTasks() → services/task.ts:68");
console.log("  参数: stage = undefined");

const dbPath = process.env.DATABASE_PATH || "../../zcode.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// --- Step 3: DB 查询 ---
console.log("Step 3: DB 查询 → db.select().from(tasks).orderBy(desc(updatedAt))");
const rawRows = db.select().from(schema.tasks).orderBy(desc(schema.tasks.updatedAt)).all();
console.log(`  DB 返回行数: ${rawRows.length}`);
console.log(`  第一行原始数据 (DB 列名):`);
console.log(JSON.stringify(rawRows[0], null, 2));
console.log("");

// --- Step 4: parseRow 转换 ---
console.log("Step 4: parseRow() → DB 列名 → API 字段名 转换");
function parseRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    stage: row.stage,
    status: row.status,
    artifacts: JSON.parse((row.artifacts as string) || "[]"),
    agent_name: row.agentName || (row as any).agent_name,
    conversation_id: row.conversationId || (row as any).conversation_id,
    project_id: row.projectId || (row as any).project_id,
    parent_task_id: row.parentTaskId || (row as any).parent_task_id,
    depends_on: JSON.parse((row.dependsOn as string || (row as any).depends_on as string) || "[]"),
    git_branch: row.gitBranch || (row as any).git_branch,
    created_at: row.createdAt || (row as any).created_at,
    updated_at: row.updatedAt || (row as any).updated_at,
  };
}

const tasks = rawRows.map(parseRow);
console.log(`  转换后 tasks 数组长度: ${tasks.length}`);
console.log(`  第一条 task (API 格式):`);
console.log(JSON.stringify(tasks[0], null, 2));
console.log("");

// --- Step 5: Route 返回 ---
console.log("Step 5: Route handler 返回 → c.json(result)");
console.log(`  HTTP 200, Content-Type: application/json`);
console.log(`  Body: Task[] 数组, 长度 ${tasks.length}`);
console.log(`  前端收到的完整 JSON:`);
console.log(JSON.stringify(tasks, null, 2).slice(0, 2000) + "...");
console.log("\n");

// ========== 调用2: GET /api/agents/stages ==========
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📡 调用2: GET /api/agents/stages");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// --- Step 6: pipeline.ts loadPipeline ---
console.log("Step 6: loadPipeline() → 读取 pipeline.yaml");
const pipelinePath = process.env.PIPELINE_PATH || "./pipeline.yaml";
let pipelineData: any;
try {
  const raw = fs.readFileSync(pipelinePath, "utf-8");
  pipelineData = yaml.load(raw) as any;
  console.log(`  文件路径: ${pipelinePath}`);
  console.log(`  YAML 内容:`);
  console.log(raw);
} catch (e: any) {
  console.log(`  ❌ 读取失败: ${e.message}`);
  pipelineData = { stages: [] };
}

// --- Step 7: getPipelineStages ---
console.log("\nStep 7: getPipelineStages() → 过滤 + 映射");
const STAGE_LABELS: Record<string, string> = {
  requirement: "需求分析师",
  design: "高级架构师",
  development: "全栈开发工程师",
  testing: "测试工程师",
  done: "完成",
};

const stages = pipelineData.stages
  .filter((s: any) => s.key !== "done")
  .map((s: any) => ({
    key: s.key,
    label: STAGE_LABELS[s.key] || s.key,
    agent: s.agent || "",
  }));

console.log(`  stages 数组:`);
console.log(JSON.stringify(stages, null, 2));
console.log("");

// --- Step 8: Route 返回 ---
console.log("Step 8: Route handler 返回 → c.json(stages)");
console.log(`  HTTP 200, Body: StageInfo[]`);
console.log(JSON.stringify(stages, null, 2));
console.log("\n");

// ========== 前端处理 ==========
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🖥️  前端 Board.tsx 处理");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// --- Step 9: Promise.all ---
console.log("Step 9: Promise.all([fetchTasks(), fetchStages()])");
console.log(`  taskData: Task[] 长度 ${tasks.length}`);
console.log(`  stageData: StageInfo[] 长度 ${stages.length}`);
console.log("");

// --- Step 10: 组织 tasks ---
const topLevelTasks = tasks.filter((t: any) => !t.parent_task_id);
const subTasksByParent = new Map<string, any[]>();
for (const t of tasks) {
  if ((t as any).parent_task_id) {
    const children = subTasksByParent.get((t as any).parent_task_id) || [];
    children.push(t);
    subTasksByParent.set((t as any).parent_task_id, children);
  }
}

console.log("Step 10: 任务组织");
console.log(`  topLevelTasks (无 parent): ${topLevelTasks.length} 个`);
console.log(`  subTasksByParent keys: ${[...subTasksByParent.keys()].length} 个`);
console.log("");

// --- Step 11: 按阶段分配 ---
console.log("Step 11: 每个阶段的任务数");
for (const stage of stages) {
  const stageTasks = topLevelTasks.filter((t: any) => t.stage === stage.key);
  const subCount = stageTasks.reduce((sum: number, t: any) => {
    return sum + (subTasksByParent.get(t.id)?.length || 0);
  }, 0);
  console.log(`  ${stage.label} (${stage.key}): ${stageTasks.length} 个顶级任务, ${subCount} 个子任务`);

  for (const t of stageTasks) {
    console.log(`    - [${t.status}] ${t.title} (id: ${t.id})`);
    const subs = subTasksByParent.get(t.id) || [];
    for (const sub of subs) {
      console.log(`      └─ [${sub.status}] ${sub.title} (id: ${sub.id})`);
    }
  }
}

// --- Step 12: activeStages ---
const activeStages = new Set(
  tasks.filter((t: any) => t.status === "running" || t.status === "in_progress").map((t: any) => t.stage),
);
console.log(`\nStep 12: 活跃阶段 (有 running/in_progress 任务)`);
if (activeStages.size === 0) {
  console.log("  无活跃阶段 (没有 running 状态的任务)");
} else {
  for (const s of activeStages) {
    console.log(`  ${s}`);
  }
}

console.log("\n=== Debug 完成 ===");
sqlite.close();

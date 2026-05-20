import fs from "fs";
import yaml from "js-yaml";

interface GateCheck {
  name: string;
  command: string;
}

interface GateConfig {
  type: string;
  max_retries?: number;
  checks?: GateCheck[];
}

interface PipelineStage {
  key: string;
  agent: string;
  next?: string;
  allowed_actions?: string[];
  gate?: GateConfig;
}

interface PipelineConfig {
  stages: PipelineStage[];
}

let cached: PipelineConfig | null = null;

function loadPipeline(): PipelineConfig {
  if (cached) return cached;
  const path = process.env.PIPELINE_PATH || "./pipeline.yaml";
  try {
    const data = fs.readFileSync(path, "utf-8");
    cached = yaml.load(data) as PipelineConfig;
    return cached;
  } catch {
    cached = { stages: [] };
    return cached;
  }
}

export function getNextStage(current: string): string | null {
  const p = loadPipeline();
  const stage = p.stages.find((s) => s.key === current);
  return stage?.next || null;
}

export function getAgentForStage(stage: string): string {
  const p = loadPipeline();
  return p.stages.find((s) => s.key === stage)?.agent || "";
}

export function isActionAllowed(stage: string, action: string): boolean {
  const p = loadPipeline();
  const s = p.stages.find((s) => s.key === stage);
  if (!s?.allowed_actions) return false;
  return s.allowed_actions.includes(action);
}

export function getGate(stage: string): GateConfig | null {
  const p = loadPipeline();
  return p.stages.find((s) => s.key === stage)?.gate || null;
}

export function invalidateCache(): void {
  cached = null;
}

const STAGE_LABELS: Record<string, string> = {
  requirement: "需求分析师",
  design: "高级架构师",
  development: "全栈开发工程师",
  testing: "测试工程师",
  done: "完成",
};

export function getPipelineStages(): { key: string; label: string; agent: string }[] {
  const p = loadPipeline();
  return p.stages
    .filter((s) => s.key !== "done")
    .map((s) => ({
      key: s.key,
      label: STAGE_LABELS[s.key] || s.key,
      agent: s.agent || "",
    }));
}

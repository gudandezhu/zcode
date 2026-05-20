export const stageLabels: Record<string, string> = {
  requirement: "需求",
  design: "设计",
  development: "开发",
  testing: "测试",
  done: "完成",
};

export const stageDotColors: Record<string, string> = {
  requirement: "bg-blue-500",
  design: "bg-purple-500",
  development: "bg-amber-500",
  testing: "bg-green-500",
  done: "bg-muted-foreground/40",
};

export const stageTopColors: Record<string, string> = {
  requirement: "border-t-blue-500",
  design: "border-t-purple-500",
  development: "border-t-amber-500",
  testing: "border-t-green-500",
  done: "border-t-muted-foreground/30",
};

export const PIPELINE_STAGES = ["requirement", "design", "development", "testing"];

export interface ExecutionEvent {
  type: string;
  content?: string;
  agent?: string;
  name?: string;
  arguments?: string;
  question?: string;
  round?: number;
  role?: string;
  participants?: string[];
  topic?: string;
  summary?: string;
  timestamp: number;
}

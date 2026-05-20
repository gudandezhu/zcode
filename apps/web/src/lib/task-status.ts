export const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待处理", variant: "outline" },
  running: { label: "运行中", variant: "default" },
  completed: { label: "已完成", variant: "secondary" },
  failed: { label: "失败", variant: "destructive" },
  waiting_review: { label: "待审批", variant: "outline" },
  checking: { label: "检查中", variant: "default" },
};

export const statusDotColors: Record<string, string> = {
  pending: "bg-muted-foreground/40",
  running: "bg-blue-500",
  waiting_review: "bg-amber-500",
  checking: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export const statusBorderColors: Record<string, string> = {
  pending: "border-l-muted-foreground/30",
  running: "border-l-blue-500",
  completed: "border-l-green-500",
  failed: "border-l-red-500",
  waiting_review: "border-l-amber-500",
  checking: "border-l-blue-500",
};

export function mapStatusMessage(status?: string): string {
  const map: Record<string, string> = {
    completed: "任务已完成",
    failed: "任务执行失败",
    waiting_review: "任务待审批",
    checking: "任务正在自动检查",
    pending: "任务已创建",
    running: "任务运行中",
  };
  return map[status || ""] || "";
}

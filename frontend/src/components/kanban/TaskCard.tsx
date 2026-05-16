"use client";

import { Task } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待处理", variant: "outline" },
  in_progress: { label: "进行中", variant: "default" },
  completed: { label: "已完成", variant: "secondary" },
  failed: { label: "失败", variant: "destructive" },
};

export function TaskCard({ task, onDelete }: TaskCardProps) {
  const status = statusMap[task.status] || statusMap.pending;

  return (
    <div className="bg-white rounded-md border p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/chat?agent=${task.stage === "development" ? "developer" : task.stage === "design" ? "design" : task.stage === "testing" ? "tester" : "requirement"}&task=${task.id}`}
          className="text-sm font-medium hover:underline leading-tight"
        >
          {task.title}
        </Link>
        <Badge variant={status.variant} className="text-[10px] shrink-0">
          {status.label}
        </Badge>
      </div>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
      )}
      {task.agent_name && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Agent: {task.agent_name}
        </p>
      )}
      <div className="flex gap-1 mt-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

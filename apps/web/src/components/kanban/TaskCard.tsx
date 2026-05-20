"use client";

import { type Task } from "@/lib/api";
import { statusMap, statusBorderColors } from "@/lib/task-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app-provider";

interface TaskCardProps {
  task: Task;
  isSubTask?: boolean;
  hasChildren?: boolean;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onClick: () => void;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "in_progress" || status === "running" || status === "checking") {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
      </span>
    );
  }
  if (status === "waiting_review") {
    return <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />;
  }
  if (status === "completed") {
    return <span className="flex h-2.5 w-2.5 rounded-full bg-green-500" />;
  }
  if (status === "failed") {
    return <span className="flex h-2.5 w-2.5 rounded-full bg-red-500" />;
  }
  return <span className="flex h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />;
}

export function TaskCard({ task, isSubTask, hasChildren, onDelete, onRetry, onClick }: TaskCardProps) {
  const status = statusMap[task.status] || statusMap.pending;
  const summary = task.sessionSummary;
  const { selectedTask } = useApp();
  const isSelected = selectedTask?.id === task.id;

  return (
    <div
      className={`bg-card rounded-md border border-l-[3px] ${statusBorderColors[task.status] || "border-l-muted-foreground/30"} p-3 transition-all cursor-pointer hover:shadow-sm ${
        isSelected ? "ring-2 ring-primary/30 shadow-sm" : "shadow-none"
      } ${isSubTask ? "ml-4 border-l-blue-400" : ""}`}
      onClick={onClick}
    >
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={task.status} />
          <span className="text-sm font-medium leading-tight truncate">{task.title}</span>
        </div>
        <Badge variant={status.variant} className="text-[10px] shrink-0">{status.label}</Badge>
      </div>

      {/* Description */}
      {task.description && !isSubTask && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{task.description}</p>
      )}

      {/* Sub-task indicator */}
      {hasChildren && (
        <span className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 block">含子任务</span>
      )}

      {/* Session Progress */}
      {summary && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate max-w-[60%]">{summary.lastAction}</span>
            {summary.maxRounds > 0 && (
              <span className="tabular-nums">{summary.currentRound}/{summary.maxRounds}</span>
            )}
          </div>
          {summary.maxRounds > 0 && (
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.currentRound / summary.maxRounds) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 mt-2">
        {task.status === "failed" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[11px] text-primary hover:text-primary"
            onClick={(e) => { e.stopPropagation(); onRetry(task.id); }}
          >
            重试
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

"use client";

import { type Task, type StageInfo } from "@/lib/api";
import { stageTopColors } from "@/lib/stages";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  stage: StageInfo;
  tasks: Task[];
  subTaskParentIds?: Set<string>;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onTaskClick: (task: Task) => void;
}

export function Column({ stage, tasks, subTaskParentIds, onDelete, onRetry, onTaskClick }: ColumnProps) {
  const topLevelCount = tasks.filter((t) => !t.parentTaskId).length;
  const runningCount = tasks.filter((t) => t.status === "running").length;

  return (
    <div className={`w-72 min-w-72 rounded-lg border-t-2 ${stageTopColors[stage.key] || "border-t-muted"} border-x border-b bg-card flex flex-col`}>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{stage.label}</span>
          <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground font-medium">
            {topLevelCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {runningCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{stage.agent}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isSubTask={!!task.parentTaskId}
            hasChildren={subTaskParentIds?.has(task.id) ?? false}
            onDelete={onDelete}
            onRetry={onRetry}
            onClick={() => onTaskClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-10 text-xs text-muted-foreground">暂无任务</div>
        )}
      </div>
    </div>
  );
}

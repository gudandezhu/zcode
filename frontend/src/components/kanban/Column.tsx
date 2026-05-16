"use client";

import { Task } from "@/lib/api";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  stage: { key: string; label: string; color: string };
  tasks: Task[];
  onDelete: (id: string) => void;
}

export function Column({ stage, tasks, onDelete }: ColumnProps) {
  return (
    <div className={`w-72 min-w-72 rounded-lg border-2 ${stage.color} flex flex-col`}>
      <div className="px-4 py-3 border-b border-inherit flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{stage.label}</span>
          <span className="text-xs bg-white rounded-full px-2 py-0.5 text-muted-foreground border">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            暂无任务
          </div>
        )}
      </div>
    </div>
  );
}

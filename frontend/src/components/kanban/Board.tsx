"use client";

import { useEffect, useState, useCallback } from "react";
import { Task, StageInfo, fetchTasks, fetchStages, createTask, deleteTask } from "@/lib/api";
import { Column } from "./Column";
import { CreateTaskDialog } from "./CreateTaskDialog";

const STAGE_COLORS: Record<string, string> = {
  requirement: "bg-blue-50 border-blue-200",
  design: "bg-purple-50 border-purple-200",
  development: "bg-amber-50 border-amber-200",
  testing: "bg-green-50 border-green-200",
};

export function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [taskData, stageData] = await Promise.all([fetchTasks(), fetchStages()]);
    setTasks(taskData);
    setStages(stageData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleCreate = async (title: string, description: string, stage: string) => {
    await createTask(title, description, stage);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    load();
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold">流水线看板</h1>
        <CreateTaskDialog stages={stages} onCreate={handleCreate} />
      </div>
      <div className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            加载中...
          </div>
        ) : (
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => (
              <Column
                key={stage.key}
                stage={{
                  key: stage.key,
                  label: stage.label,
                  color: STAGE_COLORS[stage.key] || "bg-gray-50 border-gray-200",
                }}
                tasks={tasks.filter((t) => t.stage === stage.key)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { type Task, type StageInfo, fetchTasks, fetchStages, createTask, deleteTask, retryTask } from "@/lib/api";
import { eventStream, applyTaskEvents } from "@/lib/event-stream";
import { stageLabels, stageDotColors } from "@/lib/stages";
import { useApp } from "@/components/app-provider";
import { Column } from "./Column";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { ArrowRight } from "lucide-react";

export function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedTask, setPanelOpen, setPanelTab, selectedTask } = useApp();

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const [taskData, stageData] = await Promise.all([fetchTasks(), fetchStages()]);
    setTasks(taskData);
    setStages(stageData);
    setLoading(false);
  }, []);

  // initial load + SSE subscription
  useEffect(() => {
    let mounted = true;
    const doLoad = async () => {
      const [taskData, stageData] = await Promise.all([fetchTasks(), fetchStages()]);
      if (mounted) {
        setTasks(taskData);
        setStages(stageData);
        setLoading(false);
      }
    };
    doLoad();

    eventStream.connect();
    const unsub = eventStream.subscribe((event) => {
      if (!mounted) return;
      setTasks((prev) => applyTaskEvents(prev, event));
    });

    return () => {
      mounted = false;
      unsub();
      eventStream.disconnect();
    };
  }, []);

  const handleCreate = async (title: string, description: string, stage: string) => {
    await createTask(title, description, stage);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    load();
  };

  const handleRetry = async (id: string) => {
    await retryTask(id);
    load();
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setPanelOpen(true);
    setPanelTab("timeline");
  };

  // sync selected task with polled data
  useEffect(() => {
    if (!selectedTask) return;
    const latest = tasks.find((t) => t.id === selectedTask.id);
    if (latest && latest !== selectedTask) setSelectedTask(latest);
  }, [tasks, selectedTask, setSelectedTask]);

  // organize tasks
  const topLevelTasks = tasks.filter((t) => !t.parentTaskId);
  const subTasksByParent = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.parentTaskId) {
      const children = subTasksByParent.get(t.parentTaskId) || [];
      children.push(t);
      subTasksByParent.set(t.parentTaskId, children);
    }
  }

  const getTasksForStage = (stageKey: string) => {
    const result: Task[] = [];
    for (const t of topLevelTasks) {
      if (t.stage === stageKey) {
        result.push(t);
        result.push(...(subTasksByParent.get(t.id) || []));
      }
    }
    return result;
  };

  // compute active stages (with running tasks)
  const activeStages = new Set<string>(
    tasks.filter((t) => t.status === "running").map((t) => t.stage),
  );

  const taskCountByStage = (stageKey: string) =>
    topLevelTasks.filter((t) => t.stage === stageKey).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Pipeline Overview Bar */}
      <div className="px-6 py-3 border-b bg-card">
        <div className="flex items-center gap-1">
          {stages.map((stage, i) => {
            const count = taskCountByStage(stage.key);
            const isActive = activeStages.has(stage.key);
            return (
              <div key={stage.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : count > 0
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${stageDotColors[stage.key]}`} />
                    </span>
                  )}
                  {!isActive && <span className={`w-2 h-2 rounded-full ${count > 0 ? stageDotColors[stage.key] : "bg-muted-foreground/30"}`} />}
                  <span>{stageLabels[stage.key] || stage.label}</span>
                  <span className={`ml-0.5 text-[10px] ${count > 0 ? "text-foreground" : "text-muted-foreground/60"}`}>
                    {count}
                  </span>
                </div>
                {i < stages.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 mx-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            加载中...
          </div>
        ) : (
          <div className="flex gap-4 min-w-max h-full">
            {stages.map((stage) => (
              <Column
                key={stage.key}
                stage={stage}
                tasks={getTasksForStage(stage.key)}
                subTaskParentIds={new Set([...subTasksByParent.keys()])}
                onDelete={handleDelete}
                onRetry={handleRetry}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Task */}
      <div className="px-6 py-3 border-t bg-card">
        <CreateTaskDialog stages={stages} onCreate={handleCreate} />
      </div>
    </div>
  );
}

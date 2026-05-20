"use client";

import { useApp } from "@/components/app-provider";
import { statusMap } from "@/lib/task-status";
import { stageLabels } from "@/lib/stages";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Users } from "lucide-react";
import { LiveStream } from "./live-stream";
import { TimelineTab } from "./timeline-tab";
import { DiscussionTab } from "./discussion-tab";

const tabs = [
  { id: "timeline" as const, icon: Clock, label: "时间线" },
  { id: "discussion" as const, icon: Users, label: "讨论区" },
];

export function ContextPanel() {
  const { selectedTask, panelOpen, setPanelOpen, panelTab, setPanelTab, triggerRefresh } = useApp();

  if (!panelOpen || !selectedTask) return null;

  const task = selectedTask;
  const status = statusMap[task.status] || statusMap.pending;

  return (
    <>
    <div
      className="absolute inset-0 right-[400px] z-40"
      onClick={() => setPanelOpen(false)}
    />
    <div className="w-[400px] border-l bg-card flex flex-col shrink-0 relative z-50">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold leading-tight pr-6">{task.title}</h2>
          <button
            className="p-1 rounded-md hover:bg-accent transition-colors shrink-0 cursor-pointer"
            onClick={() => setPanelOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{stageLabels[task.stage] || task.stage}</Badge>
        </div>
      </div>

      {/* Live progress — main view */}
      <LiveStream task={task} onRefresh={triggerRefresh} />

      {/* Secondary tabs */}
      <div className="flex border-b border-t">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setPanelTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] transition-colors cursor-pointer ${
              panelTab === id
                ? "text-foreground border-b-2 border-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {panelTab === "timeline" && <TimelineTab task={task} />}
        {panelTab === "discussion" && <DiscussionTab task={task} />}
      </div>
    </div>
    </>
  );
}

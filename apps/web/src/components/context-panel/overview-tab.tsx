"use client";

import { type Task, approveTask, rejectTask, retryTask } from "@/lib/api";
import { stageLabels, PIPELINE_STAGES } from "@/lib/stages";
import { ArtifactItem } from "./artifact-item";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function OverviewTab({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const currentIdx = PIPELINE_STAGES.indexOf(task.stage);

  const handleApprove = async () => { await approveTask(task.id); onRefresh(); };
  const handleReject = async () => { await rejectTask(task.id, "请修改后重新提交"); onRefresh(); };
  const handleRetry = async () => { await retryTask(task.id); onRefresh(); };

  const allArtifacts = task.artifacts || [];

  return (
    <div className="flex flex-col gap-4 p-4">
      {task.description && (
        <p className="text-sm text-muted-foreground">{task.description}</p>
      )}

      {task.agentName && (
        <div className="text-xs text-muted-foreground">
          Agent: <span className="text-foreground font-medium">{task.agentName}</span>
        </div>
      )}

      {PIPELINE_STAGES.includes(task.stage) && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">流水线进度</p>
          <div className="flex items-center gap-1">
            {PIPELINE_STAGES.map((s, i) => {
              const isCompleted = i < currentIdx || task.stage === "done";
              const isCurrent = s === task.stage;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border-2 transition-colors ${
                      isCompleted ? "bg-green-500 border-green-500 text-white"
                        : isCurrent ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-muted-foreground/30 text-muted-foreground"
                    }`}>
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className="text-[10px] mt-0.5 text-muted-foreground">{stageLabels[s]}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 -mt-3 ${i < currentIdx ? "bg-green-500" : "bg-muted-foreground/20"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {task.status === "waiting_review" && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">审批操作</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleApprove}>通过</Button>
            <Button size="sm" variant="destructive" onClick={handleReject}>驳回</Button>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">操作</p>
        <div className="flex flex-wrap gap-2">
          {task.status === "failed" && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRetry}>
              <RotateCcw className="w-3 h-3" /> 重试
            </Button>
          )}
        </div>
      </div>

      {allArtifacts.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            产出物 ({allArtifacts.length})
          </p>
          <div className="space-y-1">
            {allArtifacts.slice(0, 3).map((art, i) => (
              <ArtifactItem key={i} artifact={art} />
            ))}
            {allArtifacts.length > 3 && (
              <p className="text-[10px] text-muted-foreground px-1">还有 {allArtifacts.length - 3} 个产出物</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

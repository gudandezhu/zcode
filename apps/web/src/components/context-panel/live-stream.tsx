"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  type Task, type Session, type SessionEvent,
  fetchSessions, streamSession, fetchSessionEvents, sendUserInput,
  approveTask, rejectTask, retryTask,
} from "@/lib/api";
import { stageLabels, PIPELINE_STAGES } from "@/lib/stages";
import { mergeEventsToSteps, getToolIcon, type Step } from "@/lib/live-stream-logic";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check, Loader2, AlertCircle, ChevronDown,
  FileText, Wrench, MessageSquare, Brain,
  RotateCcw, Search, Terminal, FolderOpen,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  search: Search,
  terminal: Terminal,
  folder: FolderOpen,
  wrench: Wrench,
};

// ── Thinking block (auto-expand/collapse) ───────────────

function ThinkingBlock({ step }: { step: Step }) {
  const [open, setOpen] = useState(true);
  const [hasAutoClosed, setHasAutoClosed] = useState(false);
  const isActive = step.status === "active";
  const [elapsed, setElapsed] = useState(() => Math.ceil((Date.now() - step.startedAt) / 1000));

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setElapsed(Math.ceil((Date.now() - step.startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isActive, step.startedAt]);

  useEffect(() => {
    if (!isActive && open && !hasAutoClosed) {
      const t = setTimeout(() => { setOpen(false); setHasAutoClosed(true); }, 1000);
      return () => clearTimeout(t);
    }
  }, [isActive, open, hasAutoClosed]);

  return (
    <div>
      <button
        className="flex items-center gap-2 w-full text-left py-0.5 text-[11px] cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="relative flex items-center justify-center">
          <Brain className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          <div className="absolute top-5 bottom-0 left-1/2 -mx-px w-px bg-border" />
        </div>
        {isActive ? (
          <span className="text-primary font-medium shimmer-text">思考中...</span>
        ) : (
          <span className="text-muted-foreground">
            思考了 {elapsed ?? '几'} 秒
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-muted-foreground ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && step.detail && (
        <div className="ml-[22px] text-[10px] text-muted-foreground/70 max-h-20 overflow-y-auto leading-relaxed border-l border-border pl-2 whitespace-pre-wrap">
          {step.detail.slice(-300)}
        </div>
      )}
    </div>
  );
}

// ── Tool step (icon + label + connecting line) ───────────

function ToolStep({ step }: { step: Step }) {
  const toolName = step.toolName || "";
  const isActive = step.status === "active";
  const ToolIcon = ICON_MAP[getToolIcon(toolName)] || Wrench;

  return (
    <div className="flex gap-2 text-[11px] py-0.5">
      <div className="relative flex items-center justify-center mt-0.5">
        {isActive ? (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5 text-green-500" />
        )}
        <div className="absolute top-5 bottom-0 left-1/2 -mx-px w-px bg-border" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {React.createElement(ToolIcon, { className: "w-3 h-3 shrink-0 text-muted-foreground" })}
          <span className={`truncate ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {step.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Output step (streaming text) ─────────────────────────

function OutputStep({ step }: { step: Step }) {
  const isActive = step.status === "active";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [step.detail, isActive]);

  if (!step.detail) return null;

  return (
    <div className="flex gap-2 text-[11px] py-0.5">
      <div className="relative flex items-center justify-center mt-0.5">
        <MessageSquare className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div
        ref={ref}
        className="flex-1 text-xs leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap text-muted-foreground"
      >
        {step.detail}
        {isActive && <span className="inline-block w-1 h-3 bg-primary animate-pulse ml-0.5 align-middle" />}
      </div>
    </div>
  );
}

// ── Main LiveStream component ───────────────────────────

export function LiveStream({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const connectStream = useCallback((sessionId: string) => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setActiveSessionId(sessionId);
    setStreaming(true);
    setClarifyQuestion(null);

    fetchSessionEvents(sessionId).then((history) => {
      const historical = history.map((e) => ({
        type: e.type, content: e.content, agent: e.agent,
        name: e.name, arguments: e.arguments, question: e.question,
        round: e.round, role: e.role, participants: e.participants,
        topic: e.topic, summary: e.summary, timestamp: Date.now(),
      }));
      setEvents(historical);

      const lastType = history.length > 0 ? history[history.length - 1].type : "";
      if (lastType === "done" || lastType === "session_completed") {
        setStreaming(false);
        return;
      }

      abortRef.current = streamSession(
        sessionId,
        (event: SessionEvent) => {
          const execEvent: SessionEvent = {
            type: event.type, content: event.content, agent: event.agent,
            name: event.name, arguments: event.arguments, question: event.question,
            round: event.round, role: event.role, participants: event.participants,
            topic: event.topic, summary: event.summary, timestamp: Date.now(),
          };
          setEvents((prev) => [...prev, execEvent]);
          if (event.type === "clarify_user" && event.question) setClarifyQuestion(event.question);
        },
        () => setStreaming(false),
      );
    });
  }, []);

  useEffect(() => {
    let active = true;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

    fetchSessions(task.id).then((data) => {
      if (!active) return;
      setEvents([]);
      setStreaming(false);
      setClarifyQuestion(null);
      setActiveSessionId(null);
      setSessions(data);
      const running = data.find((s) => s.status === "running");
      if (running) connectStream(running.id);
    });
    return () => { active = false; };
  }, [task.id, task.status, task.updatedAt, connectStream]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const handleUserInput = useCallback(async () => {
    if (!userInput.trim() || !activeSessionId) return;
    const input = userInput.trim();
    setUserInput("");
    setClarifyQuestion(null);
    setEvents((prev) => [...prev, { type: "user_input", content: input, timestamp: Date.now() }]);
    await sendUserInput(activeSessionId, input);
  }, [userInput, activeSessionId]);

  useEffect(() => { return () => { if (abortRef.current) abortRef.current.abort(); }; }, []);

  const { steps, clarifyQuestion: mergedClarify } = useMemo(
    () => mergeEventsToSteps(events), [events],
  );

  const hasRunning = sessions.some((s) => s.status === "running");
  const agentName = task.agentName || "";
  const doneCount = steps.filter((s) => s.status === "done").length;
  const allArtifacts = task.artifacts || [];
  const currentIdx = PIPELINE_STAGES.indexOf(task.stage);
  const question = clarifyQuestion || mergedClarify;

  const handleApprove = async () => { await approveTask(task.id); onRefresh(); };
  const handleReject = async () => { await rejectTask(task.id, "请修改后重新提交"); onRefresh(); };
  const handleRetry = async () => { await retryTask(task.id); onRefresh(); };

  // Split steps: show last N, collapse the rest
  const COLLAPSE_THRESHOLD = 5;
  const showAll = steps.length <= COLLAPSE_THRESHOLD;
  const collapsedSteps = showAll ? [] : steps.slice(0, steps.length - 3);
  const visibleSteps = showAll ? steps : steps.slice(steps.length - 3);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Pipeline progress */}
      {PIPELINE_STAGES.includes(task.stage) && (
        <div className="px-4 pt-3 pb-2 border-b">
          <div className="flex items-center gap-0.5">
            {PIPELINE_STAGES.map((s, i) => {
              const isCompleted = i < currentIdx || task.stage === "done";
              const isCurrent = s === task.stage;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium border-2 transition-colors ${
                      isCompleted ? "bg-green-500 border-green-500 text-white"
                        : isCurrent ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-muted-foreground/30 text-muted-foreground"
                    }`}>
                      {isCompleted ? "✓" : i + 1}
                    </div>
                    <span className="text-[9px] mt-0.5 text-muted-foreground">{stageLabels[s]}</span>
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

      {/* Status bar */}
      {(steps.length > 0 || hasRunning || agentName) && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {streaming ? (
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
            ) : doneCount > 0 ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : null}
            <span className="text-[11px] text-muted-foreground">
              {agentName}{agentName && " · "}{streaming ? "执行中" : doneCount > 0 ? "已结束" : "等待执行"}
            </span>
            {streaming && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
            )}
          </div>
          {doneCount > 0 && (
            <span className="text-[10px] text-muted-foreground">{doneCount} 步</span>
          )}
        </div>
      )}

      {/* Steps — ChainOfThought style */}
      {(steps.length > 0 || hasRunning) && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3 space-y-2">
            {steps.length === 0 && hasRunning && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-4 justify-center">
                <Loader2 className="w-3 h-3 animate-spin" />
                等待 Agent 输出...
              </div>
            )}

            {/* Collapsed history */}
            {!showAll && !expanded && collapsedSteps.length > 0 && (
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer py-1 flex items-center gap-1"
                onClick={() => setExpanded(true)}
              >
                <ChevronDown className="w-3 h-3 rotate-180" />
                展开前 {collapsedSteps.length} 步
              </button>
            )}
            {expanded && collapsedSteps.length > 0 && (
              <>
                {collapsedSteps.map((step) => (
                  <StepRenderer key={step.id} step={step} />
                ))}
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer py-1 flex items-center gap-1"
                  onClick={() => setExpanded(false)}
                >
                  <ChevronDown className="w-3 h-3" />
                  收起
                </button>
              </>
            )}

            {/* Visible steps */}
            {visibleSteps.map((step) => (
              <StepRenderer key={step.id} step={step} />
            ))}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}

      {/* Empty state */}
      {steps.length === 0 && !hasRunning && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">暂无执行记录</p>
        </div>
      )}

      {/* Clarify input */}
      {question && (
        <div className="border-t px-4 py-2">
          <p className="text-xs text-muted-foreground mb-1.5">{question}</p>
          <div className="flex gap-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="输入回复..."
              className="h-7 text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") handleUserInput(); }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleUserInput}>发送</Button>
          </div>
        </div>
      )}

      {/* Action bar */}
      {(task.status === "waiting_review" || task.status === "failed" || allArtifacts.length > 0) && (
        <div className="border-t px-4 py-2 space-y-2">
          {task.status === "waiting_review" && (
            <div className="flex gap-2">
              <Button size="sm" className="text-xs h-7" onClick={handleApprove}>通过</Button>
              <Button size="sm" variant="destructive" className="text-xs h-7" onClick={handleReject}>驳回</Button>
            </div>
          )}
          {task.status === "failed" && (
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={handleRetry}>
              <RotateCcw className="w-3 h-3" /> 重试
            </Button>
          )}
          {allArtifacts.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">产出物 ({allArtifacts.length})</p>
              <div className="space-y-0.5">
                {allArtifacts.slice(0, 5).map((art, i) => (
                  <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span>{String(art.title || `产出物 ${i + 1}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step renderer ───────────────────────────────────────

function StepRenderer({ step }: { step: Step }) {
  switch (step.type) {
    case "thinking":
      return <ThinkingBlock step={step} />;
    case "tool":
      return <ToolStep step={step} />;
    case "output":
      return <OutputStep step={step} />;
    case "error":
      return (
        <div className="flex gap-2 text-[11px] py-0.5">
          <div className="relative flex items-center justify-center mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          </div>
          <span className="text-destructive">{step.label}</span>
        </div>
      );
    case "complete":
      return (
        <div className="flex gap-2 text-[11px] py-0.5">
          <div className="relative flex items-center justify-center mt-0.5">
            <Check className="w-3.5 h-3.5 text-green-500" />
          </div>
          <span className="text-muted-foreground">{step.label}</span>
        </div>
      );
    default:
      return null;
  }
}

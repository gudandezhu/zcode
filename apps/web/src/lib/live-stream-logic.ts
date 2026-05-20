import type { ExecutionEvent } from "@/lib/stages";

export type StepStatus = "active" | "done" | "error";
export type StepType = "thinking" | "tool" | "output" | "error" | "complete";

export interface Step {
  id: string;
  type: StepType;
  label: string;
  detail?: string;
  status: StepStatus;
  toolName?: string;
  startedAt: number;
}

export function getToolIcon(name: string) {
  if (name.includes("read") || name.includes("write") || name.includes("str_replace"))
    return "file";
  if (name.includes("search") || name.includes("web_search"))
    return "search";
  if (name.includes("bash") || name.includes("exec") || name.includes("command"))
    return "terminal";
  if (name.includes("ls") || name.includes("list") || name.includes("dir"))
    return "folder";
  return "wrench";
}

export function formatToolLabel(name: string, argsStr?: string): string {
  try {
    const args = JSON.parse(argsStr || "{}");
    const vals = Object.values(args);
    if (vals.length > 0 && typeof vals[0] === "string" && vals[0].length < 50) {
      return `${vals[0]}`;
    }
  } catch {}
  return name;
}

export function mergeEventsToSteps(events: ExecutionEvent[]): {
  steps: Step[];
  clarifyQuestion: string | null;
} {
  const steps: Step[] = [];
  let pendingToolId: string | null = null;
  let textAccum = "";
  let textStepId: string | null = null;
  let clarifyQuestion: string | null = null;

  for (const evt of events) {
    if (evt.type === "clarify_user" && evt.question) {
      clarifyQuestion = evt.question;
      continue;
    }

    if (evt.type === "text") {
      if (!textStepId) {
        textStepId = `out-${steps.length}`;
        steps.push({
          id: textStepId, type: "output", label: "输出",
          detail: "", status: "active", startedAt: Date.now(),
        });
      }
      textAccum += evt.content || "";
      const step = steps.find((s) => s.id === textStepId);
      if (step) step.detail = textAccum;
      continue;
    }

    if (textStepId) {
      const step = steps.find((s) => s.id === textStepId);
      if (step) step.status = "done";
      textStepId = null;
      textAccum = "";
    }

    if (evt.type === "tool_call") {
      if (pendingToolId) {
        const prev = steps.find((s) => s.id === pendingToolId);
        if (prev) prev.status = "done";
      }
      pendingToolId = `tool-${steps.length}`;
      const toolName = evt.name || "unknown";
      steps.push({
        id: pendingToolId, type: "tool",
        label: formatToolLabel(toolName, evt.arguments),
        status: "active", toolName, startedAt: Date.now(),
      });
      continue;
    }

    if (evt.type === "tool_result") {
      if (pendingToolId) {
        const step = steps.find((s) => s.id === pendingToolId);
        if (step) {
          step.status = "done";
          const result = evt.content || "";
          if (result.length < 120) step.detail = result;
        }
        pendingToolId = null;
      }
      continue;
    }

    if (evt.type === "error") {
      steps.push({
        id: `err-${steps.length}`, type: "error",
        label: evt.content || "执行出错", status: "error", startedAt: Date.now(),
      });
      continue;
    }

    if (evt.type === "session_completed") {
      steps.push({
        id: `done-${steps.length}`, type: "complete",
        label: "执行完成", status: "done", startedAt: Date.now(),
      });
      continue;
    }
  }

  return { steps, clarifyQuestion };
}

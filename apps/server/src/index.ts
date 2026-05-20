import { serve } from "@hono/node-server";
import { app } from "./app";
import type { Task } from "@zcode/shared";
import * as taskSvc from "./services/task";
import * as sessionSvc from "./services/session";
import { sessionManager } from "./engine/session";
import { getNextStage, getAgentForStage } from "./services/pipeline";
import { startSessionForTask } from "./engine";

const port = parseInt(process.env.PORT || "8000");

async function recoverStuckTasks() {
  const tasks = await taskSvc.listTasks();
  const stuck = tasks.filter((t) => t.status === "running");

  for (const task of stuck) {
    // Check if there's a live session still in memory
    const liveSessions = sessionManager.listByTask(task.id);
    const runningLive = liveSessions.find((s) => s.status === "running");
    if (runningLive) continue;

    // Check DB sessions
    const dbSessions = await sessionSvc.listSessionsByTask(task.id);
    const latest = dbSessions.length > 0 ? dbSessions[dbSessions.length - 1] : null;

    if (latest) {
      await taskSvc.completeSession(latest.id, task.id, latest.status, latest.artifacts);

      // Handle stage advancement for completed sessions
      if (latest.status === "completed") {
        const hasAdvance = latest.artifacts.some(
          (a) => a.type === "stage_advance",
        );
        if (hasAdvance) {
          const nextStage = getNextStage(task.stage);
          if (nextStage) {
            const nextAgent = getAgentForStage(nextStage);
            await taskSvc.updateTask(task.id, { stage: nextStage as Task["stage"] });
            if (nextAgent) {
              startSessionForTask(task.id, nextAgent, task.description || "").catch(() => {});
            }
          }
        }
      }
      console.log(`[recovery] task ${task.id} synced from session ${latest.id}`);
    } else {
      await taskSvc.transitionTask(task.id, "fail");
      console.log(`[recovery] task ${task.id} marked failed (no session found)`);
    }
  }

  if (stuck.length > 0) {
    console.log(`[recovery] checked ${stuck.length} stuck task(s)`);
  }
}

console.log(`zcode server starting on port ${port}`);
serve({ fetch: app.fetch, port });

setTimeout(recoverStuckTasks, 500);

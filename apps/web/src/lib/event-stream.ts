import type { Task } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type EventHandler = (event: { type: string; data: unknown }) => void;

class EventStream {
  private es: EventSource | null = null;
  private listeners: Set<EventHandler> = new Set();
  private refCount = 0;
  private retryDelay = 1000;
  private maxRetryDelay = 30000;

  connect() {
    this.refCount++;
    this.retryDelay = 1000;
    if (this.es) return;
    this.open();
  }

  private open() {
    this.es = new EventSource(`${API}/api/events`);
    this.es.onmessage = (e) => {
      if (e.data === "") return;
      try {
        const parsed = JSON.parse(e.data);
        for (const handler of this.listeners) {
          handler(parsed);
        }
      } catch { /* ignore */ }
    };
    this.es.onerror = () => {
      this.es?.close();
      this.es = null;
      if (this.refCount > 0) {
        setTimeout(() => this.open(), this.retryDelay);
        this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
      }
    };
  }

  disconnect() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.es?.close();
      this.es = null;
    }
  }

  subscribe(handler: EventHandler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }
}

export const eventStream = new EventStream();

export function applyTaskEvents(tasks: Task[], event: { type: string; data: unknown }): Task[] {
  if (event.type === "task_updated") {
    const updated = event.data as Task;
    const idx = tasks.findIndex((t) => t.id === updated.id);
    if (idx >= 0) {
      const next = [...tasks];
      next[idx] = updated;
      return next;
    }
    return [...tasks, updated];
  }
  if (event.type === "task_deleted") {
    const { id } = event.data as { id: string };
    return tasks.filter((t) => t.id !== id);
  }
  return tasks;
}

export function isDiscussionEvent(event: { type: string; data: unknown }): boolean {
  return event.type === "discussion_update";
}

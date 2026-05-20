"use client";

import { useApp } from "./app-provider";
import { useState, useEffect, useRef } from "react";
import { Bell, Moon, Sun } from "lucide-react";
import { eventStream } from "@/lib/event-stream";
import { mapStatusMessage } from "@/lib/task-status";

interface NotificationEvent {
  type: string;
  taskId: string;
  status: string;
  stage: string;
  message: string;
}

export function Topbar() {
  const { darkMode, toggleDarkMode } = useApp();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    eventStream.connect();
    const unsub = eventStream.subscribe((event) => {
      if (event.type === "task_updated") {
        const data = event.data as { status?: string; id?: string; stage?: string };
        const msg = mapStatusMessage(data.status);
        if (msg) {
          const n: NotificationEvent = {
            type: "task_status_changed",
            taskId: data.id || "",
            status: data.status || "",
            stage: data.stage || "",
            message: msg,
          };
          setUnread((c) => c + 1);
          setNotifications((prev) => [n, ...prev].slice(0, 20));
        }
      }
    });
    return () => { unsub(); eventStream.disconnect(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <header className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
      <span className="text-xs text-muted-foreground hidden sm:block">AI 编码助手</span>
      <div className="ml-auto flex items-center gap-1">
        <div className="relative" ref={dropRef}>
          <button
            className="relative p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
            onClick={() => { setOpen(!open); if (!open) setUnread(0); }}
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-popover border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">暂无通知</div>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className="px-3 py-2 border-b last:border-0 hover:bg-accent/50 text-xs">
                    <div className="font-medium">{n.message}</div>
                    <div className="text-muted-foreground mt-0.5">{n.stage} · {n.taskId}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          className="p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
          onClick={toggleDarkMode}
          title={darkMode ? "切换亮色模式" : "切换暗色模式"}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
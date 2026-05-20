"use client";

import { useApp } from "./app-provider";
import { type Task, fetchTasks } from "@/lib/api";
import { statusDotColors } from "@/lib/task-status";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";

const navItems = [
  { href: "/kanban", icon: LayoutDashboard, label: "看板" },
  { href: "/settings", icon: Settings, label: "设置" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedTask, setSelectedTask, setPanelOpen, setPanelTab, refreshKey } = useApp();
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  useEffect(() => {
    let active = true;
    fetchTasks().then((tasks) => {
      if (active) setRecentTasks(tasks.slice(0, 6));
    });
    return () => { active = false; };
  }, [refreshKey]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setPanelOpen(true);
    setPanelTab("timeline");
    router.push("/kanban");
  };

  return (
    <aside className="w-[200px] border-r bg-card flex flex-col shrink-0">
      <div className="h-14 flex items-center px-4 border-b">
        <span className="font-bold text-lg tracking-tight">Zcode</span>
      </div>

      <nav className="p-2 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t mx-3 my-2" />

      <div className="flex-1 overflow-y-auto px-3 min-h-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
          最近任务
        </p>
        <div className="space-y-0.5">
          {recentTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                selectedTask?.id === task.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColors[task.status] || "bg-muted-foreground/40"}`} />
                <span className="truncate">{task.title}</span>
              </div>
            </button>
          ))}
          {recentTasks.length === 0 && (
            <p className="text-[10px] text-muted-foreground px-1">暂无任务</p>
          )}
        </div>
      </div>
    </aside>
  );
}

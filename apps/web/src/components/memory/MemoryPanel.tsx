"use client";

import { useEffect, useState, useCallback } from "react";
import { Memory, fetchMemories, createMemory, deleteMemory } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface MemoryPanelProps {
  projectId: string;
}

export function MemoryPanel({ projectId }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newFact, setNewFact] = useState("");
  const [showInput, setShowInput] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchMemories(projectId);
    setMemories(data);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    const doLoad = async () => {
      const data = await fetchMemories(projectId);
      if (active) setMemories(data);
    };
    doLoad();
    return () => { active = false; };
  }, [projectId]);

  const handleAdd = async () => {
    if (!newFact.trim()) return;
    await createMemory(projectId, newFact.trim());
    setNewFact("");
    setShowInput(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    load();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">项目记忆</h4>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 text-[10px]"
          onClick={() => setShowInput(!showInput)}
        >
          {showInput ? "取消" : "添加"}
        </Button>
      </div>

      {showInput && (
        <div className="flex gap-1">
          <input
            className="flex-1 text-xs border rounded px-2 py-1"
            placeholder="输入项目事实..."
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" className="h-6 text-[10px]" onClick={handleAdd}>
            保存
          </Button>
        </div>
      )}

      {memories.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">暂无记忆</p>
      ) : (
        <ul className="space-y-1">
          {memories.map((m) => (
            <li key={m.id} className="flex items-start gap-1 group">
              <span className="text-xs flex-1">{m.fact}</span>
              <button
                className="text-[10px] text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(m.id)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { type Agent, type StageInfo, fetchAgents, fetchStages, reloadAgents } from "@/lib/api";
import { stageLabels } from "@/lib/stages";
import { MemoryPanel } from "@/components/memory/MemoryPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Bot, GitBranch, Cpu } from "lucide-react";

type SettingsTab = "pipeline" | "agents" | "memory";

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("pipeline");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [agentData, stageData] = await Promise.all([fetchAgents(), fetchStages()]);
    setAgents(agentData);
    setStages(stageData);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const handleReload = async () => {
    await reloadAgents();
    load();
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof Cpu }[] = [
    { id: "pipeline", label: "流水线", icon: GitBranch },
    { id: "agents", label: "Agent", icon: Bot },
    { id: "memory", label: "记忆", icon: Cpu },
  ];

  // Find a projectId from stages or agents (placeholder - will use real project API later)
  const defaultProjectId = "default";

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-card flex items-center justify-between">
        <h1 className="text-lg font-semibold">设置</h1>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleReload}>
          <RefreshCw className="w-3 h-3" /> 重新加载 Agent
        </Button>
      </div>

      <div className="flex border-b bg-card">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm transition-colors cursor-pointer ${
              tab === id
                ? "text-foreground border-b-2 border-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : tab === "pipeline" ? (
            <PipelineTab stages={stages} />
          ) : tab === "agents" ? (
            <AgentsTab agents={agents} />
          ) : (
            <MemoryTab projectId={defaultProjectId} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PipelineTab({ stages }: { stages: StageInfo[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">流水线阶段</h2>
      <div className="space-y-2">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-3 px-4 py-3 bg-card border rounded-md">
            <span className="text-xs text-muted-foreground tabular-nums w-4">{i + 1}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{stageLabels[stage.key] || stage.label}</span>
                <Badge variant="outline" className="text-[10px]">{stage.key}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">Agent: {stage.agent}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentsTab({ agents }: { agents: Agent[] }) {
  const pipelineAgents = agents.filter((a) => a.stage);
  const customAgents = agents.filter((a) => !a.stage);

  return (
    <div className="space-y-6">
      {pipelineAgents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">流水线 Agent</h2>
          <div className="space-y-2">
            {pipelineAgents.map((agent) => (
              <div key={agent.name} className="px-4 py-3 bg-card border rounded-md">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{agent.role}</span>
                  <Badge variant="outline" className="text-[10px]">{agent.name}</Badge>
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>阶段: {stageLabels[agent.stage] || agent.stage}</span>
                  <span>模型: {agent.model}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {customAgents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">自定义 Agent</h2>
          <div className="space-y-2">
            {customAgents.map((agent) => (
              <div key={agent.name} className="px-4 py-3 bg-card border rounded-md">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{agent.role}</span>
                  <Badge variant="outline" className="text-[10px]">{agent.name}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  <span>模型: {agent.model}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemoryTab({ projectId }: { projectId: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">项目记忆</h2>
      <MemoryPanel projectId={projectId} />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Agent, streamChat, fetchAgents } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
interface Message {
  role: string;
  content: string;
}

interface ChatPanelProps {
  initialAgent?: string;
  initialTaskId?: string;
}

export function ChatPanel({ initialAgent, initialTaskId }: ChatPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState(initialAgent || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents().then(setAgents);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    let accumulated = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    await streamChat(
      selectedAgent,
      userMsg,
      conversationId,
      initialTaskId || "",
      (chunk) => {
        accumulated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      },
      (finalConvId) => {
        setConversationId(finalConvId);
        setIsLoading(false);
      },
      (error) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `Error: ${error}` };
          return updated;
        });
        setIsLoading(false);
      },
    );
  }, [input, selectedAgent, isLoading, conversationId, initialTaskId]);

  const pipelineAgents = agents.filter((a) => a.stage);
  const customAgents = agents.filter((a) => !a.stage);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Agent Selector */}
      <div className="border-b px-6 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Agent:</span>
        {pipelineAgents.map((agent) => (
          <Button
            key={agent.name}
            size="sm"
            variant={selectedAgent === agent.name ? "default" : "outline"}
            onClick={() => {
              setSelectedAgent(agent.name);
              setMessages([]);
              setConversationId("");
            }}
          >
            {agent.role}
          </Button>
        ))}
        {customAgents.length > 0 && (
          <>
            <div className="w-px h-6 bg-border" />
            {customAgents.map((agent) => (
              <Button
                key={agent.name}
                size="sm"
                variant={selectedAgent === agent.name ? "default" : "outline"}
                onClick={() => {
                  setSelectedAgent(agent.name);
                  setMessages([]);
                  setConversationId("");
                }}
              >
                {agent.role}
              </Button>
            ))}
          </>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6">
        <div ref={scrollRef} className="py-4 space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg mb-2">
                {selectedAgent
                  ? `与 ${agents.find((a) => a.name === selectedAgent)?.role || selectedAgent} 对话`
                  : "请先选择一个 Agent"}
              </p>
              <p className="text-sm">选择上方的 Agent 开始对话</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content || (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedAgent ? "输入消息..." : "请先选择 Agent"
            }
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!selectedAgent || isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!selectedAgent || isLoading || !input.trim()}
          >
            {isLoading ? "..." : "发送"}
          </Button>
        </div>
      </div>
    </div>
  );
}

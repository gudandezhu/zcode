"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Task, type SSEEvent, type DiscussionBoard, type DiscussionMessage,
  fetchBoard, fetchBoardMessages, sendBoardMessage, streamBoard,
  createBoardProtocol, updateBoardProtocol,
} from "@/lib/api";
import type { ProtocolType } from "@zcode/shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function ParticipantsBar({ participants }: { participants: string[] }) {
  if (participants.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b bg-muted/30">
      {participants.map((p) => (
        <Badge key={p} variant="secondary" className="text-[10px] gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {p}
        </Badge>
      ))}
    </div>
  );
}

function AgentMessage({ msg }: { msg: DiscussionMessage }) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-1.5 mb-0.5 px-1">
        <span className="text-[10px] font-medium text-muted-foreground">{msg.speaker}</span>
        <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
        {msg.triggerType === "mention" && <Badge variant="outline" className="text-[9px] py-0">@提及</Badge>}
        {msg.triggerType === "topic" && <Badge variant="outline" className="text-[9px] py-0">Topic</Badge>}
      </div>
      <div className="max-w-[85%] bg-muted rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
        {msg.content}
      </div>
      {msg.reactions.length > 0 && (
        <div className="mt-1 ml-2 space-y-0.5">
          {msg.reactions.map((r, i) => (
            <div key={i} className="text-[10px] text-muted-foreground">
              <span className="font-medium">{r.agentName}</span>
              {r.action === "acknowledge" && " 已记录"}
              {r.action === "approve" && " ✅ 同意"}
              {r.action === "reject" && " ❌ 反对"}
              {r.content && `: ${r.content}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMessage({ msg }: { msg: DiscussionMessage }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
        你 · {new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <div className="max-w-[85%] bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
        {msg.content}
      </div>
    </div>
  );
}

function ProtocolMessage({ msg, onAction }: { msg: DiscussionMessage; onAction?: (id: string, action: "approve" | "reject") => void }) {
  const statusLabel = msg.protocolStatus === "pending" ? "等待中" :
    msg.protocolStatus === "passed" ? "已通过" :
    msg.protocolStatus === "failed" ? "未通过" : "已过期";
  const statusColor = msg.protocolStatus === "passed" ? "text-green-600" :
    msg.protocolStatus === "failed" ? "text-red-600" :
    msg.protocolStatus === "pending" ? "text-yellow-600" : "text-muted-foreground";
  return (
    <div className="border rounded-lg px-3 py-2 text-sm bg-secondary/50">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs">📋</span>
        <span className="font-medium text-xs">
          {msg.protocolType === "review_request" ? "Review Request" :
            msg.protocolType === "consensus" ? "Consensus" : "Escalation"}
        </span>
        <span className={`text-[10px] ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="text-xs mb-2">
        <span className="text-muted-foreground">{msg.speaker}: </span>
        {msg.content}
      </div>
      {msg.reactions.length > 0 && (
        <div className="space-y-0.5 border-t pt-1.5">
          {msg.reactions.map((r, i) => (
            <div key={i} className="text-[10px] flex items-center gap-1">
              <span className="font-medium">{r.agentName}</span>
              {r.action === "approve" && <span className="text-green-600">✅ {r.content}</span>}
              {r.action === "reject" && <span className="text-red-600">❌ {r.content}</span>}
            </div>
          ))}
        </div>
      )}
      {msg.protocolStatus === "pending" && onAction && (
        <div className="flex gap-2 mt-2 pt-1.5 border-t">
          <button className="text-[10px] text-green-600 hover:underline cursor-pointer" onClick={() => onAction(msg.id, "approve")}>✅ 同意</button>
          <button className="text-[10px] text-red-600 hover:underline cursor-pointer" onClick={() => onAction(msg.id, "reject")}>❌ 反对</button>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, onAction }: { msg: DiscussionMessage; onAction?: (id: string, action: "approve" | "reject") => void }) {
  if (msg.protocolType) return <ProtocolMessage msg={msg} onAction={onAction} />;
  if (msg.speaker === "user") return <UserMessage msg={msg} />;
  return <AgentMessage msg={msg} />;
}

export function DiscussionTab({ task }: { task: Task }) {
  const [board, setBoard] = useState<DiscussionBoard | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [protocolType, setProtocolType] = useState<ProtocolType>("review_request");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load board + messages
  useEffect(() => {
    let active = true;
    fetchBoard(task.id).then((b) => {
      if (!active) return;
      setMessages([]);
      setBoard(b);
      fetchBoardMessages(b.id).then((msgs) => { if (active) setMessages(msgs); });
    });
    return () => { active = false; };
  }, [task.id]);

  // SSE stream
  useEffect(() => {
    if (!board) return;
    abortRef.current?.abort();
    const ctrl = streamBoard(
      board.id,
      (event: SSEEvent) => {
        if (event.type === "board_message" && event.message) {
          setMessages((prev) => {
            const msg = event.message as unknown as DiscussionMessage;
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
        if (event.type === "board_reaction" && event.reaction) {
          // Refresh messages on reaction
          fetchBoardMessages(board.id).then((msgs) => setMessages(msgs));
        }
        if (event.type === "board_protocol_update") {
          fetchBoardMessages(board.id).then((msgs) => setMessages(msgs));
        }
      },
      () => {},
    );
    abortRef.current = ctrl;
    return () => { ctrl.abort(); };
  }, [board?.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !board || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);

    // Parse @mentions
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    try {
      await sendBoardMessage(board.id, { speaker: "user", content: text, mentions });
    } finally {
      setLoading(false);
    }
  }, [input, board, loading]);

  const handleSendProtocol = useCallback(async () => {
    if (!input.trim() || !board || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) mentions.push(match[1]);

    try {
      await createBoardProtocol(board.id, {
        speaker: "user",
        content: text,
        protocolType: protocolType,
        mentions: mentions.length > 0 ? mentions : board.participants,
      });
      setShowProtocol(false);
    } finally {
      setLoading(false);
    }
  }, [input, board, loading, protocolType]);

  const handleProtocolAction = useCallback(async (messageId: string, action: "approve" | "reject") => {
    if (!board) return;
    await updateBoardProtocol(board.id, messageId, action === "approve" ? "passed" : "failed");
  }, [board]);

  // Refresh board participants
  useEffect(() => {
    if (!board) return;
    const interval = setInterval(() => {
      fetchBoard(task.id).then((b) => setBoard(b));
    }, 10000);
    return () => clearInterval(interval);
  }, [board?.id, task.id]);

  return (
    <div className="flex flex-col h-full">
      <ParticipantsBar participants={board?.participants || []} />

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">讨论区</p>
              <p className="text-xs mt-1">发送消息或 @提及 Agent 开始讨论</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onAction={handleProtocolAction} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3 space-y-2">
        {showProtocol && (
          <div className="flex gap-2">
            <select
              value={protocolType}
              onChange={(e) => setProtocolType(e.target.value as ProtocolType)}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="review_request">Review Request</option>
              <option value="consensus">Consensus</option>
              <option value="escalation">Escalation</option>
            </select>
            <Button size="sm" variant="secondary" onClick={handleSendProtocol} disabled={loading || !input.trim()}>
              发起协议
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowProtocol(false)}>取消</Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={showProtocol ? "协议内容... @agent" : "输入消息... @agent 提及"}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); showProtocol ? handleSendProtocol() : handleSend(); } }}
            disabled={loading}
            className="text-sm"
          />
          {!showProtocol && (
            <Button size="sm" variant="outline" onClick={() => setShowProtocol(true)} disabled={loading}>
              📋
            </Button>
          )}
          <Button size="sm" onClick={showProtocol ? handleSendProtocol : handleSend} disabled={loading || !input.trim()}>
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { SessionEvent } from "@/lib/api";

export function DiscussionBubble({ event, participants }: { event: SessionEvent; participants: string[] }) {
  if (event.type === "discussion_started") {
    return (
      <div className="text-xs bg-secondary rounded-md px-3 py-2 text-center">
        <span className="font-medium">讨论开始</span>
        {event.topic && <span className="ml-2 text-muted-foreground">{event.topic}</span>}
        {event.participants && event.participants.length > 0 && (
          <span className="ml-2 text-muted-foreground">({event.participants.join(" vs ")})</span>
        )}
      </div>
    );
  }

  if (event.type === "discussion_completed") {
    return (
      <div className="text-xs bg-secondary rounded-md px-3 py-2 text-center">
        <span className="font-medium">讨论结束</span>
        {event.summary && <p className="mt-1 text-muted-foreground text-left whitespace-pre-wrap">{event.summary}</p>}
      </div>
    );
  }

  if (event.type === "discussion_text") {
    if (!event.content) return null;
    const isInitiator = event.role === "initiator";
    const agentLabel = event.agent || (isInitiator ? participants[0] : participants[1]) || "Agent";
    return (
      <div className={`flex flex-col ${isInitiator ? "items-start" : "items-end"}`}>
        <span className="text-[10px] text-muted-foreground mb-0.5 px-1">{agentLabel}{event.round ? ` · 第 ${event.round} 轮` : ""}</span>
        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${isInitiator ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
          {event.content}
        </div>
      </div>
    );
  }

  if (event.type === "discussion_turn_end") {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] text-muted-foreground">{event.agent}{event.round ? ` · R${event.round}` : ""}</span>
        <div className="flex-1 border-t border-border" />
      </div>
    );
  }

  return <EventBlock event={event} />;
}

export function EventBlock({ event }: { event: SessionEvent }) {
  if (event.type === "thinking") {
    return <ThinkingBlock content={event.content || ""} />;
  }

  if (event.type === "text") {
    return (
      <div className="text-xs bg-muted rounded-md px-3 py-1.5">
        {event.agent && <span className="text-[10px] text-muted-foreground mr-1">{event.agent}</span>}
        <span className="whitespace-pre-wrap">{event.content}</span>
      </div>
    );
  }

  if (event.type === "tool_call") {
    return (
      <div className="text-[11px] border rounded-md px-3 py-1.5">
        <span className="font-medium text-primary">调用: {event.name}</span>
        {event.agent && <span className="text-muted-foreground ml-1">{event.agent}</span>}
      </div>
    );
  }

  if (event.type === "tool_result") {
    return (
      <div className="text-[11px] border-l-2 border-green-500 pl-2 py-0.5">
        <span className="text-green-600 dark:text-green-400 font-medium">结果: {event.name}</span>
      </div>
    );
  }

  if (event.type === "user_input") {
    return (
      <div className="text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 ml-auto max-w-[80%]">{event.content}</div>
    );
  }

  if (event.type === "session_completed") {
    return <div className="text-[11px] bg-secondary rounded-md px-3 py-1.5 font-medium">Session 完成</div>;
  }

  if (event.type === "error") {
    return <div className="text-[11px] bg-destructive text-destructive-foreground rounded-md px-3 py-1.5">错误: {event.content}</div>;
  }

  return null;
}

export function ThinkingBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!content) return null;
  const MAX = 150;
  const isLong = content.length > MAX;
  const display = expanded ? content : content.slice(0, MAX);

  return (
    <div className="text-xs border border-dashed border-muted-foreground/30 bg-muted/30 rounded-md px-3 py-1.5">
      <div className="flex items-center gap-1 mb-0.5">
        <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-[10px] text-muted-foreground font-medium">思考</span>
      </div>
      <span className="whitespace-pre-wrap text-muted-foreground">{display}</span>
      {isLong && (
        <button
          className="text-[10px] text-primary hover:underline mt-1 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  );
}

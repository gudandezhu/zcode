"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Task, type Session, type SessionEvent,
  fetchSessions, streamSession, fetchSessionEvents, fetchSessionDetail,
} from "@/lib/api";
import { EventBlock, DiscussionBubble } from "./event-blocks";
import { ArtifactItem } from "./artifact-item";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function TimelineTab({ task }: { task: Task }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedSessionType, setSelectedSessionType] = useState<string>("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedSession(null);
    setEvents([]);
    setStreaming(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchSessions(task.id).then((data) => { if (active) setSessions(data); });
    return () => { active = false; };
  }, [task.id]);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const handleSessionClick = useCallback((sessionId: string, sessionStatus?: string, sessionType?: string, participants?: string[]) => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setSelectedSession(sessionId);
    setSelectedSessionType(sessionType || "");
    setSelectedParticipants(participants || []);
    setEvents([]);
    setStreaming(false);

    if (sessionStatus === "completed" || sessionStatus === "failed") {
      if (sessionType === "discussion") {
        fetchSessionDetail(sessionId)
          .then((data) => {
            const msgs = data.messages || [];
            const loaded: SessionEvent[] = msgs.map((m: { role: string; content: string; agent?: string }, i: number) => {
              const isInitiator = m.agent === participants?.[0];
              return { type: "discussion_text", content: m.content, agent: m.agent || data.agentName, role: isInitiator ? "initiator" : "participant", timestamp: Date.now() - (msgs.length - i) * 1000 };
            });
            setEvents(loaded);
          });
      } else {
        fetchSessionEvents(sessionId).then((history) => {
          const loaded = history.map((e) => ({
            type: e.type, content: e.content, agent: e.agent,
            name: e.name, arguments: e.arguments, question: e.question,
            round: e.round, role: e.role, participants: e.participants,
            topic: e.topic, summary: e.summary, timestamp: Date.now(),
          }));
          setEvents(loaded);
        });
      }
      return;
    }

    setStreaming(true);
    abortRef.current = streamSession(
      sessionId,
      (event: SessionEvent) => {
        const execEvent: SessionEvent = {
          type: event.type, content: event.content, agent: event.agent,
          name: event.name, arguments: event.arguments, question: event.question,
          round: event.round, role: event.role, participants: event.participants,
          topic: event.topic, summary: event.summary, timestamp: Date.now(),
        };
        setEvents((prev) => [...prev, execEvent]);
      },
      () => setStreaming(false),
    );
  }, []);

  useEffect(() => { return () => { if (abortRef.current) abortRef.current.abort(); }; }, []);

  const sessionArtifacts = sessions.flatMap((s) => s.artifacts || []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Session 列表</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {sessions.length === 0 && <p className="text-xs text-muted-foreground">暂无 Session</p>}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSessionClick(s.id, s.status, s.type, s.participants)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                selectedSession === s.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.type === "discussion" ? "讨论" : "执行"} - {s.agentName}</span>
                <Badge variant={s.status === "completed" ? "secondary" : s.status === "running" ? "default" : s.status === "failed" ? "destructive" : "outline"} className="text-[10px]">
                  {s.status}
                </Badge>
              </div>
              <span className="text-[10px] opacity-70">{new Date(s.createdAt).toLocaleString("zh-CN")}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">执行详情</p>
          {streaming && <span className="text-[10px] text-primary animate-pulse">实时更新中...</span>}
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {events.length === 0 && <p className="text-xs text-muted-foreground">点击 Session 查看详情</p>}
            {selectedSessionType === "discussion"
              ? events.map((evt, i) => <DiscussionBubble key={i} event={evt} participants={selectedParticipants} />)
              : events.map((evt, i) => <EventBlock key={i} event={evt} />)}
            <div ref={eventsEndRef} />
          </div>
        </ScrollArea>
      </div>

      {sessionArtifacts.length > 0 && (
        <div className="border-t p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            产出物 ({sessionArtifacts.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {sessionArtifacts.slice(0, 5).map((art, i) => (
              <ArtifactItem key={i} artifact={art} compact />
            ))}
            {sessionArtifacts.length > 5 && (
              <p className="text-[10px] text-muted-foreground px-1">还有 {sessionArtifacts.length - 5} 个</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

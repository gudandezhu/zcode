import crypto from "crypto";
import type { Artifact } from "@zcode/shared";

const SESSION_TTL = 3600_000; // 1 hour in ms
const MAX_ITERATIONS = 50;

export interface SessionEvent {
  type: string;
  content?: string;
  agent?: string;
  name?: string;
  arguments?: string;
  question?: string;
  status?: string;
}

export class LiveSession {
  id: string;
  sessionType: string;
  agentName: string;
  taskId: string;
  context: string;
  participants: string[];
  status: string;
  parentSessionId: string;
  maxRounds: number;
  currentRound: number;
  currentSpeaker: string;
  artifacts: Artifact[];
  createdAt: number;
  updatedAt: number;

  private _messages: Record<string, string>[] = [];
  private _events: SessionEvent[] = [];
  private _eventResolvers: ((event: SessionEvent | null) => void)[] = [];
  private _userInputResolver: ((input: string) => void) | null = null;

  constructor(opts: {
    agentName: string;
    taskId?: string;
    context?: string;
    sessionType?: string;
    participants?: string[];
    maxRounds?: number;
    parentSessionId?: string;
  }) {
    this.id = crypto.randomUUID().slice(0, 12);
    this.sessionType = opts.sessionType || "main";
    this.agentName = opts.agentName;
    this.taskId = opts.taskId || "";
    this.context = opts.context || "";
    this.participants = opts.participants || [];
    this.status = "running";
    this.parentSessionId = opts.parentSessionId || "";
    this.maxRounds = opts.maxRounds || MAX_ITERATIONS;
    this.currentRound = 0;
    this.currentSpeaker = "";
    this.artifacts = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  get messages(): Record<string, string>[] {
    return [...this._messages];
  }

  get events(): SessionEvent[] {
    return [...this._events];
  }

  addMessage(role: string, content: string, extra?: Record<string, unknown>): void {
    const msg: Record<string, string> = { role, content, ...extra as any };
    this._messages.push(msg);
    this.updatedAt = Date.now();
  }

  emit(event: SessionEvent): void {
    this._events.push(event);
    for (const resolve of this._eventResolvers) {
      resolve(event);
    }
    this._eventResolvers = [];
  }

  emitDone(): void {
    for (const resolve of this._eventResolvers) {
      resolve(null);
    }
    this._eventResolvers = [];
  }

  waitForEvent(): Promise<SessionEvent | null> {
    return new Promise((resolve) => {
      this._eventResolvers.push(resolve);
    });
  }

  waitForUserInput(): Promise<string> {
    return new Promise((resolve) => {
      this._userInputResolver = resolve;
    });
  }

  resolveUserInput(input: string): void {
    if (this._userInputResolver) {
      this._userInputResolver(input);
      this._userInputResolver = null;
    }
  }

  isExpired(): boolean {
    if (this.status === "running" || this.status === "waiting_user") return false;
    return Date.now() - this.updatedAt > SESSION_TTL;
  }
}

export class SessionManager {
  private sessions = new Map<string, LiveSession>();

  create(opts: {
    agentName: string;
    taskId?: string;
    context?: string;
    sessionType?: string;
    participants?: string[];
    maxRounds?: number;
    parentSessionId?: string;
  }): LiveSession {
    const session = new LiveSession(opts);
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): LiveSession | undefined {
    return this.sessions.get(id);
  }

  listByTask(taskId: string): LiveSession[] {
    return [...this.sessions.values()].filter((s) => s.taskId === taskId);
  }

  cleanup(): void {
    for (const [id, s] of this.sessions) {
      if (s.isExpired()) this.sessions.delete(id);
    }
  }
}

export const sessionManager = new SessionManager();

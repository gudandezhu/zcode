import type {
  Task, TaskCreate, TaskUpdate,
  Session, DiscussionCreate,
  Agent, StageInfo,
  Message as ChatMessage,
  Memory,
  DiscussionBoard, DiscussionMessage, BoardMessageCreate, ProtocolCreate,
  SessionSummary, Artifact,
} from "@zcode/shared";

export type {
  Task, TaskCreate, TaskUpdate,
  Session, DiscussionCreate,
  Agent, StageInfo,
  ChatMessage,
  Memory,
  DiscussionBoard, DiscussionMessage, BoardMessageCreate, ProtocolCreate,
  SessionSummary, Artifact,
};

export interface SSEEvent {
  type: string;
  content?: string;
  agent?: string;
  name?: string;
  arguments?: string;
  question?: string;
  status?: string;
  round?: number;
  role?: string;
  participants?: string[];
  topic?: string;
  summary?: string;
  taskId?: string;
  boardId?: string;
  event?: string;
  message?: Record<string, unknown>;
  reaction?: Record<string, unknown>;
  protocolType?: string;
  messageId?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method };
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, opts);
  return res.json();
}

// Tasks

export const fetchTasks = (stage?: string): Promise<Task[]> =>
  api("GET", stage ? `/api/tasks?stage=${stage}` : "/api/tasks");

export const createTask = (title: string, description: string, stage: string, parentTaskId?: string, dependsOn?: string[]): Promise<Task> => {
  const body: Record<string, unknown> = { title, description, stage };
  if (parentTaskId) body.parentTaskId = parentTaskId;
  if (dependsOn?.length) body.dependsOn = JSON.stringify(dependsOn);
  return api("POST", "/api/tasks", body);
};

export const updateTask = (id: string, data: Partial<TaskUpdate>): Promise<Task> =>
  api("PATCH", `/api/tasks/${id}`, data);

export const deleteTask = (id: string): Promise<void> =>
  api("DELETE", `/api/tasks/${id}`);

export const retryTask = (id: string): Promise<Task> =>
  api("POST", `/api/tasks/${id}/retry`);

export const approveTask = (id: string, artifacts?: string): Promise<Task> =>
  api("POST", `/api/tasks/${id}/approve`, artifacts ? { artifacts } : {});

export const rejectTask = (id: string, feedback: string): Promise<Task> =>
  api("POST", `/api/tasks/${id}/reject`, { feedback });

export const advanceTask = (id: string): Promise<Task> =>
  api("POST", `/api/tasks/${id}/advance`);

// Agents

export const fetchAgents = (): Promise<Agent[]> =>
  api("GET", "/api/agents");

export const reloadAgents = (): Promise<Agent[]> =>
  api("GET", "/api/agents/reload");

export const fetchStages = (): Promise<StageInfo[]> =>
  api("GET", "/api/agents/stages");

// Sessions

export const fetchSessions = async (taskId: string): Promise<Session[]> => {
  const data = await api<{ sessions: Session[] }>("GET", `/api/sessions?taskId=${taskId}`);
  return data.sessions || [];
};

export const createSession = (taskId: string, agentName: string): Promise<Session> =>
  api("POST", "/api/sessions", { taskId, agentName });

export const createDiscussion = (taskId: string, initiator: string, participant: string, topic: string, maxRounds: number): Promise<Session> =>
  api("POST", "/api/sessions/discuss", { taskId, initiator, participant, topic, maxRounds });

export const fetchSessionDetail = (sessionId: string): Promise<Session & { messages?: { role: string; content: string; agent?: string }[] }> =>
  api("GET", `/api/sessions/${sessionId}`);

export const fetchSessionEvents = async (sessionId: string): Promise<SSEEvent[]> => {
  const data = await api<{ events: SSEEvent[] }>("GET", `/api/sessions/${sessionId}/events`);
  return data.events || [];
};

export const sendUserInput = (sessionId: string, message: string): Promise<void> =>
  api("POST", `/api/sessions/${sessionId}/input`, { message });

// SSE streaming

function parseSSE(url: string, onEvent: (e: SSEEvent) => void, onDone: () => void, until?: (e: SSEEvent) => boolean): AbortController {
  const ctrl = new AbortController();
  fetch(url, { signal: ctrl.signal })
    .then(async (res) => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (until?.(parsed)) { onDone(); return; }
            onEvent(parsed);
          } catch { /* ignore */ }
        }
      }
      onDone();
    })
    .catch(() => onDone());
  return ctrl;
}

export const streamSession = (sessionId: string, onEvent: (e: SSEEvent) => void, onDone: () => void): AbortController =>
  parseSSE(`${API}/api/sessions/${sessionId}/stream`, onEvent, onDone, (e) => e.type === "done");

export const streamBoard = (boardId: string, onEvent: (e: SSEEvent) => void, onDone: () => void): AbortController =>
  parseSSE(`${API}/api/boards/${boardId}/stream`, onEvent, onDone);

// Boards

export const fetchBoard = (taskId: string): Promise<DiscussionBoard> =>
  api("GET", `/api/tasks/${taskId}/discussion`);

export const fetchBoardMessages = async (boardId: string, limit?: number, offset?: number): Promise<DiscussionMessage[]> => {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString() ? `?${params}` : "";
  const data = await api<{ messages: DiscussionMessage[] }>("GET", `/api/boards/${boardId}/messages${qs}`);
  return data.messages || [];
};

export const sendBoardMessage = (boardId: string, input: BoardMessageCreate): Promise<DiscussionMessage> =>
  api("POST", `/api/boards/${boardId}/messages`, input);

export const addBoardReaction = (boardId: string, messageId: string, reaction: { agentName: string; action: string; content?: string }): Promise<DiscussionMessage> =>
  api("PATCH", `/api/boards/${boardId}/messages/${messageId}`, reaction);

export const createBoardProtocol = (boardId: string, input: ProtocolCreate): Promise<DiscussionMessage> =>
  api("POST", `/api/boards/${boardId}/protocols`, input);

export const updateBoardProtocol = (boardId: string, messageId: string, status: string): Promise<DiscussionMessage> =>
  api("PATCH", `/api/boards/${boardId}/protocols/${messageId}`, { status });

// Memories

export const fetchMemories = (projectId: string): Promise<Memory[]> =>
  api("GET", `/api/projects/${projectId}/memories`);

export const createMemory = (projectId: string, fact: string): Promise<Memory> =>
  api("POST", `/api/projects/${projectId}/memories`, { fact });

export const deleteMemory = (id: string): Promise<void> =>
  api("DELETE", `/api/projects/memories/${id}`);

// History

export const fetchHistory = (conversationId: string): Promise<ChatMessage[]> =>
  api("GET", `/api/chat/history/${conversationId}`);

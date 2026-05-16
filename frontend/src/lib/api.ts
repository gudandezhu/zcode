const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Task {
  id: string;
  title: string;
  description: string;
  stage: string;
  status: string;
  artifacts: Record<string, unknown>[];
  agent_name: string;
  conversation_id: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  name: string;
  role: string;
  stage: string;
  model: string;
  description: string;
}

export interface ChatMessage {
  id?: number;
  conversation_id: string;
  role: string;
  content: string;
  created_at?: string;
}

export interface StageInfo {
  key: string;
  label: string;
  agent: string;
}

export interface Session {
  id: string;
  type: string;
  agent_name: string;
  task_id: string;
  participants: string[];
  status: string;
  parent_session_id: string;
  max_rounds: number;
  current_round: number;
  current_speaker: string;
  artifacts: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export interface SSEEvent {
  type: string;
  content?: string;
  agent?: string;
  name?: string;
  arguments?: string;
  question?: string;
  status?: string;
}

export async function fetchTasks(stage?: string): Promise<Task[]> {
  const url = stage ? `${API}/api/tasks?stage=${stage}` : `${API}/api/tasks`;
  const res = await fetch(url);
  return res.json();
}

export async function createTask(title: string, description: string, stage: string): Promise<Task> {
  const res = await fetch(`${API}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, stage }),
  });
  return res.json();
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API}/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`${API}/api/tasks/${id}`, { method: "DELETE" });
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API}/api/agents`);
  return res.json();
}

export async function reloadAgents(): Promise<Agent[]> {
  const res = await fetch(`${API}/api/agents/reload`);
  return res.json();
}

export async function fetchStages(): Promise<StageInfo[]> {
  const res = await fetch(`${API}/api/agents/stages`);
  return res.json();
}

export async function streamChat(
  agentName: string,
  message: string,
  conversationId: string,
  taskId: string,
  onChunk: (content: string) => void,
  onDone: (finalConversationId: string) => void,
  onError: (error: string) => void,
) {
  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_name: agentName,
      message,
      conversation_id: conversationId,
      task_id: taskId,
    }),
  });

  if (!res.ok) {
    onError(`HTTP ${res.status}`);
    return;
  }

  const finalConversationId = res.headers.get("X-Conversation-Id") || conversationId;
  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response body");
    return;
  }

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
      const data = line.slice(6);
      if (data === "[DONE]") {
        onDone(finalConversationId);
        return;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed.content) {
          onChunk(parsed.content);
        }
        if (parsed.error) {
          onError(parsed.error);
          return;
        }
      } catch {}
    }
  }
  onDone(finalConversationId);
}

export async function fetchHistory(conversationId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API}/api/chat/history/${conversationId}`);
  return res.json();
}

export async function fetchSessions(taskId: string): Promise<Session[]> {
  const res = await fetch(`${API}/api/sessions?task_id=${taskId}`);
  const data = await res.json();
  return data.sessions || [];
}

export function streamSession(
  sessionId: string,
  onEvent: (event: SSEEvent) => void,
  onDone: () => void,
): AbortController {
  const ctrl = new AbortController();
  fetch(`${API}/api/sessions/${sessionId}/stream`, { signal: ctrl.signal })
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
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "done") {
              onDone();
              return;
            }
            onEvent(parsed);
          } catch {}
        }
      }
      onDone();
    })
    .catch(() => onDone());
  return ctrl;
}

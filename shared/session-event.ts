export interface SessionEvent {
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
  timestamp?: number;
}

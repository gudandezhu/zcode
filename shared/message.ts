export interface Message {
  id: number;
  conversationId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
}

export interface ChatRequest {
  agentName: string;
  message: string;
  conversationId?: string;
  taskId?: string;
}

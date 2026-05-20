export type BoardStatus = "active" | "archived";
export type TriggerType = "mention" | "topic" | "protocol" | "pipeline";
export type ProtocolType = "review_request" | "consensus" | "escalation";
export type ProtocolStatus = "pending" | "passed" | "failed" | "expired";
export type ResponsePolicy = "must_respond" | "may_respond" | "must_follow_protocol";

export interface Reaction {
  agentName: string;
  action: "respond" | "acknowledge" | "approve" | "reject";
  content: string;
}

export interface DiscussionBoard {
  id: string;
  taskId: string;
  participants: string[];
  status: BoardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionMessage {
  id: string;
  boardId: string;
  speaker: string;
  content: string;
  triggerType: TriggerType;
  mentions: string[];
  topics: string[];
  protocolType: ProtocolType | null;
  protocolStatus: ProtocolStatus | null;
  responsePolicy: ResponsePolicy | null;
  reactions: Reaction[];
  parentId: string;
  createdAt: string;
}

export interface BoardMessageCreate {
  speaker: string;
  content: string;
  triggerType?: TriggerType;
  mentions?: string[];
  topics?: string[];
  protocolType?: ProtocolType;
  responsePolicy?: ResponsePolicy;
  parentId?: string;
}

export interface ProtocolCreate {
  speaker: string;
  content: string;
  protocolType: ProtocolType;
  mentions: string[];
}

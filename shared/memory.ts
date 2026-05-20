export interface Memory {
  id: string;
  projectId: string;
  fact: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryCreate {
  fact: string;
  projectId?: string;
}

export interface MemoryUpdate {
  fact?: string;
}

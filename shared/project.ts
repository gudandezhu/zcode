export interface Project {
  id: string;
  name: string;
  path: string;
  techStack: string[];
  conventions: string;
  gitInitialized: boolean;
  gitRemote: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreate {
  name: string;
  path?: string;
  gitRemote?: string;
}

export interface ProjectUpdate {
  name?: string;
  path?: string;
  techStack?: string;
  conventions?: string;
}

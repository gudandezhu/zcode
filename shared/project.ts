export interface Project {
  id: string;
  name: string;
  path: string;
  techStack: string[];
  conventions: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreate {
  name: string;
  path?: string;
}

export interface ProjectUpdate {
  name?: string;
  path?: string;
  techStack?: string;
  conventions?: string;
}

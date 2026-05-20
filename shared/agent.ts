export interface Agent {
  name: string;
  role: string;
  stage: string;
  model: string;
  description: string;
}

export interface AgentConfig {
  name: string;
  role: string;
  stage: string;
  model: string;
  systemPrompt: string;
}

export interface StageInfo {
  key: string;
  label: string;
  agent: string;
}

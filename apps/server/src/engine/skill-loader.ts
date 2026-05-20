import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface Skill {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string> | string;
}

export interface AgentConfig {
  name: string;
  role: string;
  stage: string;
  model: string;
  system_prompt: string;
  backend?: string;
  working_dir?: string;
  auto_advance?: boolean;
  [key: string]: unknown;
}

export class SkillLoader {
  private agentsDir: string;
  private agents = new Map<string, AgentConfig>();
  private skills = new Map<string, Map<string, Skill>>();

  constructor(agentsDir?: string) {
    this.agentsDir = agentsDir || process.env.AGENTS_DIR || path.resolve("agents");
    this.loadAll();
  }

  private loadAll(): void {
    if (!fs.existsSync(this.agentsDir)) return;
    for (const name of fs.readdirSync(this.agentsDir)) {
      const dir = path.join(this.agentsDir, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const yamlPath = path.join(dir, "agent.yaml");
      if (!fs.existsSync(yamlPath)) continue;

      const cfg = yaml.load(fs.readFileSync(yamlPath, "utf-8")) as AgentConfig;
      const promptPath = path.join(dir, "system_prompt.md");
      cfg.system_prompt = fs.existsSync(promptPath)
        ? fs.readFileSync(promptPath, "utf-8")
        : "";
      this.agents.set(name, cfg);

      // Skills loading (for future Python→TS skill migration, placeholder)
      this.skills.set(name, new Map());
    }
  }

  getAgentConfig(name: string): AgentConfig | undefined {
    return this.agents.get(name);
  }

  getSystemPrompt(name: string): string {
    return this.agents.get(name)?.system_prompt || "";
  }

  getModel(name: string): string {
    return this.agents.get(name)?.model || "claude-sonnet-4-20250514";
  }

  getAutoAdvance(name: string): boolean {
    const cfg = this.agents.get(name);
    if (!cfg) return false;
    if ("auto_advance" in cfg) return !!cfg.auto_advance;
    return !!cfg.stage;
  }

  getBackend(name: string): string {
    return this.agents.get(name)?.backend || "builtin";
  }

  getWorkingDir(name: string): string | undefined {
    return this.agents.get(name)?.working_dir;
  }

  getSkills(agentName: string): Skill[] {
    return [...(this.skills.get(agentName)?.values() || [])];
  }

  getSkill(agentName: string, skillName: string): Skill | undefined {
    return this.skills.get(agentName)?.get(skillName);
  }

  listAgents(): string[] {
    return [...this.agents.keys()];
  }

  getAgent(name: string): AgentConfig | undefined {
    return this.agents.get(name);
  }
}

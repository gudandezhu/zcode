import os
import importlib.util
import yaml
from typing import Any, Callable


class Skill:
    def __init__(self, name: str, description: str, parameters: dict, execute: Callable):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.execute = execute

    def to_tool_schema(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class SkillLoader:
    def __init__(self, agents_dir: str):
        self.agents_dir = agents_dir
        self._agents: dict[str, dict] = {}
        self._skills: dict[str, dict[str, Skill]] = {}
        self._load_all()

    def _load_all(self):
        if not os.path.isdir(self.agents_dir):
            return
        for name in os.listdir(self.agents_dir):
            agent_dir = os.path.join(self.agents_dir, name)
            if not os.path.isdir(agent_dir):
                continue
            agent_yaml = os.path.join(agent_dir, "agent.yaml")
            if not os.path.isfile(agent_yaml):
                continue
            with open(agent_yaml) as f:
                cfg = yaml.safe_load(f)
            prompt_file = os.path.join(agent_dir, "system_prompt.md")
            system_prompt = ""
            if os.path.isfile(prompt_file):
                with open(prompt_file) as f:
                    system_prompt = f.read()
            cfg["system_prompt"] = system_prompt
            cfg["dir"] = agent_dir
            self._agents[name] = cfg

            skills_dir = os.path.join(agent_dir, "skills")
            agent_skills = {}
            if os.path.isdir(skills_dir):
                for fname in sorted(os.listdir(skills_dir)):
                    if not fname.endswith(".py") or fname.startswith("_"):
                        continue
                    skill = self._load_skill(name, os.path.join(skills_dir, fname))
                    if skill:
                        agent_skills[skill.name] = skill
            self._skills[name] = agent_skills

    def _load_skill(self, agent_name: str, path: str) -> Skill | None:
        try:
            mod_name = f"skill_{agent_name}_{os.path.splitext(os.path.basename(path))[0]}"
            spec = importlib.util.spec_from_file_location(mod_name, path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return Skill(
                name=mod.name,
                description=mod.description,
                parameters=mod.parameters,
                execute=mod.execute,
            )
        except Exception as e:
            print(f"[skill_loader] Failed to load {path}: {e}")
            return None

    def list_agents(self) -> list[str]:
        return list(self._agents.keys())

    def get_agent_config(self, name: str) -> dict | None:
        return self._agents.get(name)

    def get_skills(self, agent_name: str) -> list[Skill]:
        return list(self._skills.get(agent_name, {}).values())

    def get_skill(self, agent_name: str, skill_name: str) -> Skill | None:
        return self._skills.get(agent_name, {}).get(skill_name)

    def get_system_prompt(self, agent_name: str) -> str:
        cfg = self._agents.get(agent_name, {})
        return cfg.get("system_prompt", "")

    def get_model(self, agent_name: str) -> str:
        cfg = self._agents.get(agent_name, {})
        return cfg.get("model", "gpt-4o")

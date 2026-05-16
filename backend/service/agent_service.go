package service

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
	"zcode/config"
	"zcode/model"
)

type agentYAML struct {
	Name      string `yaml:"name"`
	Role      string `yaml:"role"`
	Stage     string `yaml:"stage"`
	Model     string `yaml:"model"`
	MaxRounds int    `yaml:"max_rounds"`
}

var (
	agentsCache []model.AgentConfig
	agentsOnce  sync.Once
	agentsMu    sync.RWMutex
)

func GetAgents() []model.AgentResponse {
	configs := parseAgents()
	result := make([]model.AgentResponse, len(configs))
	for i, a := range configs {
		desc := a.Role
		if desc == "" {
			if len(a.SystemPrompt) > 100 {
				desc = a.SystemPrompt[:100] + "..."
			} else {
				desc = a.SystemPrompt
			}
		}
		result[i] = model.AgentResponse{
			Name:        a.Name,
			Role:        a.Role,
			Stage:       a.Stage,
			Model:       a.Model,
			Description: desc,
		}
	}
	return result
}

func GetAgent(name string) *model.AgentConfig {
	configs := parseAgents()
	for _, a := range configs {
		if a.Name == name {
			return &a
		}
	}
	return nil
}

func InvalidateAgentCache() {
	agentsMu.Lock()
	defer agentsMu.Unlock()
	agentsCache = nil
	agentsOnce = sync.Once{}
}

func ReloadAgents() []model.AgentResponse {
	InvalidateAgentCache()
	return GetAgents()
}

type StageInfo struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Agent string `json:"agent"`
}

func GetStages() []StageInfo {
	configs := parseAgents()
	stageMap := map[string]string{}
	for _, a := range configs {
		if a.Stage != "" {
			stageMap[a.Stage] = a.Role
		}
	}
	order := []string{"requirement", "design", "development", "testing"}
	var result []StageInfo
	for _, key := range order {
		if role, ok := stageMap[key]; ok {
			result = append(result, StageInfo{Key: key, Label: role, Agent: key})
		}
	}
	return result
}

func parseAgents() []model.AgentConfig {
	agentsOnce.Do(func() {
		agentsDir := config.AgentsDir
		entries, err := os.ReadDir(agentsDir)
		if err != nil {
			fmt.Printf("[agent_service] cannot read agents dir %s: %v\n", agentsDir, err)
			agentsCache = []model.AgentConfig{}
			return
		}
		var agents []model.AgentConfig
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			yamlPath := filepath.Join(agentsDir, entry.Name(), "agent.yaml")
			data, err := os.ReadFile(yamlPath)
			if err != nil {
				continue
			}
			var cfg agentYAML
			if yaml.Unmarshal(data, &cfg) != nil {
				continue
			}
			promptPath := filepath.Join(agentsDir, entry.Name(), "system_prompt.md")
			promptData, _ := os.ReadFile(promptPath)
			agents = append(agents, model.AgentConfig{
				Name:         cfg.Name,
				Role:         cfg.Role,
				Stage:        cfg.Stage,
				Model:        cfg.Model,
				SystemPrompt: string(promptData),
			})
		}
		agentsCache = agents
	})
	return agentsCache
}

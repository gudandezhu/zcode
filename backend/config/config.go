package config

import "os"

var (
	DatabasePath    = envOrDefault("DATABASE_PATH", "./zcode.db")
	OpenAIKey       = os.Getenv("OPENAI_API_KEY")
	AnthropicKey    = os.Getenv("ANTHROPIC_API_KEY")
	DefaultModel    = envOrDefault("DEFAULT_MODEL", "gpt-4o")
	AgentConfigPath = envOrDefault("AGENT_CONFIG_PATH", "./agents/CLAUDE.md")
	AgentEngineURL  = envOrDefault("AGENT_ENGINE_URL", "http://localhost:8001")
	Port            = envOrDefault("PORT", "8000")
	AgentsDir       = envOrDefault("AGENTS_DIR", "../agents")
)

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

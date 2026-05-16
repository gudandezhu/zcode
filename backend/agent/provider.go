package agent

import (
	"sync"

	"zcode/model"
)

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Chunk struct {
	Content string
	Error   string
}

type Provider interface {
	Stream(messages []ChatMessage) <-chan string
}

var (
	mu        sync.RWMutex
	providers = map[string]Provider{}
)

func RegisterProvider(prefix string, p Provider) {
	mu.Lock()
	defer mu.Unlock()
	providers[prefix] = p
}

func GetProvider(model string) Provider {
	mu.RLock()
	defer mu.RUnlock()
	for prefix, p := range providers {
		if len(model) >= len(prefix) && model[:len(prefix)] == prefix {
			return p
		}
	}
	return providers[""]
}

func StreamChat(agentCfg *model.AgentConfig, history []ChatMessage, userMsg string) (<-chan string, error) {
	messages := []ChatMessage{}
	if agentCfg.SystemPrompt != "" {
		messages = append(messages, ChatMessage{Role: "system", Content: agentCfg.SystemPrompt})
	}
	messages = append(messages, history...)
	messages = append(messages, ChatMessage{Role: "user", Content: userMsg})

	p := GetProvider(agentCfg.Model)
	if p == nil {
		ch := make(chan string, 1)
		ch <- `{"error":"no provider for model: ` + agentCfg.Model + `"}`
		close(ch)
		return ch, nil
	}

	return p.Stream(messages), nil
}

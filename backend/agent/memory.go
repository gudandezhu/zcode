package agent

import (
	"sync"
)

var (
	memMu        sync.Mutex
	conversations = map[string][]ChatMessage{}
)

func GetConversationHistory(conversationID string) []ChatMessage {
	memMu.Lock()
	defer memMu.Unlock()
	return conversations[conversationID]
}

func SaveToMemory(conversationID string, role, content string) {
	memMu.Lock()
	defer memMu.Unlock()
	conversations[conversationID] = append(conversations[conversationID], ChatMessage{Role: role, Content: content})
}

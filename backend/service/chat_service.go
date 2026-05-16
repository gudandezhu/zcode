package service

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"time"

	"zcode/agent"
	"zcode/db"
)

func genConversationID() string {
	b := make([]byte, 6)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func EnsureConversation(conversationID, agentName, taskID string) string {
	if conversationID == "" {
		conversationID = genConversationID()
	}
	d := db.Get()
	now := time.Now().UTC().Format(time.RFC3339)
	d.Exec("INSERT OR IGNORE INTO conversations (id, agent_name, task_id, created_at) VALUES (?,?,?,?)",
		conversationID, agentName, taskID, now)
	if taskID != "" {
		d.Exec("UPDATE tasks SET conversation_id=?, agent_name=? WHERE id=? AND (conversation_id='' OR conversation_id IS NULL)",
			conversationID, agentName, taskID)
	}
	return conversationID
}

func GetHistory(conversationID string) ([]agent.ChatMessage, error) {
	d := db.Get()
	rows, err := d.Query("SELECT role, content FROM messages WHERE conversation_id=? ORDER BY id ASC", conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var msgs []agent.ChatMessage
	for rows.Next() {
		var m agent.ChatMessage
		rows.Scan(&m.Role, &m.Content)
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func SaveMessage(conversationID, role, content string) error {
	d := db.Get()
	_, err := d.Exec("INSERT INTO messages (conversation_id, role, content) VALUES (?,?,?)",
		conversationID, role, content)
	if err != nil {
		return err
	}
	agent.SaveToMemory(conversationID, role, content)
	return nil
}

func StreamChatResponse(conversationID, agentName, message string) (<-chan string, error) {
	cfg := GetAgent(agentName)
	if cfg == nil {
		ch := make(chan string, 1)
		ch <- `{"error":"Agent not found"}`
		close(ch)
		return ch, nil
	}
	if err := SaveMessage(conversationID, "user", message); err != nil {
		return nil, err
	}
	history := agent.GetConversationHistory(conversationID)
	ch, err := agent.StreamChat(cfg, history, message)
	if err != nil {
		return nil, err
	}
	out := make(chan string, 64)
	go func() {
		defer close(out)
		var full string
		for data := range ch {
			out <- data
			var parsed struct {
				Content string `json:"content"`
			}
			if json.Unmarshal([]byte(data), &parsed) == nil {
				full += parsed.Content
			}
		}
		SaveMessage(conversationID, "assistant", full)
	}()
	return out, nil
}

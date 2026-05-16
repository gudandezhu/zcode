package service

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"zcode/config"
	"zcode/model"
)

const sseChannelBuf = 64

type AgentBridge struct {
	engineURL string
	client    *http.Client
}

var bridge = &AgentBridge{
	engineURL: config.AgentEngineURL,
	client:    &http.Client{},
}

func GetAgentBridge() *AgentBridge {
	return bridge
}

func (b *AgentBridge) CreateSession(agentName, taskID, context string) (map[string]interface{}, error) {
	return b.post("/session/create", map[string]interface{}{
		"agent_name": agentName,
		"task_id":    taskID,
		"context":    context,
	})
}

func (b *AgentBridge) CreateDiscussion(req model.DiscussionCreateRequest) (map[string]interface{}, error) {
	return b.post("/session/discuss", map[string]interface{}{
		"initiator":         req.Initiator,
		"participant":       req.Participant,
		"task_id":           req.TaskID,
		"topic":             req.Topic,
		"max_rounds":        req.MaxRounds,
		"parent_session_id": req.ParentSessionID,
	})
}

func (b *AgentBridge) StreamSession(sessionID string) (<-chan map[string]interface{}, error) {
	resp, err := b.client.Get(b.engineURL + "/session/" + sessionID + "/stream")
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		resp.Body.Close()
		return nil, fmt.Errorf("engine returned %d", resp.StatusCode)
	}
	ch := make(chan map[string]interface{}, sseChannelBuf)
	go func() {
		defer close(ch)
		defer resp.Body.Close()
		reader := bufio.NewReader(resp.Body)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				if err != io.EOF {
					ch <- map[string]interface{}{"type": "error", "content": err.Error()}
				}
				return
			}
			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			var event map[string]interface{}
			if json.Unmarshal([]byte(data), &event) != nil {
				continue
			}
			ch <- event
			if t, ok := event["type"].(string); ok && t == "done" {
				return
			}
		}
	}()
	return ch, nil
}

func (b *AgentBridge) SendUserInput(sessionID, message string) error {
	_, err := b.post("/session/"+sessionID+"/input", map[string]interface{}{"message": message})
	return err
}

func (b *AgentBridge) GetSession(sessionID string) (map[string]interface{}, error) {
	return b.get("/session/" + sessionID)
}

func (b *AgentBridge) post(path string, body map[string]interface{}) (map[string]interface{}, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}
	resp, err := b.client.Post(b.engineURL+path, "application/json", strings.NewReader(string(data)))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return b.decodeResponse(resp)
}

func (b *AgentBridge) get(path string) (map[string]interface{}, error) {
	resp, err := b.client.Get(b.engineURL + path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return b.decodeResponse(resp)
}

func (b *AgentBridge) decodeResponse(resp *http.Response) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if resp.StatusCode >= 400 {
		if msg, ok := result["error"].(string); ok {
			return nil, fmt.Errorf("engine error: %s", msg)
		}
		return nil, fmt.Errorf("engine returned %d", resp.StatusCode)
	}
	return result, nil
}

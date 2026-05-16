package agent

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"zcode/config"
)

func init() {
	RegisterProvider("claude", &AnthropicProvider{})
	RegisterProvider("anthropic", &AnthropicProvider{})
}

type AnthropicProvider struct{}

func (p *AnthropicProvider) Stream(messages []ChatMessage) <-chan string {
	ch := make(chan string, 64)
	go func() {
		defer close(ch)
		var anthropicMsgs []ChatMessage
		var systemPrompt string
		for _, m := range messages {
			if m.Role == "system" {
				systemPrompt = m.Content
			} else {
				anthropicMsgs = append(anthropicMsgs, m)
			}
		}

		bodyMap := map[string]interface{}{
			"model":      "claude-sonnet-4-20250514",
			"max_tokens": 4096,
			"messages":   anthropicMsgs,
			"stream":     true,
		}
		if systemPrompt != "" {
			bodyMap["system"] = systemPrompt
		}
		body, _ := json.Marshal(bodyMap)
		req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
		if err != nil {
			ch <- fmt.Sprintf(`{"error":"%s"}`, err.Error())
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-api-key", config.AnthropicKey)
		req.Header.Set("anthropic-version", "2023-06-01")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			ch <- fmt.Sprintf(`{"error":"%s"}`, err.Error())
			return
		}
		defer resp.Body.Close()

		reader := bufio.NewReader(resp.Body)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				if err == io.EOF {
					break
				}
				ch <- fmt.Sprintf(`{"error":"%s"}`, err.Error())
				return
			}
			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			var chunk struct {
				Type  string `json:"type"`
				Delta struct {
					Text string `json:"text"`
				} `json:"delta"`
			}
			if json.Unmarshal([]byte(data), &chunk) != nil {
				continue
			}
			if chunk.Type == "content_block_delta" && chunk.Delta.Text != "" {
				b, _ := json.Marshal(map[string]string{"content": chunk.Delta.Text})
				ch <- string(b)
			}
		}
	}()
	return ch
}

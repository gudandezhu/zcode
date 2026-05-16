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
	RegisterProvider("", &OpenAIProvider{})
	RegisterProvider("gpt", &OpenAIProvider{})
}

type OpenAIProvider struct{}

func (p *OpenAIProvider) Stream(messages []ChatMessage) <-chan string {
	ch := make(chan string, 64)
	go func() {
		defer close(ch)
		body, _ := json.Marshal(map[string]interface{}{
			"model":    "gpt-4o",
			"messages": messages,
			"stream":   true,
		})
		req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
		if err != nil {
			ch <- fmt.Sprintf(`{"error":"%s"}`, err.Error())
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+config.OpenAIKey)

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
			if data == "[DONE]" {
				break
			}
			var chunk struct {
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
			}
			if json.Unmarshal([]byte(data), &chunk) != nil {
				continue
			}
			if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
				b, _ := json.Marshal(map[string]string{"content": chunk.Choices[0].Delta.Content})
				ch <- string(b)
			}
		}
	}()
	return ch
}

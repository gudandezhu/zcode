package handler

import (
	"fmt"
	"io"

	"zcode/agent"
	"zcode/model"
	"zcode/service"

	"github.com/gin-gonic/gin"
)

func Chat(c *gin.Context) {
	var req model.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	conversationID := service.EnsureConversation(req.ConversationID, req.AgentName, req.TaskID)

	ch, err := service.StreamChatResponse(conversationID, req.AgentName, req.Message)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Conversation-Id", conversationID)
	c.Stream(func(w io.Writer) bool {
		data, ok := <-ch
		if !ok {
			fmt.Fprintf(w, "data: [DONE]\n\n")
			return false
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
		return true
	})
}

func GetHistory(c *gin.Context) {
	msgs, err := service.GetHistory(c.Param("conversationId"))
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	if msgs == nil {
		msgs = []agent.ChatMessage{}
	}
	c.JSON(200, msgs)
}

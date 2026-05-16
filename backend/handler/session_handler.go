package handler

import (
	"io"

	"github.com/gin-gonic/gin"
	"zcode/model"
	"zcode/service"
)

func SessionCallback(c *gin.Context) {
	var req model.SessionCallbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	// save session to SQLite
	s := model.Session{
		ID:        req.SessionID,
		AgentName: req.AgentName,
		TaskID:    req.TaskID,
		Status:    req.Status,
		Artifacts: req.Artifacts,
		Type:      "main",
	}
	if _, err := service.CreateSession(s); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	// if advance requested, trigger stage advance
	if req.Advance && req.TaskID != "" {
		service.AdvanceTask(req.TaskID)
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func CreateSession(c *gin.Context) {
	var req model.SessionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	result, err := service.GetAgentBridge().CreateSession(req.AgentName, req.TaskID, req.Context)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, result)
}

func StreamSession(c *gin.Context) {
	sessionID := c.Param("id")
	ch, err := service.GetAgentBridge().StreamSession(sessionID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.Stream(func(w io.Writer) bool {
		event, ok := <-ch
		if !ok {
			return false
		}
		c.SSEvent("message", event)
		return true
	})
}

func SendUserInput(c *gin.Context) {
	sessionID := c.Param("id")
	var req model.UserInputRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	err := service.GetAgentBridge().SendUserInput(sessionID, req.Message)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func CreateDiscussion(c *gin.Context) {
	var req model.DiscussionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.MaxRounds == 0 {
		req.MaxRounds = 50
	}
	result, err := service.GetAgentBridge().CreateDiscussion(req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, result)
}

func GetSession(c *gin.Context) {
	sessionID := c.Param("id")
	result, err := service.GetAgentBridge().GetSession(sessionID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, result)
}

func ListSessions(c *gin.Context) {
	taskID := c.Query("task_id")
	if taskID == "" {
		c.JSON(400, gin.H{"error": "task_id required"})
		return
	}
	sessions, err := service.ListSessionsByTask(taskID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"sessions": sessions})
}

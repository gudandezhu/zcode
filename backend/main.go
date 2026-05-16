package main

import (
	"zcode/config"
	"zcode/db"
	"zcode/handler"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	{
		tasks := api.Group("/tasks")
		{
			tasks.POST("", handler.CreateTask)
			tasks.GET("", handler.ListTasks)
			tasks.GET("/:id", handler.GetTask)
			tasks.PATCH("/:id", handler.UpdateTask)
			tasks.POST("/:id/advance", handler.AdvanceTask)
			tasks.DELETE("/:id", handler.DeleteTask)
		}

		api.POST("/chat", handler.Chat)
		api.GET("/chat/history/:conversationId", handler.GetHistory)

		agents := api.Group("/agents")
		{
			agents.GET("", handler.ListAgents)
			agents.GET("/reload", handler.ReloadAgents)
			agents.GET("/stages", handler.ListStages)
		}

		sessions := api.Group("/sessions")
		{
			sessions.POST("", handler.CreateSession)
			sessions.GET("", handler.ListSessions)
			sessions.GET("/:id", handler.GetSession)
			sessions.GET("/:id/stream", handler.StreamSession)
			sessions.POST("/:id/input", handler.SendUserInput)
			sessions.POST("/discuss", handler.CreateDiscussion)
			sessions.POST("/callback", handler.SessionCallback)
		}
	}

	// ensure DB init
	db.Get()
	defer db.Close()

	r.Run(":" + config.Port)
}

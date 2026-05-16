package handler

import (
	"net/http"

	"zcode/service"

	"github.com/gin-gonic/gin"
)

func ListAgents(c *gin.Context) {
	c.JSON(http.StatusOK, service.GetAgents())
}

func ReloadAgents(c *gin.Context) {
	c.JSON(http.StatusOK, service.ReloadAgents())
}

func ListStages(c *gin.Context) {
	c.JSON(http.StatusOK, service.GetStages())
}

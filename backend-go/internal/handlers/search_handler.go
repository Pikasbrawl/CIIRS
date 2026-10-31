package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type SearchHandler struct {
	svc *services.SearchService
}

func NewSearchHandler(svc *services.SearchService) *SearchHandler {
	return &SearchHandler{svc: svc}
}

// Search processes semantic text queries and image reference visual queries
func (h *SearchHandler) Search(c *gin.Context) {
	var req models.SemanticSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := h.svc.SemanticSearch(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"count":   len(results),
		"query":   req.Query,
	})
}

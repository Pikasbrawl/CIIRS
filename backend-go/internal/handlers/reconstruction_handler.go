package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type ReconstructionHandler struct {
	svc *services.ReconstructionService
}

func NewReconstructionHandler(svc *services.ReconstructionService) *ReconstructionHandler {
	return &ReconstructionHandler{svc: svc}
}

// Reconstruct handles initiating the 30-minute multi-camera timeline reconstruction
func (h *ReconstructionHandler) Reconstruct(c *gin.Context) {
	var req models.CreateIncidentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reconstruction parameters: " + err.Error()})
		return
	}

	if len(req.CameraIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one camera must be selected for investigation"})
		return
	}

	result, err := h.svc.ReconstructIncident(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reconstruction": result})
}

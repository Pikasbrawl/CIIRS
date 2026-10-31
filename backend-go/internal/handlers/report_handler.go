package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type ReportHandler struct {
	svc *services.ReportService
}

func NewReportHandler(svc *services.ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

// Generate creates an evidence-backed report for an incident
func (h *ReportHandler) Generate(c *gin.Context) {
	param := c.Param("id")
	if param == "" {
		param = c.Param("incidentId")
	}
	incidentID, err := uuid.Parse(param)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	report, err := h.svc.GenerateIncidentReport(incidentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"report": report})
}

// Get retrieves report by report ID
func (h *ReportHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid report ID"})
		return
	}

	report, err := h.svc.GetReportByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if report == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "report not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}

// GetByIncident retrieves report by incident ID
func (h *ReportHandler) GetByIncident(c *gin.Context) {
	param := c.Param("id")
	if param == "" {
		param = c.Param("incidentId")
	}
	incidentID, err := uuid.Parse(param)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	report, err := h.svc.GetReportByIncidentID(incidentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if report == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no report generated yet for this incident"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}

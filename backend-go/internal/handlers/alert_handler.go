package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type AlertHandler struct {
	alertSvc *services.AlertService
}

func NewAlertHandler(s *services.AlertService) *AlertHandler {
	return &AlertHandler{alertSvc: s}
}

func (h *AlertHandler) List(c *gin.Context) {
	severity := c.Query("severity")
	status := c.Query("review_status")
	alertType := c.Query("type")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	alerts, err := h.alertSvc.ListAlerts(severity, status, alertType, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed fetching alerts: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, alerts)
}

func (h *AlertHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID format"})
		return
	}

	alert, err := h.alertSvc.GetAlert(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert not found: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, alert)
}

func (h *AlertHandler) Review(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID format"})
		return
	}

	var req models.ReviewAlertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid review payload: " + err.Error()})
		return
	}

	alert, err := h.alertSvc.ReviewAlert(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed reviewing alert: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, alert)
}

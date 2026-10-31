package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type MapHandler struct {
	mapSvc *services.MapService
}

func NewMapHandler(s *services.MapService) *MapHandler {
	return &MapHandler{mapSvc: s}
}

func (h *MapHandler) GetCameras(c *gin.Context) {
	cameras, err := h.mapSvc.GetMapCameras()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed fetching map cameras: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, cameras)
}

func (h *MapHandler) GetStats(c *gin.Context) {
	stats, err := h.mapSvc.GetCityStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed calculating GIS stats: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *MapHandler) GetZones(c *gin.Context) {
	zones, err := h.mapSvc.GetZones()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed fetching city zones: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, zones)
}

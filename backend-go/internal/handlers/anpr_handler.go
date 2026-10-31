package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type ANPRHandler struct {
	anprSvc *services.ANPRService
}

func NewANPRHandler(s *services.ANPRService) *ANPRHandler {
	return &ANPRHandler{anprSvc: s}
}

func (h *ANPRHandler) List(c *gin.Context) {
	cameraId := c.Query("camera_id")
	plate := c.Query("plate")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	detections, err := h.anprSvc.ListDetections(cameraId, plate, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed fetching plate detections: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, detections)
}

func (h *ANPRHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plate detection ID"})
		return
	}

	det, err := h.anprSvc.GetDetection(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plate detection not found: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, det)
}

func (h *ANPRHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		query = c.Query("plate")
	}

	results, err := h.anprSvc.SearchPlates(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed searching plate records: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"query":   query,
		"total":   len(results),
		"results": results,
	})
}

func (h *ANPRHandler) GetCameras(c *gin.Context) {
	var cameras []models.Camera
	database.DB.Where("status = 'active'").Order("name asc").Find(&cameras)
	c.JSON(http.StatusOK, cameras)
}

func (h *ANPRHandler) Override(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plate detection ID"})
		return
	}

	var req models.ANPROverrideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid override payload: " + err.Error()})
		return
	}

	det, err := h.anprSvc.OverridePlate(id, req.CorrectedPlate, req.CorrectedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed applying plate override: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, det)
}

func (h *ANPRHandler) LookupVehicle(c *gin.Context) {
	var payload models.VehicleLookupPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plate number is required"})
		return
	}

	intel, err := h.anprSvc.GetVehicleIntelligence(payload.PlateNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed querying vehicle intelligence: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, intel)
}

func (h *ANPRHandler) GetHistory(c *gin.Context) {
	plate := c.Param("plate")
	intel, err := h.anprSvc.GetVehicleIntelligence(plate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed querying vehicle history: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, intel)
}

func (h *ANPRHandler) GetChallans(c *gin.Context) {
	plate := c.Param("plate")
	intel, err := h.anprSvc.GetVehicleIntelligence(plate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed querying vehicle challans: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, intel.ChallanStatus)
}

func (h *ANPRHandler) GetStolenStatus(c *gin.Context) {
	plate := c.Param("plate")
	intel, err := h.anprSvc.GetVehicleIntelligence(plate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed querying stolen status: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, intel.StolenStatus)
}

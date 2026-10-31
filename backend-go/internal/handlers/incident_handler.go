package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
)

type IncidentHandler struct{}

func NewIncidentHandler() *IncidentHandler {
	return &IncidentHandler{}
}

func (h *IncidentHandler) List(c *gin.Context) {
	var incidents []models.Incident
	err := database.DB.Order("created_at DESC").Find(&incidents).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"incidents": incidents})
}

func (h *IncidentHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	var incident models.Incident
	err = database.DB.
		Preload("CandidateMatches").
		Preload("CandidateMatches.SourceCamera").
		Preload("CandidateMatches.TargetCamera").
		Preload("Reports").
		First(&incident, "id = ?", id).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "incident not found"})
		return
	}

	// Fetch linked events
	var events []models.Event
	database.DB.
		Preload("Camera").
		Preload("Video").
		Joins("JOIN incident_event_links ON incident_event_links.event_id = events.id").
		Where("incident_event_links.incident_id = ?", id).
		Order("events.absolute_time ASC").
		Find(&events)

	// Fetch cameras
	var camIDs []uuid.UUID
	_ = json.Unmarshal([]byte(incident.CameraIDs), &camIDs)
	var cameras []models.Camera
	if len(camIDs) > 0 {
		database.DB.Where("id IN ?", camIDs).Find(&cameras)
	}

	c.JSON(http.StatusOK, gin.H{
		"incident": incident,
		"events":   events,
		"cameras":  cameras,
	})
}

// GetTimeline returns synchronized multi-track investigation timeline data
func (h *IncidentHandler) GetTimeline(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	var incident models.Incident
	if err := database.DB.First(&incident, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "incident not found"})
		return
	}

	// Fetch linked events
	var events []models.Event
	database.DB.
		Preload("Camera").
		Preload("Video").
		Joins("JOIN incident_event_links ON incident_event_links.event_id = events.id").
		Where("incident_event_links.incident_id = ?", id).
		Order("events.absolute_time ASC").
		Find(&events)

	// Fetch cameras
	var camIDs []uuid.UUID
	_ = json.Unmarshal([]byte(incident.CameraIDs), &camIDs)
	var cameras []models.Camera
	if len(camIDs) > 0 {
		database.DB.Where("id IN ?", camIDs).Find(&cameras)
	}

	// Fetch candidate matches
	var matches []models.CandidateMatch
	database.DB.
		Preload("SourceCamera").
		Preload("TargetCamera").
		Where("incident_id = ?", id).
		Find(&matches)

	// Fetch ANPR detections within the time window
	var plates []models.NumberPlateDetection
	database.DB.
		Preload("Camera").
		Preload("Video").
		Where("absolute_time BETWEEN ? AND ?", incident.TimeWindowStart, incident.TimeWindowEnd).
		Order("absolute_time ASC").
		Find(&plates)

	// Fetch Alerts within the time window
	var alerts []models.Alert
	database.DB.
		Preload("Camera").
		Where("timestamp BETWEEN ? AND ?", incident.TimeWindowStart, incident.TimeWindowEnd).
		Order("timestamp ASC").
		Find(&alerts)

	// Build synchronized timeline payload
	c.JSON(http.StatusOK, gin.H{
		"incident_id":        incident.ID,
		"title":              incident.Title,
		"time_window_start":  incident.TimeWindowStart,
		"time_window_end":    incident.TimeWindowEnd,
		"incident_timestamp": incident.IncidentTimestamp,
		"cameras":            cameras,
		"events":             events,
		"anpr_detections":    plates,
		"alerts":             alerts,
		"candidate_matches":  matches,
	})
}

// GetEvidence returns evidence snapshots and clips
func (h *IncidentHandler) GetEvidence(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	var evidenceList []models.Evidence
	database.DB.
		Preload("Camera").
		Preload("Video").
		Where("incident_id = ?", id).
		Find(&evidenceList)

	c.JSON(http.StatusOK, gin.H{
		"incident_id": id,
		"evidence":    evidenceList,
	})
}

// UpdateEventStatus updates review status (candidate -> under_review -> confirmed / rejected)
func (h *IncidentHandler) UpdateEventStatus(c *gin.Context) {
	param := c.Param("id")
	if param == "" {
		param = c.Param("eventId")
	}
	eventID, err := uuid.Parse(param)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event ID"})
		return
	}

	var req struct {
		ReviewStatus string `json:"review_status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var event models.Event
	if err := database.DB.First(&event, "id = ?", eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	event.ReviewStatus = req.ReviewStatus
	database.DB.Save(&event)

	c.JSON(http.StatusOK, gin.H{"message": "Event review status updated", "event": event})
}

// UpdateCandidateMatchStatus updates cross-camera match status (candidate -> confirmed / rejected)
func (h *IncidentHandler) UpdateCandidateMatchStatus(c *gin.Context) {
	param := c.Param("id")
	if param == "" {
		param = c.Param("matchId")
	}
	matchID, err := uuid.Parse(param)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid match ID"})
		return
	}

	var req struct {
		MatchStatus string `json:"match_status" binding:"required"`
		Notes       string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var match models.CandidateMatch
	if err := database.DB.First(&match, "id = ?", matchID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate match not found"})
		return
	}

	match.MatchStatus = req.MatchStatus
	if req.Notes != "" {
		match.Notes = req.Notes
	}
	database.DB.Save(&match)

	c.JSON(http.StatusOK, gin.H{"message": "Candidate match status updated", "match": match})
}

// UpdateStatus updates incident investigation status
func (h *IncidentHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var inc models.Incident
	if err := database.DB.First(&inc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "incident not found"})
		return
	}

	inc.Status = body.Status
	inc.UpdatedAt = time.Now()
	database.DB.Save(&inc)

	c.JSON(http.StatusOK, gin.H{"message": "incident status updated", "incident": inc})
}

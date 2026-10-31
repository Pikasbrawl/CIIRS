package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

// GetStats returns live aggregated statistics calculated purely from PostgreSQL records
func (h *DashboardHandler) GetStats(c *gin.Context) {
	var stats models.DashboardStats

	// Camera counts
	database.DB.Model(&models.Camera{}).Count(&stats.TotalCameras)
	database.DB.Model(&models.Camera{}).Where("status = ?", "active").Count(&stats.ActiveCameras)

	// Video counts
	database.DB.Model(&models.Video{}).Count(&stats.TotalVideos)
	database.DB.Model(&models.Video{}).Where("status = ?", "completed").Count(&stats.ProcessedVideos)

	// Event counts
	database.DB.Model(&models.Event{}).Count(&stats.TotalEvents)

	// Incidents count
	database.DB.Model(&models.Incident{}).Where("status = ?", "investigating").Count(&stats.ActiveIncidents)

	// Processing jobs
	database.DB.Model(&models.ProcessingJob{}).Where("status IN ('queued', 'processing')").Count(&stats.ProcessingJobs)

	// Recent events
	var recentEvents []models.Event
	database.DB.
		Preload("Camera").
		Preload("Video").
		Order("absolute_time DESC").
		Limit(10).
		Find(&recentEvents)
	stats.RecentEvents = recentEvents

	// Event type distribution
	var dist []models.EventCountType
	database.DB.
		Model(&models.Event{}).
		Select("event_type, count(*) as count").
		Group("event_type").
		Order("count DESC").
		Scan(&dist)
	stats.EventsDistribution = dist

	// Camera activity summary
	var cameras []models.Camera
	database.DB.Find(&cameras)

	var activity []models.CameraActivity
	for _, cam := range cameras {
		var evCount int64
		var vidCount int64
		database.DB.Model(&models.Event{}).Where("camera_id = ?", cam.ID).Count(&evCount)
		database.DB.Model(&models.Video{}).Where("camera_id = ?", cam.ID).Count(&vidCount)

		activity = append(activity, models.CameraActivity{
			CameraID:   cam.ID,
			CameraName: cam.Name,
			Zone:       cam.Zone,
			EventCount: evCount,
			VideoCount: vidCount,
		})
	}
	stats.CameraActivity = activity

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

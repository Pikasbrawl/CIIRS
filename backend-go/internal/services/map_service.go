package services

import (
	"time"

	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
)

type MapService struct{}

func NewMapService() *MapService {
	return &MapService{}
}

type MapCameraDTO struct {
	ID                string     `json:"id"`
	Name              string     `json:"name"`
	Location          string     `json:"location"`
	Zone              string     `json:"zone"`
	Sector            string     `json:"sector"`
	Latitude          float64    `json:"latitude"`
	Longitude         float64    `json:"longitude"`
	ConnectionStatus  string     `json:"connection_status"` // connected, alert, offline, maintenance
	Status            string     `json:"status"`
	StreamURL         string     `json:"stream_url,omitempty"`
	DemoVideoURL      string     `json:"demo_video_url,omitempty"`
	IsDemo            bool       `json:"is_demo"`
	ActiveAlertCount  int64      `json:"active_alert_count"`
	LatestAlert       *string    `json:"latest_alert,omitempty"`
	LastRecordingTime *time.Time `json:"last_recording_time,omitempty"`
	VideoCount        int64      `json:"video_count"`
	ProcessingStatus  string     `json:"processing_status"`
}

type CityGISStats struct {
	TotalCameras       int64 `json:"total_cameras"`
	ConnectedCameras   int64 `json:"connected_cameras"`
	AlertCameras       int64 `json:"alert_cameras"`
	OfflineCameras     int64 `json:"offline_cameras"`
	MaintenanceCameras int64 `json:"maintenance_cameras"`
	ActiveAlerts       int64 `json:"active_alerts"`
	TotalSectors       int64 `json:"total_sectors"`
	DemoCamerasCount   int64 `json:"demo_cameras_count"`
}

func (s *MapService) GetMapCameras() ([]MapCameraDTO, error) {
	var cameras []models.Camera
	if err := database.DB.Order("name asc").Find(&cameras).Error; err != nil {
		return nil, err
	}

	result := make([]MapCameraDTO, 0, len(cameras))
	for _, cam := range cameras {
		dto := MapCameraDTO{
			ID:                cam.ID.String(),
			Name:              cam.Name,
			Location:          cam.Location,
			Zone:              cam.Zone,
			Sector:            cam.Sector,
			Latitude:          cam.Latitude,
			Longitude:         cam.Longitude,
			ConnectionStatus:  cam.ConnectionStatus,
			Status:            cam.Status,
			StreamURL:         cam.StreamURL,
			DemoVideoURL:      cam.DemoVideoURL,
			IsDemo:            cam.IsDemo,
			LastRecordingTime: cam.LastRecordingTime,
			ProcessingStatus:  "idle",
		}

		// Count active alerts
		var alertCount int64
		database.DB.Model(&models.Alert{}).
			Where("camera_id = ? AND review_status != 'rejected'", cam.ID).
			Count(&alertCount)
		dto.ActiveAlertCount = alertCount

		if alertCount > 0 {
			var latest models.Alert
			if err := database.DB.Where("camera_id = ?", cam.ID).Order("timestamp desc").First(&latest).Error; err == nil {
				txt := latest.Description
				dto.LatestAlert = &txt
				if dto.ConnectionStatus != "offline" && dto.ConnectionStatus != "maintenance" {
					dto.ConnectionStatus = "alert"
				}
			}
		}

		// Count videos
		var vidCount int64
		database.DB.Model(&models.Video{}).Where("camera_id = ?", cam.ID).Count(&vidCount)
		dto.VideoCount = vidCount

		// Check processing jobs
		var activeJob models.ProcessingJob
		if err := database.DB.Joins("JOIN videos ON videos.id = processing_jobs.video_id").
			Where("videos.camera_id = ? AND processing_jobs.status = 'processing'", cam.ID).
			First(&activeJob).Error; err == nil {
			dto.ProcessingStatus = "processing"
		}

		result = append(result, dto)
	}

	return result, nil
}

func (s *MapService) GetCityStats() (*CityGISStats, error) {
	stats := &CityGISStats{}

	database.DB.Model(&models.Camera{}).Count(&stats.TotalCameras)
	database.DB.Model(&models.Camera{}).Where("connection_status = 'connected'").Count(&stats.ConnectedCameras)
	database.DB.Model(&models.Camera{}).Where("connection_status = 'alert'").Count(&stats.AlertCameras)
	database.DB.Model(&models.Camera{}).Where("connection_status = 'offline'").Count(&stats.OfflineCameras)
	database.DB.Model(&models.Camera{}).Where("connection_status = 'maintenance'").Count(&stats.MaintenanceCameras)
	database.DB.Model(&models.Camera{}).Where("is_demo = true").Count(&stats.DemoCamerasCount)

	database.DB.Model(&models.Alert{}).Where("review_status != 'rejected'").Count(&stats.ActiveAlerts)
	database.DB.Model(&models.Camera{}).Distinct("sector").Count(&stats.TotalSectors)

	return stats, nil
}

func (s *MapService) GetZones() ([]models.CameraZone, error) {
	var zones []models.CameraZone
	if err := database.DB.Order("sector asc").Find(&zones).Error; err != nil {
		return nil, err
	}
	return zones, nil
}

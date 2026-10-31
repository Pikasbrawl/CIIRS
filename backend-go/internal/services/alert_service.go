package services

import (
	"time"

	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
)

type AlertService struct{}

func NewAlertService() *AlertService {
	return &AlertService{}
}

func (s *AlertService) ListAlerts(severity, reviewStatus, alertType string, limit int) ([]models.Alert, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := database.DB.Preload("Camera").Preload("Video").Order("timestamp desc").Limit(limit)

	if severity != "" {
		query = query.Where("severity = ?", severity)
	}
	if reviewStatus != "" {
		query = query.Where("review_status = ?", reviewStatus)
	}
	if alertType != "" {
		query = query.Where("alert_type = ?", alertType)
	}

	var alerts []models.Alert
	if err := query.Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (s *AlertService) GetAlert(id uuid.UUID) (*models.Alert, error) {
	var alert models.Alert
	if err := database.DB.Preload("Camera").Preload("Video").First(&alert, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &alert, nil
}

func (s *AlertService) ReviewAlert(id uuid.UUID, req models.ReviewAlertRequest) (*models.Alert, error) {
	var alert models.Alert
	if err := database.DB.First(&alert, "id = ?", id).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	alert.ReviewStatus = req.ReviewStatus
	alert.ReviewerNotes = req.Notes
	alert.ReviewedBy = req.ReviewedBy
	alert.ReviewedAt = &now

	if err := database.DB.Save(&alert).Error; err != nil {
		return nil, err
	}

	// Also fetch linked camera & video
	database.DB.Preload("Camera").Preload("Video").First(&alert, "id = ?", id)
	return &alert, nil
}

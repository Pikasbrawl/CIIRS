package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"gorm.io/gorm"
)

type CameraService struct{}

func NewCameraService() *CameraService {
	return &CameraService{}
}

func (s *CameraService) ListCameras() ([]models.Camera, error) {
	var cameras []models.Camera
	err := database.DB.Preload("Videos").Order("created_at DESC").Find(&cameras).Error
	return cameras, err
}

func (s *CameraService) GetCameraByID(id uuid.UUID) (*models.Camera, error) {
	var camera models.Camera
	err := database.DB.Preload("Videos").First(&camera, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &camera, err
}

func (s *CameraService) CreateCamera(req models.RegisterCameraRequest) (*models.Camera, error) {
	zone := req.Zone
	if zone == "" {
		zone = "General"
	}

	camera := &models.Camera{
		Name:      req.Name,
		Location:  req.Location,
		Zone:      zone,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := database.DB.Create(camera).Error
	return camera, err
}

func (s *CameraService) UpdateCamera(id uuid.UUID, req models.UpdateCameraRequest) (*models.Camera, error) {
	camera, err := s.GetCameraByID(id)
	if err != nil || camera == nil {
		return nil, err
	}

	if req.Name != "" {
		camera.Name = req.Name
	}
	if req.Location != "" {
		camera.Location = req.Location
	}
	if req.Zone != "" {
		camera.Zone = req.Zone
	}
	if req.Status != "" {
		camera.Status = req.Status
	}
	camera.UpdatedAt = time.Now()

	err = database.DB.Save(camera).Error
	return camera, err
}

func (s *CameraService) DeleteCamera(id uuid.UUID) error {
	return database.DB.Delete(&models.Camera{}, "id = ?", id).Error
}

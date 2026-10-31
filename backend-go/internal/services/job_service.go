package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"github.com/team-panda/ciirs/backend-go/internal/queue"
	"gorm.io/gorm"
)

type JobService struct{}

func NewJobService() *JobService {
	return &JobService{}
}

func (s *JobService) ListJobs(limit int) ([]models.ProcessingJob, error) {
	if limit <= 0 {
		limit = 50
	}
	var jobs []models.ProcessingJob
	err := database.DB.Preload("Video").Preload("Video.Camera").Order("created_at DESC").Limit(limit).Find(&jobs).Error
	return jobs, err
}

func (s *JobService) GetJobByID(id uuid.UUID) (*models.ProcessingJob, error) {
	var job models.ProcessingJob
	err := database.DB.Preload("Video").Preload("Video.Camera").First(&job, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &job, err
}

// UpdateJobStatus updates the state, progress, and stage of a job
func (s *JobService) UpdateJobStatus(status queue.StatusPayload) error {
	jobID, err := uuid.Parse(status.JobID)
	if err != nil {
		return err
	}

	var job models.ProcessingJob
	if err := database.DB.First(&job, "id = ?", jobID).Error; err != nil {
		return err
	}

	job.Status = status.Status
	job.Progress = status.Progress
	if status.Stage != "" {
		job.Stage = status.Stage
	}
	if status.ErrorMessage != "" {
		job.ErrorMessage = status.ErrorMessage
	}

	now := time.Now()
	if status.Status == "processing" && job.StartedAt == nil {
		job.StartedAt = &now
	}
	if status.Status == "completed" || status.Status == "failed" {
		job.CompletedAt = &now
	}

	if err := database.DB.Save(&job).Error; err != nil {
		return err
	}

	// Also update video status if job completed or failed
	if job.VideoID != nil {
		var video models.Video
		if err := database.DB.First(&video, "id = ?", *job.VideoID).Error; err == nil {
			if status.Status == "completed" {
				video.Status = "completed"
			} else if status.Status == "failed" {
				video.Status = "failed"
			} else if status.Status == "processing" {
				video.Status = "processing"
			}
			video.UpdatedAt = time.Now()
			database.DB.Save(&video)
		}
	}

	return nil
}

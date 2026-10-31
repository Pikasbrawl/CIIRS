package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/config"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"github.com/team-panda/ciirs/backend-go/internal/queue"
	"gorm.io/gorm"
)

type VideoService struct {
	cfg *config.Config
}

func NewVideoService(cfg *config.Config) *VideoService {
	return &VideoService{cfg: cfg}
}

func (s *VideoService) ListVideos(cameraID *uuid.UUID) ([]models.Video, error) {
	var videos []models.Video
	query := database.DB.Preload("Camera").Order("created_at DESC")
	if cameraID != nil {
		query = query.Where("camera_id = ?", *cameraID)
	}
	err := query.Find(&videos).Error
	return videos, err
}

func (s *VideoService) GetVideoByID(id uuid.UUID) (*models.Video, error) {
	var video models.Video
	err := database.DB.Preload("Camera").First(&video, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &video, err
}

// UploadVideo handles saving uploaded CCTV video, metadata extraction, DB record, and enqueuing processing
func (s *VideoService) UploadVideo(cameraID uuid.UUID, fileHeader *multipart.FileHeader, recordedAtStart *time.Time) (*models.Video, *models.ProcessingJob, error) {
	// Verify camera exists
	var camera models.Camera
	if err := database.DB.First(&camera, "id = ?", cameraID).Error; err != nil {
		return nil, nil, fmt.Errorf("camera not found: %w", err)
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".mp4" && ext != ".avi" && ext != ".mkv" && ext != ".mov" {
		return nil, nil, fmt.Errorf("unsupported video format: %s. CIIRS accepts .mp4, .avi, .mkv, .mov", ext)
	}

	// Generate unique filename
	videoID := uuid.New()
	safeFilename := fmt.Sprintf("%s_%s%s", videoID.String(), time.Now().Format("20060102150405"), ext)
	destinationPath := filepath.Join(s.cfg.StorageOriginals, safeFilename)

	// Save file to disk
	src, err := fileHeader.Open()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(destinationPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create destination file %s: %w", destinationPath, err)
	}
	defer dst.Close()

	written, err := io.Copy(dst, src)
	if err != nil {
		return nil, nil, fmt.Errorf("failed saving video file: %w", err)
	}

	// Extract metadata via ffprobe
	duration, fps, width, height := s.extractVideoMetadata(destinationPath)

	startTime := time.Now().UTC()
	if recordedAtStart != nil && !recordedAtStart.IsZero() {
		startTime = recordedAtStart.UTC()
	}
	endTime := startTime.Add(time.Duration(duration * float64(time.Second)))

	video := &models.Video{
		ID:              videoID,
		CameraID:        cameraID,
		Filename:        safeFilename,
		OriginalName:    fileHeader.Filename,
		FilePath:        destinationPath,
		FileSize:        written,
		DurationSeconds: duration,
		FPS:             fps,
		Width:           width,
		Height:          height,
		RecordedAtStart: &startTime,
		RecordedAtEnd:   &endTime,
		Status:          "queued",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := database.DB.Create(video).Error; err != nil {
		return nil, nil, fmt.Errorf("failed to create video record: %w", err)
	}

	// Create processing job
	job := &models.ProcessingJob{
		ID:        uuid.New(),
		VideoID:   &video.ID,
		JobType:   "video_analysis",
		Status:    "queued",
		Progress:  0,
		Stage:     "Queued for computer vision pipeline",
		CreatedAt: time.Now(),
	}

	if err := database.DB.Create(job).Error; err != nil {
		return video, nil, fmt.Errorf("failed to create processing job record: %w", err)
	}

	// Dispatch job to Redis Streams
	if queue.Instance != nil {
		err = queue.Instance.PublishJob(&queue.JobPayload{
			JobID:     job.ID.String(),
			VideoID:   video.ID.String(),
			CameraID:  camera.ID.String(),
			FilePath:  destinationPath,
			JobType:   "video_analysis",
			FPS:       1.5, // controlled frame extraction rate for M4 efficiency
			CreatedAt: time.Now(),
		})
		if err != nil {
			log.Printf("[VideoService] Warning: Failed publishing to Redis Stream: %v. AI worker will pick up via DB poll.", err)
		}
	}

	return video, job, nil
}

// ReprocessVideo resets job state and queues it again
func (s *VideoService) ReprocessVideo(videoID uuid.UUID) (*models.ProcessingJob, error) {
	video, err := s.GetVideoByID(videoID)
	if err != nil || video == nil {
		return nil, fmt.Errorf("video not found")
	}

	// Clear previous detections, tracks, and events for this video
	database.DB.Delete(&models.Detection{}, "video_id = ?", videoID)
	database.DB.Delete(&models.Track{}, "video_id = ?", videoID)
	database.DB.Delete(&models.Event{}, "video_id = ?", videoID)

	video.Status = "queued"
	video.UpdatedAt = time.Now()
	database.DB.Save(video)

	job := &models.ProcessingJob{
		ID:        uuid.New(),
		VideoID:   &video.ID,
		JobType:   "video_analysis",
		Status:    "queued",
		Progress:  0,
		Stage:     "Queued for reprocessing",
		CreatedAt: time.Now(),
	}
	if err := database.DB.Create(job).Error; err != nil {
		return nil, err
	}

	if queue.Instance != nil {
		_ = queue.Instance.PublishJob(&queue.JobPayload{
			JobID:     job.ID.String(),
			VideoID:   video.ID.String(),
			CameraID:  video.CameraID.String(),
			FilePath:  video.FilePath,
			JobType:   "video_analysis",
			FPS:       1.5,
			CreatedAt: time.Now(),
		})
	}

	return job, nil
}

func (s *VideoService) GetDetections(videoID uuid.UUID, limit int) ([]models.Detection, error) {
	var detections []models.Detection
	if limit <= 0 || limit > 1000 {
		limit = 500
	}
	err := database.DB.Where("video_id = ?", videoID).Order("timestamp_seconds ASC").Limit(limit).Find(&detections).Error
	return detections, err
}

func (s *VideoService) GetTracks(videoID uuid.UUID) ([]models.Track, error) {
	var tracks []models.Track
	err := database.DB.Preload("Observations").Where("video_id = ?", videoID).Order("start_time ASC").Find(&tracks).Error
	return tracks, err
}

// extractVideoMetadata uses ffprobe to inspect video parameters
func (s *VideoService) extractVideoMetadata(filePath string) (duration float64, fps float64, width int, height int) {
	duration = 0.0
	fps = 25.0
	width = 1280
	height = 720

	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		log.Printf("[VideoService] ffprobe not available or failed on %s: %v. Using defaults.", filePath, err)
		return
	}

	type ProbeOutput struct {
		Streams []struct {
			CodecType string `json:"codec_type"`
			Width     int    `json:"width"`
			Height    int    `json:"height"`
			RFrameRate string `json:"r_frame_rate"`
			Duration  string `json:"duration"`
		} `json:"streams"`
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}

	var probe ProbeOutput
	if err := json.Unmarshal(output, &probe); err != nil {
		return
	}

	if durSec, err := strconv.ParseFloat(probe.Format.Duration, 64); err == nil && durSec > 0 {
		duration = durSec
	}

	for _, st := range probe.Streams {
		if st.CodecType == "video" {
			if st.Width > 0 {
				width = st.Width
			}
			if st.Height > 0 {
				height = st.Height
			}
			if duration == 0 {
				if d, err := strconv.ParseFloat(st.Duration, 64); err == nil && d > 0 {
					duration = d
				}
			}
			// Parse frame rate e.g. "30/1" or "25/1"
			parts := strings.Split(st.RFrameRate, "/")
			if len(parts) == 2 {
				num, _ := strconv.ParseFloat(parts[0], 64)
				den, _ := strconv.ParseFloat(parts[1], 64)
				if den > 0 {
					fps = num / den
				}
			}
			break
		}
	}

	return
}

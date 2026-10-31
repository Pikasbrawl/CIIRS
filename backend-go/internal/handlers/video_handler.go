package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type VideoHandler struct {
	svc *services.VideoService
}

func NewVideoHandler(svc *services.VideoService) *VideoHandler {
	return &VideoHandler{svc: svc}
}

func (h *VideoHandler) List(c *gin.Context) {
	var camID *uuid.UUID
	if cidStr := c.Query("camera_id"); cidStr != "" {
		if cid, err := uuid.Parse(cidStr); err == nil {
			camID = &cid
		}
	}

	videos, err := h.svc.ListVideos(camID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"videos": videos})
}

func (h *VideoHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid video ID"})
		return
	}

	video, err := h.svc.GetVideoByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if video == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "video not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"video": video})
}

func (h *VideoHandler) Upload(c *gin.Context) {
	cameraIDStr := c.PostForm("camera_id")
	if cameraIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "camera_id is required"})
		return
	}
	cameraID, err := uuid.Parse(cameraIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid camera_id format"})
		return
	}

	file, err := c.FormFile("video")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "video file is required: " + err.Error()})
		return
	}

	var recordedAtStart *time.Time
	if startStr := c.PostForm("recorded_at_start"); startStr != "" {
		if parsed, err := time.Parse(time.RFC3339, startStr); err == nil {
			recordedAtStart = &parsed
		} else if parsed, err := time.Parse("2006-01-02 15:04:05", startStr); err == nil {
			recordedAtStart = &parsed
		}
	}

	video, job, err := h.svc.UploadVideo(cameraID, file, recordedAtStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Returns HTTP 202 Accepted because video processing is asynchronous
	c.JSON(http.StatusAccepted, gin.H{
		"message": "Video uploaded successfully and queued for processing",
		"video":   video,
		"job":     job,
	})
}

func (h *VideoHandler) Reprocess(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid video ID"})
		return
	}

	job, err := h.svc.ReprocessVideo(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Video queued for reprocessing",
		"job":     job,
	})
}

func (h *VideoHandler) GetDetections(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid video ID"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "500"))
	detections, err := h.svc.GetDetections(id, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"detections": detections})
}

func (h *VideoHandler) GetTracks(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid video ID"})
		return
	}

	tracks, err := h.svc.GetTracks(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tracks": tracks})
}

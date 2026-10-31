package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

type SystemHandler struct {
	svc    *services.SystemService
	engine *gin.Engine
}

func NewSystemHandler(svc *services.SystemService, engine *gin.Engine) *SystemHandler {
	return &SystemHandler{
		svc:    svc,
		engine: engine,
	}
}

// Health returns overall health check
// GET /api/v1/health
func (h *SystemHandler) Health(c *gin.Context) {
	overview := h.svc.GetOverallHealth()
	c.JSON(http.StatusOK, overview)
}

// HealthDatabase returns PostgreSQL connection and telemetry
// GET /api/v1/health/database
func (h *SystemHandler) HealthDatabase(c *gin.Context) {
	res := h.svc.CheckDatabaseHealth()
	status := http.StatusOK
	if res.Status == "unavailable" {
		status = http.StatusServiceUnavailable
	}
	c.JSON(status, res)
}

// HealthRedis returns Redis connection and metrics
// GET /api/v1/health/redis
func (h *SystemHandler) HealthRedis(c *gin.Context) {
	res := h.svc.CheckRedisHealth()
	status := http.StatusOK
	if res.Status == "unavailable" {
		status = http.StatusServiceUnavailable
	}
	c.JSON(status, res)
}

// HealthAIWorker returns Python AI Engine connectivity and device info
// GET /api/v1/health/ai-worker
func (h *SystemHandler) HealthAIWorker(c *gin.Context) {
	res := h.svc.CheckAIWorkerHealth()
	status := http.StatusOK
	if res.Status == "unavailable" {
		status = http.StatusServiceUnavailable
	}
	c.JSON(status, res)
}

// GetEndpoints returns registered Gin route endpoints dynamically
// GET /api/v1/system/endpoints
func (h *SystemHandler) GetEndpoints(c *gin.Context) {
	res := h.svc.GetRegisteredEndpoints(h.engine)
	c.JSON(http.StatusOK, res)
}

// GetSystemStatus returns comprehensive technical system telemetry
// GET /api/v1/system/status
func (h *SystemHandler) GetSystemStatus(c *gin.Context) {
	overview := h.svc.GetOverallHealth()
	c.JSON(http.StatusOK, overview)
}

// GetDatabaseStats returns real PostgreSQL stats, size and all 13 table record counts
// GET /api/v1/system/database
func (h *SystemHandler) GetDatabaseStats(c *gin.Context) {
	stats, err := h.svc.GetDatabaseTelemetry()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GetTableRecords returns paginated records from a permitted table
// GET /api/v1/system/database/table/:name
func (h *SystemHandler) GetTableRecords(c *gin.Context) {
	tableName := c.Param("name")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	res, err := h.svc.GetTableRecords(tableName, page, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetStorageStats returns disk storage capacity, categories and file listings
// GET /api/v1/system/storage
func (h *SystemHandler) GetStorageStats(c *gin.Context) {
	stats, err := h.svc.GetStorageTelemetry()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GetStreams returns Redis streams monitoring, consumer groups and AI worker status
// GET /api/v1/system/streams
func (h *SystemHandler) GetStreams(c *gin.Context) {
	stats, err := h.svc.GetStreamsTelemetry()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, stats)
}

type RetryJobPayload struct {
	JobID string `json:"job_id" binding:"required"`
}

// RetryJob safely resets a failed processing job and redispatches to queue
// POST /api/v1/system/streams/retry-job
func (h *SystemHandler) RetryJob(c *gin.Context) {
	var req RetryJobPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "Invalid payload: job_id is required",
		})
		return
	}

	job, err := h.svc.RetryProcessingJob(req.JobID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Job successfully reset and queued for processing",
		"job":     job,
	})
}

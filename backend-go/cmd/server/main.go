package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/team-panda/ciirs/backend-go/internal/config"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/handlers"
	"github.com/team-panda/ciirs/backend-go/internal/middleware"
	"github.com/team-panda/ciirs/backend-go/internal/queue"
	"github.com/team-panda/ciirs/backend-go/internal/services"
)

func main() {
	log.Println("================================================================")
	log.Println("  CIIRS — CCTV Incident Intelligence & Reconstruction System     ")
	log.Println("  Chandigarh GIS, Unified Reconstruction & Vehicle Intelligence ")
	log.Println("  Team PANDA | Zinnovatio 4.0                                   ")
	log.Println("================================================================")

	// 1. Load Configuration
	cfg := config.LoadConfig()
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 2. Initialize PostgreSQL Database
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Printf("[Main] Warning: PostgreSQL not reachable during boot: %v. Application will operate with health-check reporting.", err)
	} else {
		log.Println("[Main] PostgreSQL database connection established and verified.")
	}

	// 3. Initialize Redis Queue & Streams
	redisClient, err := queue.InitRedis(cfg)
	if err != nil {
		log.Printf("[Main] Warning: Redis not reachable during boot: %v. Processing jobs will poll database.", err)
	}

	// 4. Initialize Core & Extended Services
	cameraSvc := services.NewCameraService()
	videoSvc := services.NewVideoService(cfg)
	jobSvc := services.NewJobService()
	reconstructionSvc := services.NewReconstructionService()
	searchSvc := services.NewSearchService(cfg)
	reportSvc := services.NewReportService(cfg)
	mapSvc := services.NewMapService()
	alertSvc := services.NewAlertService()
	anprSvc := services.NewANPRService()
	systemSvc := services.NewSystemService(cfg)

	// 5. Start WebSocket Hub & Redis Status Listener
	go handlers.GlobalHub.Run()
	if redisClient != nil {
		redisClient.StartStatusListener(func(status queue.StatusPayload) {
			_ = jobSvc.UpdateJobStatus(status)
			handlers.GlobalHub.BroadcastStatus(status)
		})
	}

	// 6. Initialize HTTP Handlers
	cameraHandler := handlers.NewCameraHandler(cameraSvc)
	videoHandler := handlers.NewVideoHandler(videoSvc)
	jobHandler := handlers.NewJobHandler(jobSvc)
	reconstructionHandler := handlers.NewReconstructionHandler(reconstructionSvc)
	searchHandler := handlers.NewSearchHandler(searchSvc)
	incidentHandler := handlers.NewIncidentHandler()
	reportHandler := handlers.NewReportHandler(reportSvc)
	dashboardHandler := handlers.NewDashboardHandler()
	mapHandler := handlers.NewMapHandler(mapSvc)
	alertHandler := handlers.NewAlertHandler(alertSvc)
	anprHandler := handlers.NewANPRHandler(anprSvc)

	// 7. Setup Router
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.SetupCORS())

	systemHandler := handlers.NewSystemHandler(systemSvc, r)

	// 8. Static File Server for original footage, clips, crops, and reports
	r.StaticFS("/storage", http.Dir(cfg.StoragePath))

	// 9. API v1 Routes
	v1 := r.Group("/api/v1")
	{
		// Health Checks
		v1.GET("/health", systemHandler.Health)
		v1.GET("/health/database", systemHandler.HealthDatabase)
		v1.GET("/health/redis", systemHandler.HealthRedis)
		v1.GET("/health/ai-worker", systemHandler.HealthAIWorker)

		// System Telemetry & Management
		v1.GET("/system/endpoints", systemHandler.GetEndpoints)
		v1.GET("/system/status", systemHandler.GetSystemStatus)
		v1.GET("/system/database", systemHandler.GetDatabaseStats)
		v1.GET("/system/database/table/:name", systemHandler.GetTableRecords)
		v1.GET("/system/storage", systemHandler.GetStorageStats)
		v1.GET("/system/streams", systemHandler.GetStreams)
		v1.POST("/system/streams/retry-job", systemHandler.RetryJob)

		// Realtime WebSocket & SSE
		v1.GET("/ws", handlers.HandleWebSocket)
		v1.GET("/stream", handlers.HandleSSE)

		// Dashboard Stats (aggregated strictly from DB)
		v1.GET("/dashboard/stats", dashboardHandler.GetStats)

		// Module 1: Chandigarh GIS Map & Cameras
		mapGroup := v1.Group("/map")
		{
			mapGroup.GET("/cameras", mapHandler.GetCameras)
			mapGroup.GET("/stats", mapHandler.GetStats)
			mapGroup.GET("/zones", mapHandler.GetZones)
		}

		// Suspicious Activity Alerts
		alertsGroup := v1.Group("/alerts")
		{
			alertsGroup.GET("", alertHandler.List)
			alertsGroup.GET("/:id", alertHandler.Get)
			alertsGroup.PATCH("/:id/review", alertHandler.Review)
		}

		// Camera Management
		cameras := v1.Group("/cameras")
		{
			cameras.GET("", cameraHandler.List)
			cameras.POST("", cameraHandler.Create)
			cameras.GET("/:id", cameraHandler.Get)
			cameras.PUT("/:id", cameraHandler.Update)
			cameras.DELETE("/:id", cameraHandler.Delete)
		}

		// Video Management
		videos := v1.Group("/videos")
		{
			videos.GET("", videoHandler.List)
			videos.POST("/upload", videoHandler.Upload)
			videos.GET("/:id", videoHandler.Get)
			videos.POST("/:id/reprocess", videoHandler.Reprocess)
			videos.GET("/:id/detections", videoHandler.GetDetections)
			videos.GET("/:id/tracks", videoHandler.GetTracks)
		}

		// Processing Jobs
		jobs := v1.Group("/jobs")
		{
			jobs.GET("", jobHandler.List)
			jobs.GET("/:id", jobHandler.Get)
		}

		// Module 2: 30-Minute AI Incident Reconstruction & Timeline
		v1.POST("/reconstruction", reconstructionHandler.Reconstruct)

		// Semantic & Reference Image Video Search
		v1.POST("/search", searchHandler.Search)

		// Incidents & Evidence Review
		v1.PATCH("/incidents/events/:id/status", incidentHandler.UpdateEventStatus)
		v1.PATCH("/incidents/matches/:id/status", incidentHandler.UpdateCandidateMatchStatus)
		incidents := v1.Group("/incidents")
		{
			incidents.GET("", incidentHandler.List)
			incidents.GET("/:id", incidentHandler.Get)
			incidents.GET("/:id/timeline", incidentHandler.GetTimeline)
			incidents.GET("/:id/evidence", incidentHandler.GetEvidence)
			incidents.PATCH("/:id/status", incidentHandler.UpdateStatus)
			incidents.POST("/:id/reports", reportHandler.Generate)
			incidents.GET("/:id/reports", reportHandler.GetByIncident)
		}

		// Direct Reports Endpoint
		v1.GET("/reports/:id", reportHandler.Get)

		// Module 3: Vehicle Intelligence & ANPR
		anprGroup := v1.Group("/anpr")
		{
			anprGroup.GET("/detections", anprHandler.List)
			anprGroup.GET("/detections/:id", anprHandler.Get)
			anprGroup.GET("/search", anprHandler.Search)
			anprGroup.GET("/cameras", anprHandler.GetCameras)
			anprGroup.PATCH("/detections/:id/override", anprHandler.Override)
		}

		vehiclesGroup := v1.Group("/vehicles")
		{
			vehiclesGroup.POST("/lookup", anprHandler.LookupVehicle)
			vehiclesGroup.GET("/:plate/history", anprHandler.GetHistory)
			vehiclesGroup.GET("/:plate/challans", anprHandler.GetChallans)
			vehiclesGroup.GET("/:plate/stolen-status", anprHandler.GetStolenStatus)
		}
	}

	_ = db

	log.Printf("[Main] CIIRS Backend server running on http://localhost:%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("[Main] Server terminated unexpectedly: %v", err)
	}
}

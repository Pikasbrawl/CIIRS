package services

import (
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"gorm.io/datatypes"
)

type ReconstructionService struct{}

func NewReconstructionService() *ReconstructionService {
	return &ReconstructionService{}
}

// ReconstructIncident creates or executes an investigation over the 30-minute window
func (s *ReconstructionService) ReconstructIncident(req models.CreateIncidentRequest) (*models.ReconstructionResult, error) {
	// Determine 30-minute time window
	var winStart, winEnd time.Time
	var incidentTime *time.Time

	if req.Mode == "incident_centred" && req.IncidentTimestamp != nil && !req.IncidentTimestamp.IsZero() {
		incidentTime = req.IncidentTimestamp
		winStart = incidentTime.Add(-15 * time.Minute)
		winEnd = incidentTime.Add(15 * time.Minute)
	} else if req.TimeWindowStart != nil && req.TimeWindowEnd != nil {
		winStart = *req.TimeWindowStart
		winEnd = *req.TimeWindowEnd
		if winEnd.Sub(winStart) > 60*time.Minute {
			// Cap window to max 60 min if user selected oversized, standard is 30 min
			winEnd = winStart.Add(30 * time.Minute)
		}
	} else {
		// Fallback to recent 30-minute window
		winEnd = time.Now().UTC()
		winStart = winEnd.Add(-30 * time.Minute)
	}

	camIDsJSON, _ := json.Marshal(req.CameraIDs)

	incident := models.Incident{
		ID:                uuid.New(),
		Title:             req.Title,
		Description:       req.Description,
		TimeWindowStart:   winStart,
		TimeWindowEnd:     winEnd,
		IncidentTimestamp: incidentTime,
		CameraIDs:         datatypes.JSON(camIDsJSON),
		Status:            "investigating",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := database.DB.Create(&incident).Error; err != nil {
		return nil, fmt.Errorf("failed to create incident: %w", err)
	}

	// 1. Analyze coverage gaps across requested cameras
	gaps := s.analyzeCoverageGaps(req.CameraIDs, winStart, winEnd)

	// 2. Fetch all real events within the time window for these cameras
	var events []models.Event
	err := database.DB.
		Preload("Camera").
		Preload("Video").
		Preload("Track").
		Where("camera_id IN ? AND absolute_time >= ? AND absolute_time <= ?", req.CameraIDs, winStart, winEnd).
		Order("absolute_time ASC").
		Find(&events).Error

	if err != nil {
		return nil, fmt.Errorf("failed querying events for reconstruction: %w", err)
	}

	// 3. Link events to incident
	for idx, ev := range events {
		link := models.IncidentEventLink{
			IncidentID:     incident.ID,
			EventID:        ev.ID,
			RelevanceScore: 1.0 - (float64(idx) * 0.01), // ranking score
			CreatedAt:      time.Now(),
		}
		_ = database.DB.Create(&link).Error
	}

	// 4. Compute candidate cross-camera matches between tracks within the window
	candidateMatches := s.computeCrossCameraMatches(&incident, req.CameraIDs, winStart, winEnd)

	// 5. Build structured evidence-based summary
	summaryText := fmt.Sprintf(
		"CIIRS AI Reconstruction completed for 30-minute window [%s to %s UTC]. "+
			"Analyzed %d camera(s). Retrieved %d structured events and identified %d cross-camera candidate subject matches. "+
			"%d coverage gap(s) identified in recorded footage.",
		winStart.Format("15:04:05"),
		winEnd.Format("15:04:05"),
		len(req.CameraIDs),
		len(events),
		len(candidateMatches),
		len(gaps),
	)

	incident.Summary = summaryText
	database.DB.Save(&incident)

	return &models.ReconstructionResult{
		Incident:         incident,
		TimelineEvents:   events,
		CandidateMatches: candidateMatches,
		CoverageGaps:     gaps,
		Summary:          summaryText,
	}, nil
}

// analyzeCoverageGaps verifies if recordings actually span the requested window
func (s *ReconstructionService) analyzeCoverageGaps(cameraIDs []uuid.UUID, start, end time.Time) []models.ReconstructionCoverageGap {
	var gaps []models.ReconstructionCoverageGap

	for _, camID := range cameraIDs {
		var camera models.Camera
		if err := database.DB.First(&camera, "id = ?", camID).Error; err != nil {
			continue
		}

		var videos []models.Video
		database.DB.Where("camera_id = ? AND recorded_at_start <= ? AND recorded_at_end >= ?", camID, end, start).
			Order("recorded_at_start ASC").
			Find(&videos)

		if len(videos) == 0 {
			gaps = append(gaps, models.ReconstructionCoverageGap{
				CameraID:   camID,
				CameraName: camera.Name,
				GapStart:   start,
				GapEnd:     end,
				Reason:     fmt.Sprintf("No recorded CCTV video files found for %s during the requested investigation window.", camera.Name),
			})
		}
	}

	return gaps
}

// computeCrossCameraMatches evaluates cosine similarity of person appearance embeddings across different cameras
func (s *ReconstructionService) computeCrossCameraMatches(incident *models.Incident, cameraIDs []uuid.UUID, start, end time.Time) []models.CandidateMatch {
	var matches []models.CandidateMatch

	if len(cameraIDs) < 2 {
		return matches
	}

	// Fetch tracks and their Re-ID embeddings for these cameras
	var embeddings []models.Embedding
	err := database.DB.
		Where("camera_id IN ? AND embedding_type = 'reid'", cameraIDs).
		Find(&embeddings).Error

	if err != nil || len(embeddings) < 2 {
		return matches
	}

	// Group embeddings by camera
	camEmbeddings := make(map[uuid.UUID][]models.Embedding)
	for _, emb := range embeddings {
		if emb.CameraID != nil {
			camEmbeddings[*emb.CameraID] = append(camEmbeddings[*emb.CameraID], emb)
		}
	}

	// Compare embeddings across distinct camera pairs
	for i := 0; i < len(cameraIDs); i++ {
		for j := i + 1; j < len(cameraIDs); j++ {
			c1 := cameraIDs[i]
			c2 := cameraIDs[j]

			list1 := camEmbeddings[c1]
			list2 := camEmbeddings[c2]

			for _, e1 := range list1 {
				for _, e2 := range list2 {
					if e1.TrackID == nil || e2.TrackID == nil {
						continue
					}

					var v1, v2 []float64
					_ = json.Unmarshal([]byte(e1.Vector), &v1)
					_ = json.Unmarshal([]byte(e2.Vector), &v2)

					if len(v1) > 0 && len(v1) == len(v2) {
						score := cosineSimilarity(v1, v2)
						// Candidate match threshold (typically >= 0.65)
						if score >= 0.65 {
							match := models.CandidateMatch{
								ID:              uuid.New(),
								IncidentID:      &incident.ID,
								SourceTrackID:   *e1.TrackID,
								TargetTrackID:   *e2.TrackID,
								SourceCameraID:  c1,
								TargetCameraID:  c2,
								SimilarityScore: math.Round(score*1000) / 1000,
								SourceTimestamp: e1.CreatedAt,
								TargetTimestamp: e2.CreatedAt,
								SourceCrop:      e1.CropPath,
								TargetCrop:      e2.CropPath,
								MatchStatus:     "candidate",
								Notes:           fmt.Sprintf("Visual appearance similarity %.1f%% across camera views", score*100),
								CreatedAt:       time.Now(),
							}
							database.DB.Create(&match)

							// Preload cameras
							database.DB.Preload("SourceCamera").Preload("TargetCamera").First(&match, "id = ?", match.ID)
							matches = append(matches, match)
						}
					}
				}
			}
		}
	}

	return matches
}

func cosineSimilarity(a, b []float64) float64 {
	var dotProduct, normA, normB float64
	for i := range a {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if normA == 0 || normB == 0 {
		return 0.0
	}
	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

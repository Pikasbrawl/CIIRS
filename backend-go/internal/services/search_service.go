package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/team-panda/ciirs/backend-go/internal/config"
	"github.com/team-panda/ciirs/backend-go/internal/database"
	"github.com/team-panda/ciirs/backend-go/internal/models"
)

type SearchService struct {
	cfg *config.Config
}

func NewSearchService(cfg *config.Config) *SearchService {
	return &SearchService{cfg: cfg}
}

// SemanticSearch executes visual search over pre-indexed CLIP embeddings and detection descriptions
func (s *SearchService) SemanticSearch(req models.SemanticSearchRequest) ([]models.SearchResultItem, error) {
	limit := req.Limit
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	minScore := req.MinScore
	if minScore <= 0 {
		minScore = 0.40
	}

	// 1. Try embedding the text query via AI engine's CLIP embedder HTTP endpoint or local process
	queryVec, err := s.getQueryEmbedding(req.Query)
	if err != nil {
		log.Printf("[SearchService] Query vector embedding note (%v), falling back to lexical + visual tag search", err)
	}

	var results []models.SearchResultItem

	// Query embeddings from PostgreSQL
	var embeddings []models.Embedding
	dbQuery := database.DB.Where("embedding_type = 'clip'")
	if len(req.CameraIDs) > 0 {
		dbQuery = dbQuery.Where("camera_id IN ?", req.CameraIDs)
	}
	_ = dbQuery.Order("created_at DESC").Limit(500).Find(&embeddings).Error

	// If vector available, compute cosine similarities
	if len(queryVec) > 0 && len(embeddings) > 0 {
		for _, emb := range embeddings {
			var embVec []float64
			_ = json.Unmarshal([]byte(emb.Vector), &embVec)
			if len(embVec) == len(queryVec) {
				sim := cosineSimilarity(queryVec, embVec)
				if sim >= minScore {
					item := s.buildSearchResultItem(emb, sim)
					results = append(results, item)
				}
			}
		}
	}

	// If no results or query vector was unavailable, search descriptions and event keywords
	if len(results) == 0 && req.Query != "" {
		qTerms := strings.Fields(strings.ToLower(req.Query))

		var events []models.Event
		evQuery := database.DB.Preload("Camera").Preload("Video")
		if len(req.CameraIDs) > 0 {
			evQuery = evQuery.Where("camera_id IN ?", req.CameraIDs)
		}

		for _, term := range qTerms {
			evQuery = evQuery.Where("LOWER(description) LIKE ? OR LOWER(event_type) LIKE ?", "%"+term+"%", "%"+term+"%")
		}
		_ = evQuery.Order("confidence DESC").Limit(limit).Find(&events).Error

		for _, ev := range events {
			camName := "Camera"
			camLoc := "Area"
			if ev.Camera != nil {
				camName = ev.Camera.Name
				camLoc = ev.Camera.Location
			}
			videoURL := ""
			if ev.Video != nil {
				videoURL = "/storage/originals/" + ev.Video.Filename
			}

			results = append(results, models.SearchResultItem{
				EmbeddingID:      ev.ID,
				VideoID:          ev.VideoID,
				CameraID:         ev.CameraID,
				CameraName:       camName,
				CameraLocation:   camLoc,
				TimestampSeconds: ev.TimestampSeconds,
				AbsoluteTime:     ev.AbsoluteTime,
				Similarity:       math.Round(ev.Confidence*100) / 100,
				CropPath:         ev.EvidenceThumbnail,
				Description:      ev.Description,
				VideoURL:         videoURL,
			})
		}
	}

	return results, nil
}

func (s *SearchService) buildSearchResultItem(emb models.Embedding, similarity float64) models.SearchResultItem {
	var cam models.Camera
	var vid models.Video
	camName := "CCTV Camera"
	camLoc := "Facility"
	videoURL := ""

	if emb.CameraID != nil {
		if err := database.DB.First(&cam, "id = ?", *emb.CameraID).Error; err == nil {
			camName = cam.Name
			camLoc = cam.Location
		}
	}
	if emb.VideoID != nil {
		if err := database.DB.First(&vid, "id = ?", *emb.VideoID).Error; err == nil {
			videoURL = "/storage/originals/" + vid.Filename
		}
	}

	return models.SearchResultItem{
		EmbeddingID:      emb.ID,
		VideoID:          safeUUID(emb.VideoID),
		CameraID:         safeUUID(emb.CameraID),
		CameraName:       camName,
		CameraLocation:   camLoc,
		TimestampSeconds: emb.TimestampSeconds,
		AbsoluteTime:     emb.CreatedAt,
		Similarity:       math.Round(similarity*1000) / 1000,
		CropPath:         emb.CropPath,
		Description:      emb.Description,
		VideoURL:         videoURL,
	}
}

func safeUUID(u *uuid.UUID) uuid.UUID {
	if u == nil {
		return uuid.Nil
	}
	return *u
}

// getQueryEmbedding requests a 512-dim CLIP text embedding from the local AI service
func (s *SearchService) getQueryEmbedding(query string) ([]float64, error) {
	if strings.TrimSpace(query) == "" {
		return nil, fmt.Errorf("empty query")
	}

	reqBody, _ := json.Marshal(map[string]string{"query": query})
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Post("http://localhost:5001/api/embed_text", "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("embed server responded %d: %s", resp.StatusCode, string(body))
	}

	var res struct {
		Embedding []float64 `json:"embedding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return res.Embedding, nil
}

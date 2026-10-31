package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/team-panda/ciirs/backend-go/internal/config"
)

type RedisClient struct {
	Client       *redis.Client
	JobStream    string
	StatusStream string
	Group        string
	ctx          context.Context
}

// JobPayload represents the shared message schema published by Go to Python AI engine
type JobPayload struct {
	JobID     string    `json:"job_id"`
	VideoID   string    `json:"video_id"`
	CameraID  string    `json:"camera_id"`
	FilePath  string    `json:"file_path"`
	JobType   string    `json:"job_type"`
	FPS       float64   `json:"fps"`
	CreatedAt time.Time `json:"created_at"`
}

// StatusPayload represents the status and progress update published by Python AI engine
type StatusPayload struct {
	JobID        string    `json:"job_id"`
	VideoID      string    `json:"video_id"`
	Status       string    `json:"status"` // processing, completed, failed
	Progress     int       `json:"progress"`
	Stage        string    `json:"stage"`
	ErrorMessage string    `json:"error_message,omitempty"`
	UpdatedAt    time.Time `json:"updated_at"`
}

var Instance *RedisClient

// InitRedis connects to Redis and sets up stream consumer groups
func InitRedis(cfg *config.Config) (*RedisClient, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis] Warning: Redis not immediately reachable at %s:%s: %v", cfg.RedisHost, cfg.RedisPort, err)
		return &RedisClient{
			Client:       rdb,
			JobStream:    cfg.RedisJobStream,
			StatusStream: cfg.RedisStatStream,
			Group:        cfg.RedisGroup,
			ctx:          context.Background(),
		}, err
	}

	log.Printf("[Redis] Connected successfully to Redis at %s:%s", cfg.RedisHost, cfg.RedisPort)

	// Ensure consumer group exists on status stream
	_ = rdb.XGroupCreateMkStream(context.Background(), cfg.RedisStatStream, cfg.RedisGroup, "$").Err()

	rc := &RedisClient{
		Client:       rdb,
		JobStream:    cfg.RedisJobStream,
		StatusStream: cfg.RedisStatStream,
		Group:        cfg.RedisGroup,
		ctx:          context.Background(),
	}
	Instance = rc
	return rc, nil
}

// PublishJob pushes a new video processing job to Redis Streams
func (rc *RedisClient) PublishJob(job *JobPayload) error {
	if rc == nil || rc.Client == nil {
		return fmt.Errorf("redis client is uninitialized")
	}

	data, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job payload: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	id, err := rc.Client.XAdd(ctx, &redis.XAddArgs{
		Stream: rc.JobStream,
		Values: map[string]interface{}{
			"payload": string(data),
		},
	}).Result()

	if err != nil {
		return fmt.Errorf("failed to XADD job to stream %s: %w", rc.JobStream, err)
	}

	log.Printf("[Redis] Dispatched job %s to stream %s (XADD id: %s)", job.JobID, rc.JobStream, id)
	return nil
}

// StartStatusListener continuously reads status updates from Redis Streams and notifies callback
func (rc *RedisClient) StartStatusListener(callback func(StatusPayload)) {
	if rc == nil || rc.Client == nil {
		return
	}

	consumerName := fmt.Sprintf("go-backend-%d", time.Now().UnixNano())
	log.Printf("[Redis] Starting status listener on stream %s as consumer %s", rc.StatusStream, consumerName)

	go func() {
		for {
			entries, err := rc.Client.XReadGroup(context.Background(), &redis.XReadGroupArgs{
				Group:    rc.Group,
				Consumer: consumerName,
				Streams:  []string{rc.StatusStream, ">"},
				Count:    10,
				Block:    2 * time.Second,
			}).Result()

			if err != nil {
				if err != redis.Nil {
					// Transient error or redis unavailable, wait and retry
					time.Sleep(2 * time.Second)
				}
				continue
			}

			for _, stream := range entries {
				for _, msg := range stream.Messages {
					payloadRaw, ok := msg.Values["payload"].(string)
					if ok {
						var status StatusPayload
						if jsonErr := json.Unmarshal([]byte(payloadRaw), &status); jsonErr == nil {
							callback(status)
						}
					}
					// Acknowledge processed message
					_ = rc.Client.XAck(context.Background(), rc.StatusStream, rc.Group, msg.ID)
				}
			}
		}
	}()
}

// Ping checks Redis connectivity
func (rc *RedisClient) Ping() error {
	if rc == nil || rc.Client == nil {
		return fmt.Errorf("redis client is nil")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return rc.Client.Ping(ctx).Err()
}

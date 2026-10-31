package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	Env              string
	Port             string
	FrontendPort     string
	BaseURL          string
	DatabaseURL      string
	RedisHost        string
	RedisPort        string
	RedisPassword    string
	RedisJobStream   string
	RedisStatStream  string
	RedisGroup       string
	StoragePath      string
	StorageOriginals string
	StorageProcessed string
	StorageThumbnails string
	StorageEvidence  string
	StorageReports   string
}

func LoadConfig() *Config {
	// Try loading from .env in current dir, or parent dirs
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	cfg := &Config{
		Env:              getEnv("ENV", "development"),
		Port:             getEnv("PORT", "8080"),
		FrontendPort:     getEnv("FRONTEND_PORT", "5173"),
		BaseURL:          getEnv("BASE_URL", "http://localhost:8080"),
		DatabaseURL:      buildDatabaseURL(),
		RedisHost:        getEnv("REDIS_HOST", "localhost"),
		RedisPort:        getEnv("REDIS_PORT", "6379"),
		RedisPassword:    getEnv("REDIS_PASSWORD", ""),
		RedisJobStream:   getEnv("REDIS_JOB_STREAM", "ciirs:jobs:stream"),
		RedisStatStream:  getEnv("REDIS_STATUS_STREAM", "ciirs:status:stream"),
		RedisGroup:       getEnv("REDIS_GROUP", "ciirs_workers"),
		StoragePath:      getEnv("STORAGE_PATH", "./storage"),
		StorageOriginals: getEnv("STORAGE_ORIGINALS", "./storage/originals"),
		StorageProcessed: getEnv("STORAGE_PROCESSED", "./storage/processed"),
		StorageThumbnails: getEnv("STORAGE_THUMBNAILS", "./storage/thumbnails"),
		StorageEvidence:  getEnv("STORAGE_EVIDENCE", "./storage/evidence"),
		StorageReports:   getEnv("STORAGE_REPORTS", "./storage/reports"),
	}

	// Ensure storage directories exist
	dirs := []string{
		cfg.StoragePath,
		cfg.StorageOriginals,
		cfg.StorageProcessed,
		cfg.StorageThumbnails,
		cfg.StorageEvidence,
		cfg.StorageReports,
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("[Config] Warning: could not create storage directory %s: %v", dir, err)
		}
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func buildDatabaseURL() string {
	if directURL := os.Getenv("DATABASE_URL"); directURL != "" {
		return directURL
	}
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	pass := getEnv("DB_PASSWORD", "postgres")
	name := getEnv("DB_NAME", "ciirs_db")
	ssl := getEnv("DB_SSLMODE", "disable")

	return "host=" + host + " port=" + port + " user=" + user + " password=" + pass + " dbname=" + name + " sslmode=" + ssl + " TimeZone=UTC"
}

// GetRelativeStoragePath converts an absolute or relative path to a web-accessible URI path
func (c *Config) GetRelativeStoragePath(filePath string) string {
	rel, err := filepath.Rel(c.StoragePath, filePath)
	if err != nil {
		return filePath
	}
	return "/storage/" + filepath.ToSlash(rel)
}

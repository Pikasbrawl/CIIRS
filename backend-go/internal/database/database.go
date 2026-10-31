package database

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/team-panda/ciirs/backend-go/internal/config"
	"github.com/team-panda/ciirs/backend-go/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes PostgreSQL connection using GORM and runs migrations
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	var err error
	var db *gorm.DB

	gormLogger := logger.Default.LogMode(logger.Warn)
	if cfg.Env == "development" {
		gormLogger = logger.Default.LogMode(logger.Info)
	}

	// Try connecting with retry (in case Postgres is just spinning up)
	maxRetries := 5
	for i := 1; i <= maxRetries; i++ {
		db, err = gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
			Logger: gormLogger,
		})
		if err == nil {
			sqlDB, errDb := db.DB()
			if errDb == nil && sqlDB.Ping() == nil {
				log.Printf("[Database] Connected successfully to PostgreSQL (attempt %d)", i)
				break
			}
		}
		log.Printf("[Database] Connecting to PostgreSQL (attempt %d/%d)... waiting 2s", i, maxRetries)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", maxRetries, err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB instance: %w", err)
	}

	// Set connection pool limits
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Run migration SQL script if exists, or GORM AutoMigrate
	migrationPath := "./migrations/000001_init_schema.up.sql"
	if sqlBytes, readErr := os.ReadFile(migrationPath); readErr == nil {
		log.Printf("[Database] Applying migration from %s", migrationPath)
		queries := strings.Split(string(sqlBytes), ";")
		for _, q := range queries {
			trimmed := strings.TrimSpace(q)
			if trimmed != "" {
				if execErr := db.Exec(trimmed).Error; execErr != nil {
					// Ignore "already exists" or non-fatal notices
					if !strings.Contains(execErr.Error(), "already exists") && !strings.Contains(execErr.Error(), "NOTICE") {
						log.Printf("[Database] Migration query note: %v", execErr)
					}
				}
			}
		}
	}

	// Ensure all standard and extended tables are auto-migrated
	log.Println("[Database] Auto-migrating tables...")
	if autoErr := db.AutoMigrate(
		&models.Camera{},
		&models.CameraZone{},
		&models.CameraStatusHistory{},
		&models.CameraTimeOffset{},
		&models.Alert{},
		&models.AlertEvidence{},
		&models.VehicleDetection{},
		&models.NumberPlateDetection{},
		&models.VehicleWatchlistMatch{},
		&models.VehicleLookupRequest{},
		&models.ExternalDataSource{},
		&models.Video{},
		&models.ProcessingJob{},
		&models.Detection{},
		&models.Track{},
		&models.TrackObservation{},
		&models.Embedding{},
		&models.Event{},
		&models.Incident{},
		&models.IncidentEventLink{},
		&models.CandidateMatch{},
		&models.Evidence{},
		&models.Report{},
		&models.CitizenReport{},
	); autoErr != nil {
		log.Printf("[Database] Note on auto-migration: %v", autoErr)
	}

	DB = db
	return db, nil
}

// Ping checks if DB is currently reachable
func Ping() error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

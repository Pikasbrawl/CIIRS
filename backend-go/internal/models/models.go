package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// Camera represents a CCTV camera endpoint in Chandigarh city or facility zone
type Camera struct {
	ID                 uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name               string     `gorm:"type:varchar(255);not null" json:"name"`
	Location           string     `gorm:"type:varchar(255);not null" json:"location"`
	Zone               string     `gorm:"type:varchar(100);default:'General'" json:"zone"`
	Sector             string     `gorm:"type:varchar(100);default:'Sector 17'" json:"sector"`
	Latitude           float64    `gorm:"type:double precision;default:30.7333" json:"latitude"`
	Longitude          float64    `gorm:"type:double precision;default:76.7794" json:"longitude"`
	ConnectionStatus   string     `gorm:"type:varchar(50);default:'connected';index" json:"connection_status"` // connected, alert, offline, maintenance
	Status             string     `gorm:"type:varchar(50);default:'active'" json:"status"`
	StreamURL          string     `gorm:"type:text" json:"stream_url,omitempty"`
	DemoVideoURL       string     `gorm:"type:text" json:"demo_video_url,omitempty"`
	IsDemo             bool       `gorm:"default:false" json:"is_demo"`
	TimeOffsetSeconds  float64    `gorm:"default:0" json:"time_offset_seconds"`
	LastRecordingTime  *time.Time `json:"last_recording_time,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`

	// Relationships
	Videos []Video `gorm:"foreignKey:CameraID" json:"videos,omitempty"`
	Alerts []Alert `gorm:"foreignKey:CameraID" json:"alerts,omitempty"`
}

// CameraZone represents a geographic or facility surveillance zone
type CameraZone struct {
	ID                  uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name                string         `gorm:"type:varchar(255);not null" json:"name"`
	Sector              string         `gorm:"type:varchar(100);not null" json:"sector"`
	ZoneType            string         `gorm:"type:varchar(100);default:'Commercial'" json:"zone_type"` // Commercial, Perimeter, Restricted, Residential
	BoundaryCoordinates datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"boundary_coordinates"`
	RestrictedTimes     string         `gorm:"type:varchar(100)" json:"restricted_times,omitempty"` // e.g. "23:00-05:00"
	IsRestricted        bool           `gorm:"default:false" json:"is_restricted"`
	CreatedAt           time.Time      `json:"created_at"`
}

// CameraStatusHistory tracks operational state transitions over time
type CameraStatusHistory struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CameraID  uuid.UUID `gorm:"type:uuid;not null;index" json:"camera_id"`
	OldStatus string    `gorm:"type:varchar(50)" json:"old_status"`
	NewStatus string    `gorm:"type:varchar(50);not null" json:"new_status"`
	Reason    string    `gorm:"type:text" json:"reason"`
	ChangedAt time.Time `gorm:"not null;index" json:"changed_at"`
}

// CameraTimeOffset stores clock drift offsets relative to investigation time
type CameraTimeOffset struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CameraID      uuid.UUID `gorm:"type:uuid;not null;index" json:"camera_id"`
	OffsetSeconds float64   `gorm:"not null" json:"offset_seconds"`
	NTPVerified   bool      `gorm:"default:false" json:"ntp_verified"`
	ConfiguredBy  string    `gorm:"type:varchar(100)" json:"configured_by"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Alert models real-time suspicious incidents requiring human-in-the-loop review
type Alert struct {
	ID            uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	AlertCode     string         `gorm:"type:varchar(50);uniqueIndex;not null" json:"alert_code"` // e.g. ALT-2026-0142
	CameraID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"camera_id"`
	Location      string         `gorm:"type:varchar(255);not null" json:"location"`
	Sector        string         `gorm:"type:varchar(100);default:'Sector 17'" json:"sector"`
	Latitude      float64        `gorm:"type:double precision;default:30.7333" json:"latitude"`
	Longitude     float64        `gorm:"type:double precision;default:76.7794" json:"longitude"`
	Timestamp     time.Time      `gorm:"not null;index" json:"timestamp"`
	AlertType     string         `gorm:"type:varchar(100);not null;index" json:"alert_type"` // unattended_object, restricted_zone_vehicle, restricted_time_transit, monitored_zone_ingress, anpr_watchlist_match, camera_offline
	Confidence    float64        `gorm:"not null" json:"confidence"`
	Severity      string         `gorm:"type:varchar(50);not null;index" json:"severity"` // low, medium, high, critical
	ReviewStatus  string         `gorm:"type:varchar(50);default:'candidate';index" json:"review_status"` // candidate, under_review, confirmed, rejected
	Description   string         `gorm:"type:text;not null" json:"description"`
	EvidenceRef   string         `gorm:"type:text" json:"evidence_ref,omitempty"`
	VideoID       *uuid.UUID     `gorm:"type:uuid;index" json:"video_id,omitempty"`
	SeekSeconds   float64        `gorm:"default:0" json:"seek_seconds"`
	ReviewedBy    string         `gorm:"type:varchar(100)" json:"reviewed_by,omitempty"`
	ReviewerNotes string         `gorm:"type:text" json:"reviewer_notes,omitempty"`
	ReviewedAt    *time.Time     `json:"reviewed_at,omitempty"`
	Metadata      datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt     time.Time      `json:"created_at"`

	// Joined
	Camera *Camera `gorm:"foreignKey:CameraID" json:"camera,omitempty"`
	Video  *Video  `gorm:"foreignKey:VideoID" json:"video,omitempty"`
}

// AlertEvidence links an alert to video clips and forensic snapshots
type AlertEvidence struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	AlertID          uuid.UUID `gorm:"type:uuid;not null;index" json:"alert_id"`
	VideoID          uuid.UUID `gorm:"type:uuid;not null;index" json:"video_id"`
	TimestampSeconds float64   `gorm:"not null" json:"timestamp_seconds"`
	SnapshotPath     string    `gorm:"type:text;not null" json:"snapshot_path"`
	ClipPath         string    `gorm:"type:text" json:"clip_path,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// VehicleDetection records vehicles detected by YOLO11
type VehicleDetection struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	VideoID          uuid.UUID `gorm:"type:uuid;not null;index" json:"video_id"`
	CameraID         uuid.UUID `gorm:"type:uuid;not null;index" json:"camera_id"`
	TimestampSeconds float64   `gorm:"not null;index" json:"timestamp_seconds"`
	AbsoluteTime     time.Time `gorm:"not null;index" json:"absolute_time"`
	VehicleType      string    `gorm:"type:varchar(50);not null;index" json:"vehicle_type"` // car, motorcycle, bus, truck, auto
	Confidence       float64   `gorm:"not null" json:"confidence"`
	BBoxX            float64   `gorm:"not null" json:"bbox_x"`
	BBoxY            float64   `gorm:"not null" json:"bbox_y"`
	BBoxW            float64   `gorm:"not null" json:"bbox_w"`
	BBoxH            float64   `gorm:"not null" json:"bbox_h"`
	Color            string    `gorm:"type:varchar(50)" json:"color,omitempty"`
	TrackID          int       `gorm:"default:0" json:"track_id"`
	CreatedAt        time.Time `json:"created_at"`

	Camera *Camera `gorm:"foreignKey:CameraID" json:"camera,omitempty"`
	Video  *Video  `gorm:"foreignKey:VideoID" json:"video,omitempty"`
}

// NumberPlateDetection records OCR results on license plates
type NumberPlateDetection struct {
	ID                    uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	VehicleDetectionID    *uuid.UUID `gorm:"type:uuid;index" json:"vehicle_detection_id,omitempty"`
	VideoID               uuid.UUID  `gorm:"type:uuid;not null;index" json:"video_id"`
	CameraID              uuid.UUID  `gorm:"type:uuid;not null;index" json:"camera_id"`
	PlateNumberRaw        string     `gorm:"type:varchar(50);not null;index" json:"plate_number_raw"`
	PlateNumberNormalized string     `gorm:"type:varchar(50);not null;index" json:"plate_number_normalized"`
	ConfidenceOCR         float64    `gorm:"not null" json:"confidence_ocr"`
	PlateCropPath         string     `gorm:"type:text" json:"plate_crop_path,omitempty"`
	VehicleCropPath       string     `gorm:"type:text" json:"vehicle_crop_path,omitempty"`
	TimestampSeconds      float64    `gorm:"not null;index" json:"timestamp_seconds"`
	AbsoluteTime          time.Time  `gorm:"not null;index" json:"absolute_time"`
	ManualOverridePlate   string     `gorm:"type:varchar(50)" json:"manual_override_plate,omitempty"`
	IsManuallyCorrected   bool       `gorm:"default:false" json:"is_manually_corrected"`
	CorrectedBy           string     `gorm:"type:varchar(100)" json:"corrected_by,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`

	Camera           *Camera           `gorm:"foreignKey:CameraID" json:"camera,omitempty"`
	Video            *Video            `gorm:"foreignKey:VideoID" json:"video,omitempty"`
	VehicleDetection *VehicleDetection `gorm:"foreignKey:VehicleDetectionID" json:"vehicle_detection,omitempty"`
}

// VehicleWatchlistMatch records candidate alerts against authorized hotlists
type VehicleWatchlistMatch struct {
	ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PlateNumber     string    `gorm:"type:varchar(50);not null;index" json:"plate_number"`
	WatchlistType   string    `gorm:"type:varchar(100);not null" json:"watchlist_type"` // stolen, traffic_offender, suspect, wanted
	AlertLevel      string    `gorm:"type:varchar(50);default:'critical'" json:"alert_level"`
	MatchConfidence float64   `gorm:"not null" json:"match_confidence"`
	MatchedAt       time.Time `gorm:"not null;index" json:"matched_at"`
	SourceAgency    string    `gorm:"type:varchar(100);default:'Chandigarh Police Database'" json:"source_agency"`
	Notes           string    `gorm:"type:text" json:"notes,omitempty"`
	VerifiedBy      string    `gorm:"type:varchar(100)" json:"verified_by,omitempty"`
}

// VehicleLookupRequest records queries to authorized external registries (Challans / Stolen Status)
type VehicleLookupRequest struct {
	ID                   uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PlateNumber          string         `gorm:"type:varchar(50);not null;index" json:"plate_number"`
	SourceName           string         `gorm:"type:varchar(100);not null" json:"source_name"`
	ChallanCount         int            `gorm:"default:0" json:"challan_count"`
	ChallanDetails       datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"challan_details"`
	StolenStatus         string         `gorm:"type:varchar(100);default:'Verification Unavailable — Database Not Connected'" json:"stolen_status"`
	ExternalRecordRef    string         `gorm:"type:varchar(255)" json:"external_record_ref,omitempty"`
	RetrievalTimestamp   time.Time      `json:"retrieval_timestamp"`
	IntegrationAvailable bool           `gorm:"default:false" json:"integration_available"`
	CreatedAt            time.Time      `json:"created_at"`
}

// ExternalDataSource models integration adapters for official portals
type ExternalDataSource struct {
	ID            uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SourceName    string     `gorm:"type:varchar(100);not null" json:"source_name"` // Parivahan e-Challan, CCTNS Stolen Registry
	SourceType    string     `gorm:"type:varchar(50);not null" json:"source_type"`   // challan, stolen_vehicle, vahan
	EndpointURL   string     `gorm:"type:text" json:"endpoint_url,omitempty"`
	Status        string     `gorm:"type:varchar(50);default:'disconnected'" json:"status"` // connected, disconnected, rate_limited
	LastCheckTime *time.Time `json:"last_check_time,omitempty"`
	Notes         string     `gorm:"type:text" json:"notes,omitempty"`
}

// Video represents an uploaded CCTV video recording
type Video struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CameraID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"camera_id"`
	Filename        string     `gorm:"type:varchar(255);not null" json:"filename"`
	OriginalName    string     `gorm:"type:varchar(255);not null" json:"original_name"`
	FilePath        string     `gorm:"type:text;not null" json:"file_path"`
	FileSize        int64      `gorm:"default:0" json:"file_size"`
	DurationSeconds float64    `gorm:"default:0" json:"duration_seconds"`
	FPS             float64    `gorm:"default:0" json:"fps"`
	Width           int        `gorm:"default:0" json:"width"`
	Height          int        `gorm:"default:0" json:"height"`
	RecordedAtStart *time.Time `gorm:"index" json:"recorded_at_start"`
	RecordedAtEnd   *time.Time `gorm:"index" json:"recorded_at_end"`
	Status          string     `gorm:"type:varchar(50);default:'uploaded';index" json:"status"` // uploaded, queued, processing, completed, failed
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Joined
	Camera *Camera `gorm:"foreignKey:CameraID" json:"camera,omitempty"`
}

// ProcessingJob tracks the state and progress of background AI processing jobs
type ProcessingJob struct {
	ID           uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	VideoID      *uuid.UUID     `gorm:"type:uuid;index" json:"video_id"`
	JobType      string         `gorm:"type:varchar(50);not null" json:"job_type"` // video_analysis, reconstruction, anpr
	Status       string         `gorm:"type:varchar(50);default:'queued';index" json:"status"` // queued, processing, completed, failed
	Progress     int            `gorm:"default:0" json:"progress"`
	Stage        string         `gorm:"type:varchar(100);default:'Waiting in queue'" json:"stage"`
	ErrorMessage string         `gorm:"type:text" json:"error_message,omitempty"`
	Metadata     datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	StartedAt    *time.Time     `json:"started_at,omitempty"`
	CompletedAt  *time.Time     `json:"completed_at,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`

	// Joined
	Video *Video `gorm:"foreignKey:VideoID" json:"video,omitempty"`
}

// Detection is a single raw bounding box detected by YOLO in a frame
type Detection struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	VideoID          uuid.UUID `gorm:"type:uuid;not null;index" json:"video_id"`
	FrameNumber      int       `gorm:"not null" json:"frame_number"`
	TimestampSeconds float64   `gorm:"not null;index" json:"timestamp_seconds"`
	ClassName        string    `gorm:"type:varchar(50);not null" json:"class_name"`
	Confidence       float64   `gorm:"not null" json:"confidence"`
	BBoxX            float64   `gorm:"not null" json:"bbox_x"`
	BBoxY            float64   `gorm:"not null" json:"bbox_y"`
	BBoxW            float64   `gorm:"not null" json:"bbox_w"`
	BBoxH            float64   `gorm:"not null" json:"bbox_h"`
	CreatedAt        time.Time `json:"created_at"`
}

// Track represents a continuous tracked entity (via ByteTrack) within a single camera video
type Track struct {
	ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	VideoID         uuid.UUID `gorm:"type:uuid;not null;index" json:"video_id"`
	CameraID        uuid.UUID `gorm:"type:uuid;not null;index" json:"camera_id"`
	LocalTrackID    int       `gorm:"not null" json:"local_track_id"`
	ClassName       string    `gorm:"type:varchar(50);not null" json:"class_name"`
	StartTime       float64   `gorm:"not null" json:"start_time"`
	EndTime         float64   `gorm:"not null" json:"end_time"`
	TotalDetections int       `gorm:"default:0" json:"total_detections"`
	SampleCropPath  string    `gorm:"type:text" json:"sample_crop_path,omitempty"`
	CreatedAt       time.Time `json:"created_at"`

	// Observations
	Observations []TrackObservation `gorm:"foreignKey:TrackID" json:"observations,omitempty"`
}

// TrackObservation records the spatial bounding box of a track in a specific frame
type TrackObservation struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	TrackID          uuid.UUID `gorm:"type:uuid;not null;index" json:"track_id"`
	VideoID          uuid.UUID `gorm:"type:uuid;not null;index" json:"video_id"`
	FrameNumber      int       `gorm:"not null" json:"frame_number"`
	TimestampSeconds float64   `gorm:"not null" json:"timestamp_seconds"`
	BBoxX            float64   `gorm:"not null" json:"bbox_x"`
	BBoxY            float64   `gorm:"not null" json:"bbox_y"`
	BBoxW            float64   `gorm:"not null" json:"bbox_w"`
	BBoxH            float64   `gorm:"not null" json:"bbox_h"`
	Confidence       float64   `gorm:"not null" json:"confidence"`
	CropPath         string    `gorm:"type:text" json:"crop_path,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// Embedding stores visual representation vectors (Re-ID 512-dim or CLIP 512-dim)
type Embedding struct {
	ID               uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	TrackID          *uuid.UUID     `gorm:"type:uuid;index" json:"track_id,omitempty"`
	VideoID          *uuid.UUID     `gorm:"type:uuid;index" json:"video_id,omitempty"`
	CameraID         *uuid.UUID     `gorm:"type:uuid;index" json:"camera_id,omitempty"`
	EmbeddingType    string         `gorm:"type:varchar(50);not null;index" json:"embedding_type"` // reid, clip
	Vector           datatypes.JSON `gorm:"type:jsonb" json:"vector"`                              // float array
	CropPath         string         `gorm:"type:text" json:"crop_path,omitempty"`
	TimestampSeconds float64        `json:"timestamp_seconds"`
	Description      string         `gorm:"type:text" json:"description,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
}

// Event represents a logically inferred surveillance event
type Event struct {
	ID                uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	VideoID           uuid.UUID      `gorm:"type:uuid;not null;index" json:"video_id"`
	CameraID          uuid.UUID      `gorm:"type:uuid;not null;index" json:"camera_id"`
	TrackID           *uuid.UUID     `gorm:"type:uuid;index" json:"track_id,omitempty"`
	EventType         string         `gorm:"type:varchar(100);not null;index" json:"event_type"` // person_entered, person_exited, vehicle_detected, unattended_object, proximity_interaction, loitering
	TimestampSeconds  float64        `gorm:"not null;index" json:"timestamp_seconds"`
	AbsoluteTime      time.Time      `gorm:"not null;index" json:"absolute_time"`
	Confidence        float64        `gorm:"not null" json:"confidence"`
	Description       string         `gorm:"type:text;not null" json:"description"`
	ReviewStatus      string         `gorm:"type:varchar(50);default:'candidate';index" json:"review_status"` // candidate, under_review, confirmed, rejected
	EvidenceThumbnail string         `gorm:"type:text" json:"evidence_thumbnail,omitempty"`
	Metadata          datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt         time.Time      `json:"created_at"`

	// Relationships
	Camera *Camera `gorm:"foreignKey:CameraID" json:"camera,omitempty"`
	Video  *Video  `gorm:"foreignKey:VideoID" json:"video,omitempty"`
	Track  *Track  `gorm:"foreignKey:TrackID" json:"track,omitempty"`
}

// Incident groups events, camera windows, and reconstructs a multi-camera timeline
type Incident struct {
	ID                uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Title             string         `gorm:"type:varchar(255);not null" json:"title"`
	Description       string         `gorm:"type:text" json:"description"`
	TimeWindowStart   time.Time      `gorm:"not null;index" json:"time_window_start"`
	TimeWindowEnd     time.Time      `gorm:"not null;index" json:"time_window_end"`
	IncidentTimestamp *time.Time     `json:"incident_timestamp,omitempty"`
	CameraIDs         datatypes.JSON `gorm:"type:jsonb;not null;default:'[]'" json:"camera_ids"` // []uuid.UUID
	Status            string         `gorm:"type:varchar(50);default:'investigating'" json:"status"` // investigating, closed, archived
	Summary           string         `gorm:"type:text" json:"summary,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`

	// Relationships
	Events           []Event          `gorm:"many2many:incident_event_links;" json:"events,omitempty"`
	CandidateMatches []CandidateMatch `gorm:"foreignKey:IncidentID" json:"candidate_matches,omitempty"`
	Reports          []Report         `gorm:"foreignKey:IncidentID" json:"reports,omitempty"`
}

// IncidentEventLink links an incident to its component events
type IncidentEventLink struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	IncidentID     uuid.UUID `gorm:"type:uuid;not null;index" json:"incident_id"`
	EventID        uuid.UUID `gorm:"type:uuid;not null;index" json:"event_id"`
	RelevanceScore float64   `gorm:"default:1.0" json:"relevance_score"`
	Notes          string    `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// CandidateMatch represents an appearance correlation between two camera tracks
type CandidateMatch struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	IncidentID      *uuid.UUID `gorm:"type:uuid;index" json:"incident_id,omitempty"`
	SourceTrackID   uuid.UUID  `gorm:"type:uuid;not null" json:"source_track_id"`
	TargetTrackID   uuid.UUID  `gorm:"type:uuid;not null" json:"target_track_id"`
	SourceCameraID  uuid.UUID  `gorm:"type:uuid;not null" json:"source_camera_id"`
	TargetCameraID  uuid.UUID  `gorm:"type:uuid;not null" json:"target_camera_id"`
	SimilarityScore float64    `gorm:"not null" json:"similarity_score"`
	SourceTimestamp time.Time  `gorm:"not null" json:"source_timestamp"`
	TargetTimestamp time.Time  `gorm:"not null" json:"target_timestamp"`
	SourceCrop      string     `gorm:"type:text" json:"source_crop,omitempty"`
	TargetCrop      string     `gorm:"type:text" json:"target_crop,omitempty"`
	MatchStatus     string     `gorm:"type:varchar(50);default:'candidate'" json:"match_status"` // candidate, confirmed, rejected
	Notes           string     `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`

	// Joined
	SourceCamera *Camera `gorm:"foreignKey:SourceCameraID" json:"source_camera,omitempty"`
	TargetCamera *Camera `gorm:"foreignKey:TargetCameraID" json:"target_camera,omitempty"`
}

// Evidence represents a verified evidence artifact (frame snapshot or cropped clip)
type Evidence struct {
	ID               uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	IncidentID       *uuid.UUID `gorm:"type:uuid;index" json:"incident_id,omitempty"`
	EventID          *uuid.UUID `gorm:"type:uuid;index" json:"event_id,omitempty"`
	VideoID          uuid.UUID  `gorm:"type:uuid;not null;index" json:"video_id"`
	CameraID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"camera_id"`
	EvidenceType     string     `gorm:"type:varchar(50);not null" json:"evidence_type"` // snapshot, video_clip, crop
	TimestampSeconds float64    `gorm:"not null" json:"timestamp_seconds"`
	FilePath         string     `gorm:"type:text;not null" json:"file_path"`
	Description      string     `gorm:"type:text" json:"description,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`

	Camera *Camera `gorm:"foreignKey:CameraID" json:"camera,omitempty"`
	Video  *Video  `gorm:"foreignKey:VideoID" json:"video,omitempty"`
}

// Report holds the structured and narrative investigation report
type Report struct {
	ID               uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	IncidentID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"incident_id"`
	Title            string         `gorm:"type:varchar(255);not null" json:"title"`
	ExecutiveSummary string         `gorm:"type:text;not null" json:"executive_summary"`
	ContentJSON      datatypes.JSON `gorm:"type:jsonb;not null" json:"content_json"`
	PDFPath          string         `gorm:"type:text" json:"pdf_path,omitempty"`
	GeneratedAt      time.Time      `json:"generated_at"`
}

// CitizenReport represents a public report submitted by citizens
type CitizenReport struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	ReportCode      string         `gorm:"type:varchar(50);uniqueIndex;not null" json:"report_code"`
	Category        string         `gorm:"type:varchar(100);not null" json:"category"`
	Description     string         `gorm:"type:text;not null" json:"description"`
	Latitude        float64        `gorm:"type:double precision;not null" json:"latitude"`
	Longitude       float64        `gorm:"type:double precision;not null" json:"longitude"`
	Address         string         `gorm:"type:varchar(255)" json:"address"`
	AttachmentURL   string         `gorm:"type:varchar(500)" json:"attachment_url"`
	Attachments     datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"attachments"`
	ReporterName    string         `gorm:"type:varchar(100);default:'Pooja Sharma'" json:"reporter_name"`
	ReporterContact string         `gorm:"type:varchar(100)" json:"reporter_contact"`
	Status          string         `gorm:"type:varchar(50);default:'SUBMITTED'" json:"status"`
	ReviewNotes     string         `gorm:"type:text" json:"review_notes"`
	StatusHistory   datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"status_history"`
	IncidentID      *int           `json:"incident_id,omitempty"`
	IncidentNumber  string         `gorm:"type:varchar(50)" json:"incident_number,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

func (CitizenReport) TableName() string {
	return "citizen_reports"
}

// --- DTOs and API Payloads ---

type RegisterCameraRequest struct {
	Name      string  `json:"name" binding:"required"`
	Location  string  `json:"location" binding:"required"`
	Zone      string  `json:"zone"`
	Sector    string  `json:"sector"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type UpdateCameraRequest struct {
	Name             string  `json:"name"`
	Location         string  `json:"location"`
	Zone             string  `json:"zone"`
	Sector           string  `json:"sector"`
	Latitude         float64 `json:"latitude"`
	Longitude        float64 `json:"longitude"`
	ConnectionStatus string  `json:"connection_status"`
	Status           string  `json:"status"`
}

type ReviewAlertRequest struct {
	ReviewStatus string `json:"review_status" binding:"required"` // confirmed, rejected, under_review
	Notes        string `json:"notes"`
	ReviewedBy   string `json:"reviewed_by"`
}

type CreateIncidentRequest struct {
	Title             string      `json:"title" binding:"required"`
	Description       string      `json:"description"`
	Mode              string      `json:"mode"` // "fixed_window" or "incident_centred"
	TimeWindowStart   *time.Time  `json:"time_window_start"`
	TimeWindowEnd     *time.Time  `json:"time_window_end"`
	IncidentTimestamp *time.Time  `json:"incident_timestamp"`
	CameraIDs         []uuid.UUID `json:"camera_ids" binding:"required"`
}

type ANPROverrideRequest struct {
	CorrectedPlate string `json:"corrected_plate" binding:"required"`
	CorrectedBy    string `json:"corrected_by"`
}

type VehicleLookupPayload struct {
	PlateNumber string `json:"plate_number" binding:"required"`
}

// Reconstruction and Search DTOs

type ReconstructionCoverageGap struct {
	CameraID   uuid.UUID `json:"camera_id"`
	CameraName string    `json:"camera_name"`
	GapStart   time.Time `json:"gap_start"`
	GapEnd     time.Time `json:"gap_end"`
	Reason     string    `json:"reason"`
}

type ReconstructionResult struct {
	Incident         Incident                    `json:"incident"`
	TimelineEvents   []Event                     `json:"timeline_events"`
	CandidateMatches []CandidateMatch            `json:"candidate_matches"`
	CoverageGaps     []ReconstructionCoverageGap `json:"coverage_gaps"`
	Summary          string                      `json:"summary"`
}

type SemanticSearchRequest struct {
	Query     string      `json:"query"`
	CameraIDs []uuid.UUID `json:"camera_ids,omitempty"`
	MinScore  float64     `json:"min_score"`
	Limit     int         `json:"limit"`
}

type SearchResultItem struct {
	EmbeddingID      uuid.UUID `json:"embedding_id"`
	VideoID          uuid.UUID `json:"video_id"`
	CameraID         uuid.UUID `json:"camera_id"`
	CameraName       string    `json:"camera_name"`
	CameraLocation   string    `json:"camera_location"`
	TimestampSeconds float64   `json:"timestamp_seconds"`
	AbsoluteTime     time.Time `json:"absolute_time"`
	Similarity       float64   `json:"similarity"`
	CropPath         string    `json:"crop_path"`
	Description      string    `json:"description"`
	VideoURL         string    `json:"video_url"`
}

type UpdateEventReviewStatusRequest struct {
	ReviewStatus string `json:"review_status" binding:"required"`
}

type UpdateCandidateMatchStatusRequest struct {
	MatchStatus string `json:"match_status" binding:"required"`
	Notes       string `json:"notes"`
}

// Dashboard Statistics DTOs

type EventCountType struct {
	EventType string `json:"event_type"`
	Count     int64  `json:"count"`
}

type CameraActivity struct {
	CameraID   uuid.UUID `json:"camera_id"`
	CameraName string    `json:"camera_name"`
	Zone       string    `json:"zone"`
	EventCount int64     `json:"event_count"`
	VideoCount int64     `json:"video_count"`
}

type DashboardStats struct {
	TotalCameras       int64            `json:"total_cameras"`
	ActiveCameras      int64            `json:"active_cameras"`
	TotalVideos        int64            `json:"total_videos"`
	ProcessedVideos    int64            `json:"processed_videos"`
	TotalEvents        int64            `json:"total_events"`
	ActiveIncidents    int64            `json:"active_incidents"`
	ProcessingJobs     int64            `json:"processing_jobs"`
	RecentEvents       []Event          `json:"recent_events"`
	EventsDistribution []EventCountType `json:"events_distribution"`
	CameraActivity     []CameraActivity `json:"camera_activity"`
}

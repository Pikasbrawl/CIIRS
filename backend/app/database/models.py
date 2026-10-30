from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), default="OPERATOR") # ADMIN, OPERATOR, POLICE_RESPONDER, MEDICAL_RESPONDER, INVESTIGATOR
    badge_number = Column(String(50), nullable=True)
    department = Column(String(100), default="City Operations Center")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. CAM-01
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(200), nullable=False)
    area_zone = Column(String(100), nullable=False) # Zone A - Transit Hub, Zone B - Financial Plaza, etc.
    status = Column(String(50), default="ONLINE") # ONLINE, DEGRADED, OFFLINE
    stream_url = Column(String(255), nullable=True)
    resolution = Column(String(50), default="1920x1080")
    fps = Column(Float, default=30.0)
    trust_score = Column(Float, default=98.5) # 0 to 100
    is_tampered = Column(Boolean, default=False)
    is_obstructed = Column(Boolean, default=False)
    last_ping = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    health_logs = relationship("CameraHealthLog", back_populates="camera", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="camera")
    incidents = relationship("Incident", back_populates="camera")

class CameraHealthLog(Base):
    __tablename__ = "camera_health_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ping_ms = Column(Float, default=14.2)
    fps_actual = Column(Float, default=29.8)
    dropped_frames = Column(Integer, default=0)
    frozen_frames = Column(Integer, default=0)
    obstruction_score = Column(Float, default=0.0) # 0.0 to 1.0
    trust_score = Column(Float, default=98.5)
    status_message = Column(String(255), default="Operational - Nominal")
    
    camera = relationship("Camera", back_populates="health_logs")

class VideoUpload(Base):
    __tablename__ = "video_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    fps = Column(Float, default=30.0)
    frame_count = Column(Integer, default=0)
    scenario_tag = Column(String(100), default="Normal Activity")
    status = Column(String(50), default="UPLOADED") # UPLOADED, PROCESSING, COMPLETED, FAILED
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    sample_count = Column(Integer, default=0)
    scenario_distribution = Column(JSON, default=dict) # e.g. {"Crowd Surge": 12, "Fall Detection": 15, ...}
    split_ratio = Column(String(50), default="70/15/15")
    csv_annotation_file = Column(String(255), nullable=True)
    status = Column(String(50), default="READY")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    annotations = relationship("ScenarioAnnotation", back_populates="dataset", cascade="all, delete-orphan")

class ScenarioAnnotation(Base):
    __tablename__ = "scenario_annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    video_name = Column(String(255), nullable=False)
    start_frame = Column(Integer, default=0)
    end_frame = Column(Integer, default=100)
    scenario_label = Column(String(100), nullable=False)
    severity = Column(String(50), default="MODERATE")
    description = Column(Text, nullable=True)
    confidence_ground_truth = Column(Float, default=1.0)
    
    dataset = relationship("Dataset", back_populates="annotations")

class TrainingRun(Base):
    __tablename__ = "training_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    architecture = Column(String(50), default="Temporal LSTM + Attention") # LSTM, TCN, Video Transformer
    epochs_total = Column(Integer, default=25)
    epochs_completed = Column(Integer, default=0)
    batch_size = Column(Integer, default=16)
    learning_rate = Column(Float, default=0.001)
    dataset_name = Column(String(100), default="Urban Surveillance Benchmark v2.4")
    
    train_loss = Column(Float, default=0.0)
    val_loss = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    f1_score = Column(Float, default=0.0)
    false_positive_rate = Column(Float, default=0.0)
    false_negative_rate = Column(Float, default=0.0)
    
    confusion_matrix = Column(JSON, default=dict)
    per_class_metrics = Column(JSON, default=dict)
    epoch_history = Column(JSON, default=list)
    weights_path = Column(String(500), nullable=True)
    status = Column(String(50), default="INITIALIZING") # INITIALIZING, RUNNING, COMPLETED, FAILED
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String(50), unique=True, nullable=False) # e.g. v2.4.1-prod
    architecture = Column(String(50), nullable=False)
    trained_dataset = Column(String(100), nullable=False)
    accuracy = Column(Float, default=0.942)
    f1_score = Column(Float, default=0.938)
    is_active = Column(Boolean, default=False)
    deployed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    video_upload_id = Column(Integer, ForeignKey("video_uploads.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_category = Column(String(100), nullable=False) # Crowd Surge, Fall Detection, Physical Altercation, etc.
    risk_level = Column(String(50), default="LOW") # LOW, MODERATE, HIGH, CRITICAL
    confidence = Column(Float, default=0.85) # 0.0 to 1.0
    explanation = Column(Text, nullable=False)
    observed_indicators = Column(JSON, default=list) # List of observable early warning signals
    bbox_tracks = Column(JSON, default=list) # [{track_id: 1, bbox: [x,y,w,h], velocity: 1.2, posture: 'standing'}, ...]
    supporting_frames_count = Column(Integer, default=30)
    frame_snapshot_url = Column(String(500), nullable=True)
    recommended_action = Column(String(255), default="Maintain automated monitoring")
    is_live = Column(Boolean, default=True)
    
    camera = relationship("Camera", back_populates="predictions")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    risk_category = Column(String(50), default="LOW") # LOW, MODERATE, HIGH, CRITICAL
    composite_score = Column(Float, default=15.0) # 0 to 100
    
    # Factor breakdown
    movement_velocity_score = Column(Float, default=10.0)
    crowd_density_delta = Column(Float, default=5.0)
    proximity_interaction_score = Column(Float, default=0.0)
    posture_abnormality_score = Column(Float, default=0.0)
    temporal_persistence_score = Column(Float, default=10.0)
    
    confidence_vs_probability_note = Column(Text, default="Model confidence reflects sequence fit; incident probability weighted by multi-frame persistence.")
    time_window_seconds = Column(Float, default=5.0)
    suggested_action = Column(String(255), default="Monitor nominal feed")
    created_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. INC-2026-0842
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    category = Column(String(100), nullable=False)
    severity = Column(String(50), default="MODERATE") # LOW, MODERATE, HIGH, CRITICAL
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=False)
    
    status = Column(String(50), default="DETECTED") 
    # DETECTED, OPERATOR_VERIFYING, VERIFIED, DISPATCH_REQUESTED, RESPONDER_EN_ROUTE, ON_SCENE, RESOLVED, DISMISSED
    
    ai_confidence = Column(Float, default=0.88)
    ai_explanation = Column(Text, nullable=False)
    observed_indicators = Column(JSON, default=list)
    evidence_snapshot = Column(String(500), nullable=True)
    
    operator_notes = Column(Text, nullable=True)
    verified_by = Column(String(100), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    camera = relationship("Camera", back_populates="incidents")
    response_requests = relationship("ResponseRequest", back_populates="incident", cascade="all, delete-orphan")

class ResponseRequest(Base):
    __tablename__ = "response_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. REQ-2026-0419
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    agency_type = Column(String(50), nullable=False) # POLICE, MEDICAL, FIRE_AND_RESCUE, MULTI_AGENCY
    severity = Column(String(50), default="HIGH")
    recommended_units = Column(String(100), default="1 Patrol Unit")
    status = Column(String(50), default="PENDING_APPROVAL")
    # PENDING_APPROVAL, APPROVED, DISPATCHED, ACKNOWLEDGED, EN_ROUTE, ON_SCENE, CLOSED
    
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    operator_name = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    dispatch_time = Column(DateTime, nullable=True)
    acknowledged_time = Column(DateTime, nullable=True)
    arrival_time = Column(DateTime, nullable=True)
    closed_time = Column(DateTime, nullable=True)
    
    assigned_unit_callsign = Column(String(50), nullable=True)
    assigned_unit_id = Column(Integer, ForeignKey("response_units.id"), nullable=True)
    eta_minutes = Column(Float, default=4.5)
    triage_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    incident = relationship("Incident", back_populates="response_requests")
    assigned_unit = relationship("ResponseUnit")

class ResponseUnit(Base):
    __tablename__ = "response_units"
    
    id = Column(Integer, primary_key=True, index=True)
    unit_callsign = Column(String(50), unique=True, index=True, nullable=False) # e.g. POLICE-PATROL-12, AMB-MEDIC-04
    agency_type = Column(String(50), nullable=False) # POLICE, MEDICAL, FIRE_AND_RESCUE
    status = Column(String(50), default="AVAILABLE") # AVAILABLE, DISPATCHED, EN_ROUTE, ON_SCENE, RETURNING, OFFLINE
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    heading_deg = Column(Float, default=0.0)
    speed_kmh = Column(Float, default=0.0)
    current_incident_id = Column(Integer, nullable=True)
    commander_name = Column(String(100), nullable=False)
    contact_number = Column(String(50), nullable=False)
    vehicle_type = Column(String(50), default="Rapid Patrol SUV")
    last_update = Column(DateTime, default=datetime.utcnow)

class GPSLocation(Base):
    __tablename__ = "gps_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False) # REGISTERED_CAMERA, AUTHORIZED_RESPONDER, CALLER_GPS
    entity_id = Column(String(50), nullable=False)
    label = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_meters = Column(Float, default=5.0)
    heading = Column(Float, default=0.0)
    speed_kmh = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

class InvestigationCase(Base):
    __tablename__ = "investigation_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. CASE-2026-9021
    title = Column(String(200), nullable=False)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    assigned_investigator = Column(String(100), default="Detective Maya Lin")
    status = Column(String(50), default="OPEN") # OPEN, IN_REVIEW, EVIDENCE_LOCKED, CLOSED
    priority = Column(String(50), default="HIGH")
    
    summary = Column(Text, nullable=False)
    ai_preliminary_findings = Column(Text, nullable=True)
    operator_verified_facts = Column(Text, nullable=True)
    investigator_conclusions = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    evidence_items = relationship("CaseEvidence", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")

class CaseEvidence(Base):
    __tablename__ = "case_evidences"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("investigation_cases.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False) # VIDEO_SEQUENCE, FRAME_SNAPSHOT, AI_TELEMETRY, SENSOR_LOG
    title = Column(String(150), nullable=False)
    file_path = Column(String(500), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    recorded_timestamp = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    is_tamper_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("InvestigationCase", back_populates="evidence_items")

class CaseNote(Base):
    __tablename__ = "case_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("investigation_cases.id"), nullable=False)
    author_name = Column(String(100), nullable=False)
    note_type = Column(String(50), default="INVESTIGATOR_OBSERVATION") # AI_NOTE, OPERATOR_NOTE, INVESTIGATOR_OBSERVATION
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("InvestigationCase", back_populates="notes")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False) # EARLY_WARNING, HIGH_RISK, CONFIRMED_INCIDENT, MEDICAL_DISTRESS, POLICE_ASSISTANCE, CAMERA_TAMPER, VIDEO_DEGRADATION
    severity = Column(String(50), default="HIGH") # LOW, MODERATE, HIGH, CRITICAL
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    deduplication_key = Column(String(100), index=True, nullable=False)
    
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(100), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(100), default="SYSTEM_AUTOMATION")
    action = Column(String(100), nullable=False) # DISPATCH_APPROVED, ALERT_ACKNOWLEDGED, CASE_CREATED, MODEL_TRAINED, etc.
    module = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow)

class PublicIncidentReport(Base):
    __tablename__ = "public_incident_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. REP-2026-7841
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    attachment_url = Column(String(500), nullable=True)
    reporter_contact = Column(String(100), nullable=True)
    status = Column(String(50), default="SUBMITTED") # SUBMITTED, UNDER_REVIEW, VERIFIED, DISMISSED
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VehicleDetection(Base):
    __tablename__ = "vehicle_detections"
    
    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(50), index=True, nullable=False) # e.g. CH01AB1234
    camera_id = Column(String(50), nullable=False) # CAM-17-001
    camera_name = Column(String(100), nullable=False) # Sector 17 - Plaza
    vehicle_type = Column(String(50), default="Car (SUV)") # Car (SUV), Sedan, Motorcycle, Bus, Truck
    confidence = Column(Float, default=0.963)
    speed_kmh = Column(Float, default=38.5)
    is_watchlist = Column(Boolean, default=False)
    watchlist_reason = Column(String(200), nullable=True)
    image_url = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

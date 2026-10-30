from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Auth
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "OPERATOR"
    badge_number: Optional[str] = None
    department: Optional[str] = "City Operations Center"

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    badge_number: Optional[str] = None
    department: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Camera
class CameraCreate(BaseModel):
    camera_id: str
    name: str
    latitude: float
    longitude: float
    address: str
    area_zone: str
    stream_url: Optional[str] = None
    resolution: str = "1920x1080"
    fps: float = 30.0

class CameraHealthUpdate(BaseModel):
    ping_ms: float
    fps_actual: float
    dropped_frames: int
    frozen_frames: int
    is_obstructed: bool
    is_tampered: bool

class CameraOut(BaseModel):
    id: int
    camera_id: str
    name: str
    latitude: float
    longitude: float
    address: str
    area_zone: str
    status: str
    stream_url: Optional[str] = None
    resolution: str
    fps: float
    trust_score: float
    is_tampered: bool
    is_obstructed: bool
    last_ping: datetime
    class Config:
        from_attributes = True

# Predictions & AI
class VideoAnalysisRequest(BaseModel):
    camera_id: str
    scenario_hint: Optional[str] = None
    fps_sample_rate: int = 15

class PredictionOut(BaseModel):
    id: int
    camera_id: int
    timestamp: datetime
    event_category: str
    risk_level: str
    confidence: float
    explanation: str
    observed_indicators: List[str]
    bbox_tracks: List[Dict[str, Any]]
    supporting_frames_count: int
    frame_snapshot_url: Optional[str] = None
    recommended_action: str
    is_live: bool
    class Config:
        from_attributes = True

# Risk Assessment
class RiskAssessmentOut(BaseModel):
    id: int
    camera_id: int
    risk_category: str
    composite_score: float
    movement_velocity_score: float
    crowd_density_delta: float
    proximity_interaction_score: float
    posture_abnormality_score: float
    temporal_persistence_score: float
    confidence_vs_probability_note: str
    time_window_seconds: float
    suggested_action: str
    timestamp: datetime
    class Config:
        from_attributes = True

# Incident
class IncidentCreate(BaseModel):
    camera_id: int
    category: str
    severity: str = "HIGH"
    operator_notes: Optional[str] = None
    ai_confidence: float = 0.88
    ai_explanation: str
    observed_indicators: List[str] = []

class IncidentVerifyRequest(BaseModel):
    verified: bool
    operator_notes: str
    recommended_agency: str = "POLICE"
    priority: str = "HIGH"

class IncidentOut(BaseModel):
    id: int
    incident_number: str
    camera_id: int
    category: str
    severity: str
    latitude: float
    longitude: float
    address: str
    status: str
    ai_confidence: float
    ai_explanation: str
    observed_indicators: List[str]
    evidence_snapshot: Optional[str] = None
    operator_notes: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_demo: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Response Request & Units
class DispatchApprovalRequest(BaseModel):
    incident_id: int
    agency_type: str # POLICE, MEDICAL, FIRE_AND_RESCUE, MULTI_AGENCY
    unit_callsign: Optional[str] = None
    triage_notes: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    status: str # ACKNOWLEDGED, EN_ROUTE, ON_SCENE, CLOSED
    notes: Optional[str] = None

class ResponseUnitOut(BaseModel):
    id: int
    unit_callsign: str
    agency_type: str
    status: str
    latitude: float
    longitude: float
    heading_deg: float
    speed_kmh: float
    current_incident_id: Optional[int] = None
    commander_name: str
    contact_number: str
    vehicle_type: str
    last_update: datetime
    class Config:
        from_attributes = True

class ResponseRequestOut(BaseModel):
    id: int
    request_number: str
    incident_id: int
    agency_type: str
    severity: str
    recommended_units: str
    status: str
    operator_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    dispatch_time: Optional[datetime] = None
    acknowledged_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    closed_time: Optional[datetime] = None
    assigned_unit_callsign: Optional[str] = None
    eta_minutes: float
    triage_notes: Optional[str] = None
    
    # Live Incident Verification Fields
    verification_status: Optional[str] = "AWAITING_REVIEW"
    verification_notes: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    reviewed_camera_ids: Optional[str] = None
    verification_history: Optional[list] = []
    
    # Linked Incident Geolocation & Classification
    incident_number: Optional[str] = None
    incident_category: Optional[str] = None
    incident_severity: Optional[str] = None
    incident_status: Optional[str] = None
    incident_address: Optional[str] = None
    incident_latitude: Optional[float] = None
    incident_longitude: Optional[float] = None
    incident_timestamp: Optional[str] = None
    
    created_at: datetime
    class Config:
        from_attributes = True

# Training
class TrainingStartRequest(BaseModel):
    model_name: str = "CIIRS-Urban-Action-v2.5"
    architecture: str = "Temporal LSTM + Attention"
    dataset_name: str = "Urban Surveillance Benchmark v2.4"
    epochs: int = 15
    batch_size: int = 16
    learning_rate: float = 0.001
    split_ratio: str = "70/15/15"
    selected_scenarios: List[str] = [
        "Normal activity",
        "Crowd surge",
        "Physical altercation indicators",
        "Sudden running",
        "Fall detection",
        "Possible medical distress",
        "Unattended object",
        "Restricted-area entry",
        "Unusual movement"
    ]

# Case & Evidence
class CaseCreate(BaseModel):
    incident_id: Optional[int] = None
    title: str
    summary: str
    assigned_investigator: str = "Detective Maya Lin"
    priority: str = "HIGH"

class CaseNoteCreate(BaseModel):
    note_type: str = "INVESTIGATOR_OBSERVATION"
    content: str

# Alerts
class AlertOut(BaseModel):
    id: int
    alert_type: str
    severity: str
    camera_id: Optional[int] = None
    incident_id: Optional[int] = None
    title: str
    message: str
    deduplication_key: str
    is_acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    is_resolved: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Multi-camera correlation
class CrossCameraTrack(BaseModel):
    track_signature_id: str
    first_seen_camera: str
    last_seen_camera: str
    trajectory_waypoints: List[Dict[str, Any]]
    confidence: float
    is_uncertain: bool
    human_review_required: bool
    event_associations: List[str]

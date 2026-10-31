export type PortalMode = 'PUBLIC_CITIZEN' | 'POLICE_OPERATIONS' | 'BACKEND_ENGINEER';

export type Role = 'ADMIN' | 'OPERATOR' | 'POLICE_RESPONDER' | 'MEDICAL_RESPONDER' | 'INVESTIGATOR' | 'CITIZEN' | 'ENGINEER';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  badge_number?: string;
  department: string;
}

export interface Camera {
  id: number;
  camera_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  area_zone: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  stream_url?: string;
  resolution: string;
  fps: number;
  trust_score: number;
  is_tampered: boolean;
  is_obstructed: boolean;
  last_ping: string;
}

export interface VehicleChallan {
  id: string;
  challan_number: string;
  violation: string;
  location: string;
  date: string;
  amount: number;
  status: 'PENDING' | 'OVERDUE' | 'PAID';
}

export interface StolenRecord {
  is_stolen: boolean;
  fir_number?: string;
  police_station?: string;
  theft_date?: string;
  complainant_name?: string;
  investigating_officer?: string;
  status?: string;
}

export interface VehicleDetection {
  id: number;
  plate_number: string;
  vehicle_type: string;
  vehicle_make_model?: string;
  vehicle_color?: string;
  camera_id: string;
  camera_name?: string;
  location: string;
  timestamp: string;
  confidence: number;
  speed_kmh?: number;
  is_watchlist: boolean;
  watchlist_reason?: string;
  image_url?: string;
  is_stolen?: boolean;
  stolen_details?: StolenRecord;
  pending_challans_count?: number;
  pending_challans_total?: number;
  challans?: VehicleChallan[];
  owner_name?: string;
  registration_date?: string;
  fuel_type?: string;
  insurance_status?: string;
  rto_office?: string;
}

export interface CitizenEvidenceAttachment {
  id: string;
  filename: string;
  original_name?: string;
  file_url: string;
  file_type: 'PHOTO' | 'VIDEO';
  mime_type?: string;
  file_size: number;
  category?: string;
  description?: string;
  duration?: number;
}

export interface PublicIncidentReport {
  id: number;
  report_code: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  reporter_name?: string;
  reporter_phone?: string;
  reporter_contact?: string;
  attachment_url?: string;
  attachments?: CitizenEvidenceAttachment[];
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'DISMISSED' | 'DECLINED' | 'PENDING';
  review_notes?: string;
  status_history?: Array<{
    status: string;
    timestamp: string;
    note: string;
  }>;
  incident_id?: number;
  incident_number?: string;
  created_at: string;
}

export interface AlertItem {
  id: number;
  title: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  camera_id: string;
  location: string;
  time: string;
  timestamp: string;
  thumbnail_type: string;
  status: string;
}

export interface BoundingBoxTrack {
  track_id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  posture: string;
  is_stationary_object?: boolean;
  in_restricted_zone?: boolean;
}

export interface Prediction {
  id?: number;
  camera_id: string | number;
  camera_name?: string;
  timestamp: string;
  event_category: string;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  composite_score: number;
  explanation: string;
  observed_indicators: string[];
  bbox_tracks?: BoundingBoxTrack[];
  recommended_action: string;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  attention_distribution?: number[];
}

export interface Incident {
  id: number;
  incident_number: string;
  camera_id: number;
  category: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  latitude: number;
  longitude: number;
  address: string;
  status: 'DETECTED' | 'OPERATOR_VERIFYING' | 'VERIFIED' | 'DISPATCH_REQUESTED' | 'RESPONDER_EN_ROUTE' | 'ON_SCENE' | 'RESOLVED' | 'DISMISSED';
  ai_confidence: number;
  ai_explanation: string;
  observed_indicators: string[];
  evidence_snapshot?: string;
  operator_notes?: string;
  verified_by?: string;
  verified_at?: string;
  resolved_at?: string;
  is_demo: boolean;
  created_at: string;
}

export interface ResponseRequest {
  id: number;
  request_number: string;
  incident_id: number;
  agency_type: 'POLICE' | 'MEDICAL' | 'FIRE_AND_RESCUE' | 'MULTI_AGENCY';
  severity: string;
  recommended_units: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'EN_ROUTE' | 'ON_SCENE' | 'CLOSED';
  operator_name?: string;
  approved_at?: string;
  dispatch_time?: string;
  acknowledged_time?: string;
  arrival_time?: string;
  closed_time?: string;
  assigned_unit_callsign?: string;
  eta_minutes: number;
  triage_notes?: string;
  verification_status?: 'AWAITING_REVIEW' | 'VERIFIED' | 'FALSE_ALARM' | 'NEEDS_REVIEW' | 'FOOTAGE_REQUESTED' | 'ESCALATED' | string;
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  reviewed_camera_ids?: string;
  verification_history?: Array<{
    action: string;
    verification_status: string;
    reason: string;
    officer_name?: string;
    officer_role?: string;
    badge_number?: string;
    timestamp: string;
    reviewed_cameras?: string;
    video_source_type?: string;
  }>;
  incident_number?: string;
  incident_category?: string;
  incident_severity?: string;
  incident_status?: string;
  incident_address?: string;
  incident_latitude?: number;
  incident_longitude?: number;
  incident_timestamp?: string;
  created_at: string;
}

export interface ResponseUnit {
  id: number;
  unit_callsign: string;
  agency_type: 'POLICE' | 'MEDICAL' | 'FIRE_AND_RESCUE';
  status: 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'RETURNING' | 'OFFLINE';
  latitude: number;
  longitude: number;
  heading_deg: number;
  speed_kmh: number;
  commander_name: string;
  contact_number: string;
  vehicle_type: string;
  last_update: string;
  distance_km?: number;
  estimated_eta_min?: number;
}

export interface InvestigationCase {
  id: number;
  case_number: string;
  title: string;
  incident_id?: number;
  assigned_investigator: string;
  status: 'OPEN' | 'IN_REVIEW' | 'EVIDENCE_LOCKED' | 'CLOSED';
  priority: string;
  summary: string;
  ai_preliminary_findings?: string;
  operator_verified_facts?: string;
  investigator_conclusions?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseEvidence {
  id: number;
  case_id: number;
  evidence_type: string;
  title: string;
  file_path: string;
  sha256_hash: string;
  notes?: string;
  is_tamper_verified: boolean;
  created_at: string;
}

export interface CaseNote {
  id: number;
  case_id: number;
  author_name: string;
  note_type: string;
  content: string;
  created_at: string;
}

export interface TrainingRun {
  id: number;
  model_name: string;
  architecture: string;
  epochs_total: number;
  epochs_completed: number;
  batch_size: number;
  learning_rate: number;
  dataset_name: string;
  train_loss: number;
  val_loss: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  false_negative_rate: number;
  confusion_matrix?: number[][];
  epoch_history?: Array<{
    epoch: number;
    train_loss: number;
    val_loss: number;
    accuracy?: number;
    val_acc?: number;
    f1_score: number;
    fpr: number;
  }>;
  status: 'INITIALIZING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
}

export interface Dataset {
  id: number;
  name: string;
  description?: string;
  sample_count: number;
  scenario_distribution: Record<string, number>;
  split_ratio: string;
  status: string;
}

export interface ModelVersion {
  id: number;
  version_tag: string;
  architecture: string;
  trained_dataset: string;
  accuracy: number;
  f1_score: number;
  is_active: boolean;
  deployed_at?: string;
}

export interface IncidentAuditEntry {
  id: number;
  incident_id?: number;
  incident_number: string;
  agency_type: 'POLICE' | 'MEDICAL' | 'FIRE_AND_RESCUE' | 'CONTROL_ROOM' | 'CITIZEN_UPDATE';
  role: string;
  author_name: string;
  organization: string;
  badge_id?: string;
  entry_title: string;
  entry_category: string;
  description: string;
  location: string;
  patient_count: number;
  triage_status?: string;
  evidence_url?: string;
  evidence_sha256?: string;
  revision_number: number;
  parent_entry_id?: number;
  previous_entry_hash: string;
  entry_hash: string;
  created_at: string;
}

export interface ReconstructionBookmark {
  id: number;
  incident_id?: number;
  camera_id: string;
  timestamp_seconds: number;
  time_display: string;
  label: string;
  notes?: string;
  author_name: string;
  created_at: string;
}

export interface ReconstructionSnapshot {
  id: number;
  incident_id?: number;
  camera_id: string;
  timestamp_seconds: number;
  time_display: string;
  image_url: string;
  sha256_hash: string;
  captured_by: string;
  notes?: string;
  created_at: string;
}

export interface ReconstructionClip {
  id: number;
  incident_id?: number;
  camera_id: string;
  start_seconds: number;
  end_seconds: number;
  title: string;
  video_url: string;
  sha256_hash: string;
  exported_by: string;
  created_at: string;
}

export interface LiveAlert {
  id: string;
  type: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  incident_id?: number;
  camera_id?: string;
}

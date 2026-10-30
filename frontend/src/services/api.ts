import { 
  Camera, Incident, ResponseRequest, ResponseUnit, InvestigationCase,
  CaseEvidence, CaseNote, TrainingRun, Dataset, ModelVersion, Prediction,
  VehicleDetection, PublicIncidentReport, AlertItem, CitizenEvidenceAttachment
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
  },

  // Auth
  login: async (username: string, password: string, portal?: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, portal })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication error occurred.' }));
      throw new Error(err.detail || `Login failed with status ${res.status}`);
    }
    return res.json();
  },

  registerCitizen: async (data: {
    full_name: string;
    email: string;
    phone_number: string;
    password: string;
    confirm_password?: string;
  }) => {
    const res = await fetch(`${BASE_URL}/auth/register-citizen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration error occurred.' }));
      throw new Error(err.detail || `Registration failed with status ${res.status}`);
    }
    return res.json();
  },

  getMe: async (token: string) => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error(`Failed to validate session (${res.status})`);
    }
    return res.json();
  },

  logout: async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
    return res.json();
  },

  getDemoAccounts: async () => {
    const res = await fetch(`${BASE_URL}/auth/demo-accounts`);
    return res.json();
  },

  switchRole: async (role: string, username?: string) => {
    const url = username 
      ? `${BASE_URL}/auth/switch-role?role=${encodeURIComponent(role)}&username=${encodeURIComponent(username)}`
      : `${BASE_URL}/auth/switch-role?role=${encodeURIComponent(role)}`;
    const res = await fetch(url, {
      method: 'POST'
    });
    return res.json();
  },

  // Analytics
  getDashboardKPI: async () => {
    const res = await fetch(`${BASE_URL}/analytics/dashboard-kpi`);
    return res.json();
  },

  getDashboardCharts: async () => {
    const res = await fetch(`${BASE_URL}/analytics/charts`);
    return res.json();
  },

  // Cameras
  getCameras: async (): Promise<Camera[]> => {
    const res = await fetch(`${BASE_URL}/cameras`);
    return res.json();
  },

  getCameraHealthLogs: async (cameraId: string) => {
    const res = await fetch(`${BASE_URL}/cameras/${cameraId}/health-logs`);
    return res.json();
  },

  updateCameraTelemetry: async (cameraId: string, telemetry: any) => {
    const res = await fetch(`${BASE_URL}/cameras/${cameraId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry)
    });
    return res.json();
  },

  // Video Analysis & AI Engine
  getScenarioClasses: async (): Promise<string[]> => {
    const res = await fetch(`${BASE_URL}/analysis/classes`);
    return res.json();
  },

  simulateScenario: async (cameraId: string, scenarioType: string) => {
    const res = await fetch(`${BASE_URL}/analysis/simulate-scenario?camera_id=${encodeURIComponent(cameraId)}&scenario_type=${encodeURIComponent(scenarioType)}`, {
      method: 'POST'
    });
    return res.json();
  },

  uploadVideo: async (formData: FormData) => {
    const res = await fetch(`${BASE_URL}/analysis/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  getVideoLibrary: async () => {
    const res = await fetch(`${BASE_URL}/analysis/videos`);
    return res.json();
  },

  processVideoRecording: async (videoId: string) => {
    const res = await fetch(`${BASE_URL}/analysis/process-video/${encodeURIComponent(videoId)}`, {
      method: 'POST'
    });
    return res.json();
  },

  getVideoHistory: async () => {
    const res = await fetch(`${BASE_URL}/analysis/history`);
    return res.json();
  },

  logVideoHistory: async (data: any) => {
    const res = await fetch(`${BASE_URL}/analysis/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getLatestPredictions: async (): Promise<Prediction[]> => {
    const res = await fetch(`${BASE_URL}/analysis/latest-predictions`);
    return res.json();
  },

  // Incidents & Verification
  getIncidents: async (status?: string): Promise<Incident[]> => {
    const url = status ? `${BASE_URL}/incidents?status=${status}` : `${BASE_URL}/incidents`;
    const res = await fetch(url);
    return res.json();
  },

  getIncident: async (id: number): Promise<Incident> => {
    const res = await fetch(`${BASE_URL}/incidents/${id}`);
    return res.json();
  },

  verifyIncident: async (id: number, verified: boolean, operatorNotes: string, recommendedAgency = 'POLICE', priority = 'HIGH') => {
    const res = await fetch(`${BASE_URL}/incidents/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verified,
        operator_notes: operatorNotes,
        recommended_agency: recommendedAgency,
        priority
      })
    });
    return res.json();
  },

  getRiskAssessment: async (incidentId: number) => {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/risk-assessment`);
    return res.json();
  },

  // Emergency Response
  getResponseRequests: async (agency?: string, status?: string): Promise<ResponseRequest[]> => {
    const params = new URLSearchParams();
    if (agency) params.append('agency', agency);
    if (status) params.append('status', status);
    const res = await fetch(`${BASE_URL}/emergency/requests?${params.toString()}`);
    return res.json();
  },

  getResponseUnits: async (agency?: string): Promise<ResponseUnit[]> => {
    const url = agency ? `${BASE_URL}/emergency/units?agency=${agency}` : `${BASE_URL}/emergency/units`;
    const res = await fetch(url);
    return res.json();
  },

  approveDispatch: async (requestId: number, agencyType: string, unitCallsign?: string, triageNotes?: string) => {
    const res = await fetch(`${BASE_URL}/emergency/requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: 0,
        agency_type: agencyType,
        unit_callsign: unitCallsign,
        triage_notes: triageNotes
      })
    });
    return res.json();
  },

  updateResponseStatus: async (requestId: number, status: string, notes?: string) => {
    const res = await fetch(`${BASE_URL}/emergency/requests/${requestId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    return res.json();
  },

  verifyEmergencyIncident: async (
    requestId: number, 
    payload: { 
      action: string; 
      reason: string; 
      officer_name?: string; 
      officer_role?: string; 
      badge_number?: string; 
      reviewed_camera_ids?: string; 
      video_source_type?: string 
    }
  ) => {
    const res = await fetch(`${BASE_URL}/emergency/requests/${requestId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // GIS
  getGISLayers: async () => {
    const res = await fetch(`${BASE_URL}/gis/layers`);
    return res.json();
  },

  getNearestResponders: async (incidentId: number, agencyType: string = 'POLICE') => {
    const res = await fetch(`${BASE_URL}/gis/nearest-responders?incident_id=${incidentId}&agency_type=${agencyType}`);
    return res.json();
  },

  // Training Centre
  getDatasets: async (): Promise<Dataset[]> => {
    const res = await fetch(`${BASE_URL}/training/datasets`);
    return res.json();
  },

  getTrainingRuns: async (): Promise<TrainingRun[]> => {
    const res = await fetch(`${BASE_URL}/training/runs`);
    return res.json();
  },

  getTrainingRun: async (runId: number): Promise<TrainingRun> => {
    const res = await fetch(`${BASE_URL}/training/runs/${runId}`);
    return res.json();
  },

  startTrainingRun: async (config: any) => {
    const res = await fetch(`${BASE_URL}/training/start-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  getModelVersions: async (): Promise<ModelVersion[]> => {
    const res = await fetch(`${BASE_URL}/training/models`);
    return res.json();
  },

  deployModelVersion: async (modelId: number) => {
    const res = await fetch(`${BASE_URL}/training/models/${modelId}/deploy`, {
      method: 'POST'
    });
    return res.json();
  },

  // Investigations & Evidence
  getCases: async (): Promise<InvestigationCase[]> => {
    const res = await fetch(`${BASE_URL}/investigations/cases`);
    return res.json();
  },

  getCaseDetail: async (caseId: number) => {
    const res = await fetch(`${BASE_URL}/investigations/cases/${caseId}`);
    return res.json();
  },

  createCase: async (payload: any): Promise<InvestigationCase> => {
    const res = await fetch(`${BASE_URL}/investigations/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  addCaseNote: async (caseId: number, content: string, noteType = 'INVESTIGATOR_OBSERVATION') => {
    const res = await fetch(`${BASE_URL}/investigations/cases/${caseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, note_type: noteType })
    });
    return res.json();
  },

  exportCasePdfUrl: (caseId: number) => {
    return `${BASE_URL}/investigations/cases/${caseId}/export-pdf`;
  },

  // Multi-Camera
  getMultiCameraCorrelations: async () => {
    const res = await fetch(`${BASE_URL}/multi-camera/correlations`);
    return res.json();
  },

  // Camera Management CRUD
  registerCamera: async (cameraData: Partial<Camera>): Promise<Camera> => {
    const res = await fetch(`${BASE_URL}/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cameraData)
    });
    return res.json();
  },

  updateCamera: async (id: number, cameraData: Partial<Camera>): Promise<Camera> => {
    const res = await fetch(`${BASE_URL}/cameras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cameraData)
    });
    return res.json();
  },

  deleteCamera: async (id: number): Promise<{ message: string }> => {
    const res = await fetch(`${BASE_URL}/cameras/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Vehicle Intelligence & ANPR
  getRecentVehicles: async (limit: number = 10): Promise<VehicleDetection[]> => {
    const res = await fetch(`${BASE_URL}/vehicles/detections?limit=${limit}`);
    return res.json();
  },

  searchVehicles: async (plate: string = ''): Promise<VehicleDetection[]> => {
    const res = await fetch(`${BASE_URL}/vehicles/search?plate=${encodeURIComponent(plate)}`);
    return res.json();
  },

  getLatestVehicle: async (): Promise<VehicleDetection> => {
    const res = await fetch(`${BASE_URL}/vehicles/latest`);
    return res.json();
  },

  // Alerts & Events
  getAlerts: async (limit: number = 10): Promise<AlertItem[]> => {
    const res = await fetch(`${BASE_URL}/incidents/alerts?limit=${limit}`);
    return res.json();
  },

  // Public Incident Reporting
  submitPublicReport: async (reportData: Partial<PublicIncidentReport>): Promise<any> => {
    const res = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    return res.json();
  },

  uploadCitizenEvidence: async (
    file: File, 
    category: string = 'CITIZEN_EVIDENCE', 
    description: string = '',
    onProgress?: (percent: number) => void
  ): Promise<CitizenEvidenceAttachment> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/reports/upload-evidence`);
      
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            onProgress(percent);
          }
        };
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || 'Upload failed'));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('description', description);
      
      xhr.send(formData);
    });
  },

  getPublicReports: async (status?: string): Promise<PublicIncidentReport[]> => {
    const url = status ? `${BASE_URL}/reports?status=${encodeURIComponent(status)}` : `${BASE_URL}/reports`;
    const res = await fetch(url);
    return res.json();
  },

  trackPublicReport: async (reportCode: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/reports/${encodeURIComponent(reportCode)}`);
    return res.json();
  },

  verifyCitizenReport: async (reportCode: string, payload: { action: string; review_notes: string; operator_name?: string; severity?: string }): Promise<any> => {
    const res = await fetch(`${BASE_URL}/reports/${encodeURIComponent(reportCode)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Incident Audit & Scene Reports
  getAuditableIncidents: async (): Promise<any[]> => {
    const res = await fetch(`${BASE_URL}/audit/incidents`);
    return res.json();
  },

  getIncidentAuditEntries: async (incidentId: string | number): Promise<any[]> => {
    const res = await fetch(`${BASE_URL}/audit/incidents/${incidentId}/entries`);
    return res.json();
  },

  addIncidentAuditEntry: async (incidentId: string | number, entry: any): Promise<any> => {
    const res = await fetch(`${BASE_URL}/audit/incidents/${incidentId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return res.json();
  },

  reviseIncidentAuditEntry: async (incidentId: string | number, entryId: number, revision: any): Promise<any> => {
    const res = await fetch(`${BASE_URL}/audit/incidents/${incidentId}/entries/${entryId}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(revision)
    });
    return res.json();
  },

  verifyAuditChain: async (incidentId: string | number): Promise<any> => {
    const res = await fetch(`${BASE_URL}/audit/incidents/${incidentId}/verify-chain`);
    return res.json();
  },

  // Forensic Reconstruction Tools
  getReconstructionBookmarks: async (incidentId?: number): Promise<any[]> => {
    const url = incidentId ? `${BASE_URL}/reconstruction/bookmarks?incident_id=${incidentId}` : `${BASE_URL}/reconstruction/bookmarks`;
    const res = await fetch(url);
    return res.json();
  },

  createReconstructionBookmark: async (payload: any): Promise<any> => {
    const res = await fetch(`${BASE_URL}/reconstruction/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  deleteReconstructionBookmark: async (id: number): Promise<any> => {
    const res = await fetch(`${BASE_URL}/reconstruction/bookmarks/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  getReconstructionSnapshots: async (incidentId?: number): Promise<any[]> => {
    const url = incidentId ? `${BASE_URL}/reconstruction/snapshots?incident_id=${incidentId}` : `${BASE_URL}/reconstruction/snapshots`;
    const res = await fetch(url);
    return res.json();
  },

  createReconstructionSnapshot: async (payload: any): Promise<any> => {
    const res = await fetch(`${BASE_URL}/reconstruction/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  getReconstructionClips: async (incidentId?: number): Promise<any[]> => {
    const url = incidentId ? `${BASE_URL}/reconstruction/clips?incident_id=${incidentId}` : `${BASE_URL}/reconstruction/clips`;
    const res = await fetch(url);
    return res.json();
  },

  createReconstructionClip: async (payload: any): Promise<any> => {
    const res = await fetch(`${BASE_URL}/reconstruction/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // System Health & Telemetry for Backend Engineer Portal
  getSystemHealth: async (): Promise<any> => {
    const res = await fetch(`${BASE_URL}/system/health`);
    return res.json();
  },

  getSystemLogs: async (lines: number = 50): Promise<any[]> => {
    const res = await fetch(`${BASE_URL}/system/logs?lines=${lines}`);
    return res.json();
  },

  getSystemUsers: async (): Promise<any[]> => {
    const res = await fetch(`${BASE_URL}/system/users`);
    return res.json();
  },

  triggerSystemBackup: async (): Promise<any> => {
    const res = await fetch(`${BASE_URL}/system/backup`, {
      method: 'POST'
    });
    return res.json();
  }
};

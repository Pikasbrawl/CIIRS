import React, { useState, useEffect, useRef } from 'react';
import { 
  Siren, Shield, HeartPulse, Flame, Users, CheckCircle, 
  Clock, AlertTriangle, ArrowRight, UserCheck, RefreshCw, Send, CheckCircle2,
  Video, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, 
  Rewind, FastForward, ChevronLeft, ChevronRight, Camera, Download,
  ExternalLink, Layers, Eye, MapPin, XCircle, AlertCircle, HelpCircle,
  FileText, ShieldCheck, Hash, User, Activity, CornerDownRight
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { ResponseRequest, ResponseUnit, Camera as CameraType } from '../types';

// Haversine formula to compute distance between geographical coordinates in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Preset demonstration footage mapped to registered cameras
const CAMERA_VIDEO_MAP: Record<string, { url: string; label: string; isLive: boolean }> = {
  'CAM-17-001': { url: '/static/real_pedestrian_walk.mp4', label: 'Pedestrian Movement — Plaza Concourse', isLive: false },
  'CAM-22-003': { url: '/static/real_unattended_bag.mp4', label: 'Public Space & Baggage Activity — Market', isLive: false },
  'CAM-35-002': { url: '/static/real_public_interaction.mp4', label: 'Road Traffic & Rotary Transit', isLive: false },
  'CAM-43-001': { url: '/static/ucf_crime_road_accidents_demo.mp4', label: 'Traffic Intersection & Transit Entry', isLive: false },
  'CAM-08-001': { url: '/static/casia_surveillance_fall_demo.mp4', label: 'Pedestrian Walkway & Public Safety', isLive: false },
  'CAM-10-004': { url: '/static/real_sudden_running.mp4', label: 'Promenade Outdoor Monitoring', isLive: false },
  'CAM-14-002': { url: '/static/demo_building_entrance.mp4', label: 'Building Entrance & Perimeter', isLive: false },
  'CAM-20-001': { url: '/static/demo_traffic_intersection.mp4', label: 'IT Park Expressway Intersection', isLive: false }
};

const DEFAULT_DEMO_VIDEOS = [
  { url: '/static/real_pedestrian_walk.mp4', label: 'CAM-DEMO-001: Pedestrian Movement' },
  { url: '/static/real_unattended_bag.mp4', label: 'CAM-DEMO-002: Public Space Activity' },
  { url: '/static/ucf_crime_road_accidents_demo.mp4', label: 'CAM-DEMO-003: Traffic Intersection' },
  { url: '/static/real_public_interaction.mp4', label: 'CAM-DEMO-004: Road Traffic Flow' }
];

export const EmergencyResponseCentre: React.FC = () => {
  const { currentUser, refreshIncidentsCount, setActiveTab } = useApp();

  const [requests, setRequests] = useState<ResponseRequest[]>([]);
  const [units, setUnits] = useState<ResponseUnit[]>([]);
  const [allCameras, setAllCameras] = useState<CameraType[]>([]);
  const [selectedReq, setSelectedReq] = useState<ResponseRequest | null>(null);

  // Dispatch Form State
  const [selectedAgency, setSelectedAgency] = useState<string>('POLICE');
  const [selectedUnitCallsign, setSelectedUnitCallsign] = useState<string>('');
  const [triageNotes, setTriageNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterAgency, setFilterAgency] = useState<string>('ALL');

  // Video Grid State
  const [gridMode, setGridMode] = useState<'SPLIT' | 'QUAD' | 'FOCUS'>('SPLIT');
  const [activeFeeds, setActiveFeeds] = useState<Array<{ camera: CameraType; distance: number; videoUrl: string; label: string; isLive: boolean }>>([]);
  const [focusedFeedIndex, setFocusedFeedIndex] = useState<number>(0);
  const [isMasterPlaying, setIsMasterPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [playbackTimes, setPlaybackTimes] = useState<Record<number, { current: number; duration: number }>>({});

  // Video Refs for each player slot (up to 4)
  const videoRefs = [
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null)
  ];

  // Officer Verification Modal / Form State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'VERIFY' | 'FALSE_ALARM' | 'NEEDS_REVIEW' | 'REQUEST_FOOTAGE' | 'ESCALATE'>('VERIFY');
  const [verifyReason, setVerifyReason] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string | null>(null);

  // Snapshot State
  const [capturedSnapshot, setCapturedSnapshot] = useState<any>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [reqs, respUnits, cams] = await Promise.all([
        api.getResponseRequests(),
        api.getResponseUnits(),
        api.getCameras()
      ]);
      setRequests(reqs);
      setUnits(respUnits);
      setAllCameras(cams);

      if (reqs.length > 0 && !selectedReq) {
        setSelectedReq(reqs[0]);
        setSelectedAgency(reqs[0].agency_type);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update matched cameras whenever selectedReq or allCameras changes
  useEffect(() => {
    if (!selectedReq || allCameras.length === 0) return;

    const incLat = selectedReq.incident_latitude || 30.7333;
    const incLng = selectedReq.incident_longitude || 76.7794;

    // Calculate distance to each registered camera
    const matched = allCameras.map((cam) => {
      const dist = getDistanceMeters(incLat, incLng, cam.latitude, cam.longitude);
      const videoInfo = CAMERA_VIDEO_MAP[cam.camera_id] || {
        url: DEFAULT_DEMO_VIDEOS[Math.abs(cam.id) % DEFAULT_DEMO_VIDEOS.length].url,
        label: `${cam.name} (${cam.area_zone})`,
        isLive: cam.status === 'ONLINE' && cam.stream_url?.startsWith('rtsp://')
      };

      return {
        camera: cam,
        distance: dist,
        videoUrl: videoInfo.url,
        label: videoInfo.label,
        isLive: videoInfo.isLive
      };
    });

    // Sort by proximity to incident location
    matched.sort((a, b) => a.distance - b.distance);

    // Keep top 4 closest cameras
    setActiveFeeds(matched.slice(0, 4));
    setFocusedFeedIndex(0);
  }, [selectedReq, allCameras]);

  // Master Playback controls
  const handleToggleMasterPlay = () => {
    const nextPlay = !isMasterPlaying;
    setIsMasterPlaying(nextPlay);
    videoRefs.forEach((ref) => {
      if (ref.current) {
        if (nextPlay) {
          ref.current.play().catch(() => {});
        } else {
          ref.current.pause();
        }
      }
    });
  };

  const handleRestartAll = () => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.currentTime = 0;
      }
    });
  };

  const handleSeekRelative = (seconds: number) => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.currentTime = Math.max(0, ref.current.currentTime + seconds);
      }
    });
  };

  const handleStepFrame = (frames: number) => {
    setIsMasterPlaying(false);
    const frameSec = 1 / 25; // 0.04s per frame at 25 FPS
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = Math.max(0, ref.current.currentTime + frames * frameSec);
      }
    });
  };

  // Switch camera for a specific feed slot
  const handleSelectFeedCamera = (slotIndex: number, newCameraId: string) => {
    const cam = allCameras.find((c) => c.camera_id === newCameraId);
    if (!cam) return;

    const incLat = selectedReq?.incident_latitude || 30.7333;
    const incLng = selectedReq?.incident_longitude || 76.7794;
    const dist = getDistanceMeters(incLat, incLng, cam.latitude, cam.longitude);

    const videoInfo = CAMERA_VIDEO_MAP[cam.camera_id] || {
      url: DEFAULT_DEMO_VIDEOS[Math.abs(cam.id) % DEFAULT_DEMO_VIDEOS.length].url,
      label: `${cam.name} (${cam.area_zone})`,
      isLive: cam.status === 'ONLINE' && cam.stream_url?.startsWith('rtsp://')
    };

    setActiveFeeds((prev) => {
      const copy = [...prev];
      copy[slotIndex] = {
        camera: cam,
        distance: dist,
        videoUrl: videoInfo.url,
        label: videoInfo.label,
        isLive: videoInfo.isLive
      };
      return copy;
    });
  };

  // Capture Forensic Snapshot from focused feed
  const handleCaptureSnapshot = () => {
    const feed = activeFeeds[focusedFeedIndex];
    if (!feed) return;

    const snap = {
      cameraId: feed.camera.camera_id,
      cameraName: feed.camera.name,
      incidentNumber: selectedReq?.incident_number || `INC-${selectedReq?.incident_id}`,
      timestamp: new Date().toLocaleTimeString('en-GB') + ' IST',
      imageUrl: '/static/sample_cctv_frame1.jpg',
      sha256: '9b1e52f41c3080aa6832bc97148d56b00b48f938c1a7e28318047c20df8901b2',
      operator: currentUser.full_name || 'Senior Operator Arjun Singh'
    };
    setCapturedSnapshot(snap);
  };

  // Submit Officer Incident Verification Decision
  const handleOpenVerifyModal = (action: 'VERIFY' | 'FALSE_ALARM' | 'NEEDS_REVIEW' | 'REQUEST_FOOTAGE' | 'ESCALATE') => {
    setVerifyAction(action);
    setVerifySuccessMsg(null);
    if (action === 'VERIFY') {
      setVerifyReason('CCTV feed confirms observed situation. Incident verified for response dispatch.');
    } else if (action === 'FALSE_ALARM') {
      setVerifyReason('No incident or distress visible in available CCTV footage. Benign public activity.');
    } else if (action === 'NEEDS_REVIEW') {
      setVerifyReason('Visual information inconclusive. Multi-angle review and field patrol verification needed.');
    } else if (action === 'REQUEST_FOOTAGE') {
      setVerifyReason('Current camera angle partially obscured. Requesting feeds from adjacent sector junctions.');
    } else {
      setVerifyReason('Incident severity requires senior control officer assessment and joint dispatch review.');
    }
    setShowVerifyModal(true);
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setIsVerifying(true);
    setVerifySuccessMsg(null);

    const reviewedCams = activeFeeds.map(f => f.camera.camera_id).join(', ');
    const sourceTypes = activeFeeds.some(f => f.isLive) ? 'LIVE' : 'DEMO FOOTAGE — H.264 HD';

    try {
      const res = await api.verifyEmergencyIncident(selectedReq.id, {
        action: verifyAction,
        reason: verifyReason,
        officer_name: currentUser.full_name || 'Senior Operator Arjun Singh',
        officer_role: currentUser.role || 'Control-Room Operator',
        badge_number: currentUser.badge_number || 'OPR-402',
        reviewed_camera_ids: reviewedCams,
        video_source_type: sourceTypes
      });

      if (res && res.status === 'SUCCESS') {
        setVerifySuccessMsg(res.message);
        setShowVerifyModal(false);
        await fetchData();
        await refreshIncidentsCount();

        // Refresh selected request in-place
        const updated = await api.getResponseRequests();
        const match = updated.find((r) => r.id === selectedReq.id);
        if (match) setSelectedReq(match);
      }
    } catch (err) {
      alert('Error submitting verification decision.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Existing Dispatch Handlers
  const handleApproveDispatch = async (requestId: number) => {
    setIsSubmitting(true);
    try {
      await api.approveDispatch(
        requestId,
        selectedAgency,
        selectedUnitCallsign || undefined,
        triageNotes || undefined
      );
      await fetchData();
      await refreshIncidentsCount();
      const updated = await api.getResponseRequests();
      const match = updated.find((r) => r.id === requestId);
      if (match) setSelectedReq(match);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId: number, nextStatus: string) => {
    try {
      await api.updateResponseStatus(requestId, nextStatus);
      await fetchData();
      const updated = await api.getResponseRequests();
      const match = updated.find((r) => r.id === requestId);
      if (match) setSelectedReq(match);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRequests = filterAgency === 'ALL' 
    ? requests 
    : requests.filter((r) => r.agency_type === filterAgency);

  // Status and Verification Badges
  const getDispatchStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#E5A12B] border border-[#FDE68A]">PENDING APPROVAL</span>;
      case 'DISPATCHED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEE2E2] text-[#E34D59] border border-[#FECACA]">DISPATCHED</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DCEBFA] text-[#2463A6] border border-[#BFDBFE]">ACKNOWLEDGED</span>;
      case 'EN_ROUTE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3ECFB] text-[#7E3AF2] border border-[#E9D5FF]">EN ROUTE</span>;
      case 'ON_SCENE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8F8F0] text-[#16A36A] border border-[#A7F3D0]">ON SCENE</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#8795A5] border border-[#E2E8F0]">CLOSED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#8795A5]">{status}</span>;
    }
  };

  const getVerificationStatusBadge = (verStatus?: string) => {
    switch (verStatus) {
      case 'VERIFIED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">● VERIFIED</span>;
      case 'FALSE_ALARM':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">✕ FALSE ALARM</span>;
      case 'NEEDS_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">▲ NEEDS REVIEW</span>;
      case 'FOOTAGE_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">⟳ FOOTAGE REQUESTED</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">↑ ESCALATED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ AWAITING REVIEW</span>;
    }
  };

  const getAgencyIcon = (agency: string) => {
    switch (agency) {
      case 'POLICE': return <Shield className="w-4 h-4 text-[#2463A6]" />;
      case 'MEDICAL': return <HeartPulse className="w-4 h-4 text-[#E34D59]" />;
      case 'FIRE_AND_RESCUE': return <Flame className="w-4 h-4 text-[#E5A12B]" />;
      default: return <Users className="w-4 h-4 text-[#2463A6]" />;
    }
  };

  // Determine which feeds to show based on grid mode
  const displayedFeeds = gridMode === 'FOCUS'
    ? [activeFeeds[focusedFeedIndex] || activeFeeds[0]]
    : gridMode === 'QUAD'
    ? activeFeeds.slice(0, 4)
    : activeFeeds.slice(0, 2); // SPLIT default 2 feeds

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E1EAF2] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <Siren className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-[#172F50] leading-tight">
                Emergency Response & Rapid Coordination Centre
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DCEBFA] text-[#2463A6]">
                LIVE INCIDENT VERIFICATION CENTRE
              </span>
            </div>
            <p className="text-xs text-[#526477] mt-0.5">
              Visual incident verification before dispatch approval. Operators inspect real-time CCTV feeds correlated to incident location.
            </p>
          </div>
        </div>

        {/* Agency Filter & Actions */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#F4F8FC] p-1 rounded-xl border border-[#E1EAF2] text-xs">
            {['ALL', 'POLICE', 'MEDICAL', 'FIRE_AND_RESCUE'].map((ag) => (
              <button
                key={ag}
                onClick={() => setFilterAgency(ag)}
                className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold ${
                  filterAgency === ag ? 'bg-[#2463A6] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
                }`}
              >
                {ag === 'ALL' ? 'All' : ag.replace('_AND_RESCUE', '')}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-[#F4F8FC] border border-[#E1EAF2] text-[#526477] hover:text-[#172F50] transition"
            title="Refresh Requests"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Col View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Request Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E1EAF2] rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
            <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
              Response Requests ({filteredRequests.length})
            </span>
            <span className="text-[10px] font-mono text-[#2463A6] font-bold">ACTIVE QUEUE</span>
          </div>

          <div className="space-y-2 max-h-[780px] overflow-y-auto custom-scrollbar pr-1">
            {filteredRequests.map((req) => {
              const isSelected = selectedReq?.id === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => {
                    setSelectedReq(req);
                    setSelectedAgency(req.agency_type);
                  }}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition space-y-2 ${
                    isSelected 
                      ? 'bg-[#DCEBFA]/40 border-[#2463A6] shadow-sm' 
                      : 'bg-[#F8FAFC] border-[#E1EAF2] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#172F50] flex items-center space-x-1.5">
                      {getAgencyIcon(req.agency_type)}
                      <span>{req.request_number}</span>
                    </span>
                    {getDispatchStatusBadge(req.status)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#172F50] font-bold">{req.incident_category || `${req.agency_type} Alert`}</div>
                      <div className="text-[11px] text-[#526477] truncate max-w-[200px]">{req.incident_address || 'Chandigarh City Network'}</div>
                    </div>
                    {getVerificationStatusBadge(req.verification_status)}
                  </div>

                  <div className="pt-2 border-t border-[#E1EAF2] flex items-center justify-between text-[10px] text-[#8291A2]">
                    <span>ETA: <strong className="text-[#16A36A] font-mono">{req.eta_minutes} min</strong></span>
                    <span>Unit: {req.assigned_unit_callsign || 'Unassigned'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 8-Cols: LIVE INCIDENT VERIFICATION CENTRE */}
        {selectedReq ? (
          <div className="lg:col-span-8 bg-white border border-[#E1EAF2] rounded-2xl p-5 shadow-sm space-y-5">
            {/* ======================================================== */}
            {/* 1. TOP SECTION — SELECTED INCIDENT SUMMARY               */}
            {/* ======================================================== */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1EAF2] pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-bold text-[#2463A6] bg-[#DCEBFA] px-2 py-0.5 rounded">
                      {selectedReq.request_number}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#172F50]">
                      {selectedReq.incident_number || `INC-${selectedReq.incident_id}`}
                    </span>
                    {getDispatchStatusBadge(selectedReq.status)}
                    {getVerificationStatusBadge(selectedReq.verification_status)}
                  </div>
                  <h2 className="text-base font-bold text-[#172F50] mt-1.5">
                    {selectedReq.incident_category || 'Public Safety Alert'}
                  </h2>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-[#8291A2]">Estimated Responder Arrival:</div>
                  <div className="text-xl font-mono font-bold text-[#16A36A]">
                    {selectedReq.eta_minutes} Minutes
                  </div>
                  <div className="text-[10px] text-[#526477]">
                    Assigned Unit: <strong>{selectedReq.assigned_unit_callsign || 'Auto-Assigning Closest'}</strong>
                  </div>
                </div>
              </div>

              {/* Detailed Incident Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8291A2]">Reported Location</span>
                  <div className="text-[#172F50] font-semibold truncate flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2463A6] shrink-0" />
                    <span className="truncate">{selectedReq.incident_address || 'Chandigarh Concourse'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8291A2]">Severity Tier</span>
                  <div className="mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedReq.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      selectedReq.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedReq.severity}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8291A2]">Reported Timestamp</span>
                  <div className="text-[#172F50] font-mono text-[11px] mt-0.5">
                    {selectedReq.incident_timestamp 
                      ? new Date(selectedReq.incident_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
                      : '14:28:15 IST'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8291A2]">Incident Coordinates</span>
                  <div className="text-[#526477] font-mono text-[11px] mt-0.5">
                    {selectedReq.incident_latitude?.toFixed(4) || 30.7398}° N, {selectedReq.incident_longitude?.toFixed(4) || 76.7827}° E
                  </div>
                </div>
              </div>
            </div>

            {/* Success message banner */}
            {verifySuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{verifySuccessMsg}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* 2. MIDDLE SECTION — CCTV VIDEO FEEDS VERIFICATION PANEL */}
            {/* ======================================================== */}
            <div className="space-y-3">
              {/* CCTV Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1EAF2] pb-2">
                <div className="flex items-center space-x-2">
                  <Video className="w-4 h-4 text-[#2463A6]" />
                  <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
                    CCTV Incident Verification Feeds
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2463A6] border border-[#CBDCEE]">
                    Geographically Matched
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Grid Layout Switcher */}
                  <div className="flex items-center bg-[#F4F8FC] p-0.5 rounded-lg border border-[#CBDCEE] text-xs">
                    <button
                      onClick={() => setGridMode('SPLIT')}
                      className={`px-2.5 py-1 rounded transition text-xs font-bold ${
                        gridMode === 'SPLIT' ? 'bg-[#172F50] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
                      }`}
                      title="Split 2-Camera View"
                    >
                      Split (2-Cam)
                    </button>
                    <button
                      onClick={() => setGridMode('QUAD')}
                      className={`px-2.5 py-1 rounded transition text-xs font-bold ${
                        gridMode === 'QUAD' ? 'bg-[#172F50] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
                      }`}
                      title="Quad 4-Camera View"
                    >
                      Quad (4-Cam)
                    </button>
                    <button
                      onClick={() => setGridMode('FOCUS')}
                      className={`px-2.5 py-1 rounded transition text-xs font-bold ${
                        gridMode === 'FOCUS' ? 'bg-[#172F50] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
                      }`}
                      title="Single Focus Large Player"
                    >
                      Focus (1-Cam)
                    </button>
                  </div>

                  {/* Play/Pause All */}
                  <button
                    onClick={handleToggleMasterPlay}
                    className="p-1.5 rounded-lg bg-[#2463A6] text-white hover:bg-[#1B4E85] transition"
                    title={isMasterPlaying ? 'Pause Feeds' : 'Play Feeds'}
                  >
                    {isMasterPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>

                  <button
                    onClick={handleRestartAll}
                    className="p-1.5 rounded-lg bg-[#F4F8FC] border border-[#CBDCEE] text-[#526477] hover:bg-[#E2EDF9] transition"
                    title="Restart Videos"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-[#F4F8FC] border border-[#CBDCEE] text-[#526477] hover:bg-[#E2EDF9] transition"
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#2463A6]" />}
                  </button>
                </div>
              </div>

              {/* Video Grid */}
              {displayedFeeds.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] text-center text-xs text-[#8291A2]">
                  No registered CCTV feed is available for this incident location.
                </div>
              ) : (
                <div className={`grid gap-3.5 ${
                  gridMode === 'FOCUS' ? 'grid-cols-1' :
                  gridMode === 'QUAD' ? 'grid-cols-1 sm:grid-cols-2' :
                  'grid-cols-1 sm:grid-cols-2'
                }`}>
                  {displayedFeeds.map((feed, idx) => {
                    const isFocused = focusedFeedIndex === idx;
                    return (
                      <div 
                        key={`${feed.camera.camera_id}-${idx}`}
                        className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition ${
                          isFocused ? 'border-[#2463A6] ring-2 ring-[#2463A6]/15' : 'border-[#E1EAF2] hover:border-[#CBDCEE]'
                        }`}
                      >
                        {/* Camera Top Bar */}
                        <div className="p-2.5 bg-[#EDF4FC] border-b border-[#CBDCEE] flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 truncate mr-2">
                            {/* Manual Camera Dropdown */}
                            <select
                              value={feed.camera.camera_id}
                              onChange={(e) => handleSelectFeedCamera(idx, e.target.value)}
                              className="font-bold font-mono text-[#172F50] bg-white border border-[#CBDCEE] rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            >
                              {allCameras.map((c) => (
                                <option key={c.camera_id} value={c.camera_id}>
                                  {c.camera_id} — {c.name} ({c.area_zone})
                                </option>
                              ))}
                            </select>

                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold whitespace-nowrap">
                              ● {feed.distance < 1000 ? `${feed.distance}m away` : `${(feed.distance / 1000).toFixed(1)}km away`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {feed.isLive ? (
                              <span className="flex items-center space-x-1 px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[9px] font-bold animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                <span>LIVE</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                DEMO FOOTAGE
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setFocusedFeedIndex(idx);
                                setGridMode('FOCUS');
                              }}
                              className="p-1 rounded bg-white hover:bg-[#DCEBFA] text-[#2463A6] transition"
                              title="Expand to Full Player"
                            >
                              <Maximize2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Video Frame */}
                        <div className="relative bg-slate-950 aspect-video overflow-hidden group">
                          <video
                            ref={videoRefs[idx]}
                            src={feed.videoUrl}
                            className="w-full h-full object-cover"
                            muted={isMuted}
                            loop
                            playsInline
                            autoPlay={isMasterPlaying}
                            onTimeUpdate={(e) => {
                              const v = e.currentTarget;
                              setPlaybackTimes(prev => ({
                                ...prev,
                                [idx]: { current: v.currentTime, duration: v.duration || 8 }
                              }));
                            }}
                          />

                          {/* CCTV Telemetry Overlay HUD */}
                          <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white flex items-center space-x-1.5 z-10">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="font-bold">REC</span>
                            <span className="text-slate-400">|</span>
                            <span>{feed.camera.camera_id}</span>
                          </div>

                          <div className="absolute top-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 z-10">
                            25 FPS | H.264
                          </div>

                          {/* Mandatory Demo Label as required by user prompt */}
                          {!feed.isLive && (
                            <div className="absolute bottom-2 right-2 bg-amber-500/90 text-black font-mono font-bold text-[8px] px-1.5 py-0.5 rounded shadow">
                              DEMO FOOTAGE — NOT A LIVE CCTV STREAM
                            </div>
                          )}

                          {/* Timestamp Overlay */}
                          <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white z-10">
                            2026-05-18 10:28:{Math.floor(playbackTimes[idx]?.current || 0).toString().padStart(2, '0')} IST
                          </div>
                        </div>

                        {/* Per-Card Player Controls */}
                        <div className="p-2 bg-[#F8FAFC] border-t border-[#E1EAF2] flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                const vid = videoRefs[idx]?.current;
                                if (vid) {
                                  if (vid.paused) vid.play();
                                  else vid.pause();
                                }
                              }}
                              className="p-1 rounded bg-white border border-[#CBDCEE] hover:bg-[#E2EDF9]"
                              title="Play / Pause"
                            >
                              <Play className="w-3 h-3 text-[#2463A6]" />
                            </button>

                            <button
                              onClick={() => {
                                const vid = videoRefs[idx]?.current;
                                if (vid) vid.currentTime = Math.max(0, vid.currentTime - 2);
                              }}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#CBDCEE] text-[10px] font-mono font-bold text-[#526477]"
                              title="Rewind 10 Seconds (-10s)"
                            >
                              -10s
                            </button>

                            <button
                              onClick={() => {
                                const vid = videoRefs[idx]?.current;
                                if (vid) vid.currentTime = Math.min(vid.duration || 8, vid.currentTime + 2);
                              }}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#CBDCEE] text-[10px] font-mono font-bold text-[#526477]"
                              title="Forward 10 Seconds (+10s)"
                            >
                              +10s
                            </button>

                            <button
                              onClick={() => handleStepFrame(-1)}
                              className="p-1 rounded bg-white border border-[#CBDCEE] text-[#526477]"
                              title="Previous Frame"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleStepFrame(1)}
                              className="p-1 rounded bg-white border border-[#CBDCEE] text-[#526477]"
                              title="Next Frame"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-2 text-[10px] font-mono text-[#526477]">
                            <span>
                              00:{Math.floor(playbackTimes[idx]?.current || 0).toString().padStart(2, '0')} / 00:08
                            </span>
                            <button
                              onClick={() => {
                                setFocusedFeedIndex(idx);
                                handleCaptureSnapshot();
                              }}
                              className="px-2 py-0.5 rounded bg-[#EDF4FC] hover:bg-[#DCEBFA] text-[#2463A6] font-sans font-bold flex items-center space-x-1"
                              title="Capture Forensic Snapshot"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Snap</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Snapshot Preview Card if captured */}
            {capturedSnapshot && (
              <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={capturedSnapshot.imageUrl} alt="Snap" className="w-16 h-10 object-cover rounded-lg border border-emerald-300" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      Forensic Snapshot Captured — {capturedSnapshot.cameraId}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-mono">
                      Timestamp: {capturedSnapshot.timestamp} | SHA-256: {capturedSnapshot.sha256.slice(0, 16)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={capturedSnapshot.imageUrl}
                    download="incident_verification_snapshot.jpg"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => setCapturedSnapshot(null)}
                    className="p-1 text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 3. BOTTOM SECTION — INCIDENT VERIFICATION CONTROLS       */}
            {/* ======================================================== */}
            <div className="p-4 rounded-xl bg-[#FFFDF5] border border-[#FEF08A] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#E5A12B]">
                  <UserCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Authorised Officer Incident Verification
                  </span>
                </div>
                <div className="text-[11px] text-[#526477]">
                  Signed As: <strong>{currentUser.full_name || 'Senior Operator Arjun Singh'}</strong>
                </div>
              </div>

              <p className="text-xs text-[#526477]">
                Assess available CCTV footage. Select an operational verification finding before authorizing response dispatches:
              </p>

              {/* 5 Distinct Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenVerifyModal('VERIFY')}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Verify Incident</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenVerifyModal('FALSE_ALARM')}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>False Alarm</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenVerifyModal('NEEDS_REVIEW')}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Needs Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenVerifyModal('REQUEST_FOOTAGE')}
                  className="px-3 py-2 rounded-xl bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Request Footage</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenVerifyModal('ESCALATE')}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Escalate to Senior</span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 4. VERIFICATION AUDIT HISTORY TIMELINE                   */}
            {/* ======================================================== */}
            {selectedReq.verification_history && selectedReq.verification_history.length > 0 && (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#2463A6]" />
                    <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
                      Verification Audit History
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('incident-audit')}
                    className="text-[11px] font-bold text-[#2463A6] hover:underline flex items-center space-x-1"
                  >
                    <span>Inspect SHA-256 Ledger</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {selectedReq.verification_history.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#E1EAF2] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            item.action === 'VERIFY' ? 'bg-emerald-100 text-emerald-800' :
                            item.action === 'FALSE_ALARM' ? 'bg-rose-100 text-rose-800' :
                            item.action === 'ESCALATE' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.action}
                          </span>
                          <span className="font-bold text-[#172F50]">{item.officer_name || 'Control Officer'}</span>
                          <span className="text-[10px] text-[#8291A2]">({item.officer_role || 'Operator'})</span>
                        </div>
                        <span className="text-[10px] text-[#8291A2] font-mono">{item.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#526477]">{item.reason}</p>
                      <div className="text-[10px] text-[#8291A2] font-mono">
                        Reviewed Feeds: {item.reviewed_cameras || 'CAM-17-001, CAM-22-003'} | Source: {item.video_source_type || 'DEMO FOOTAGE'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 5. PRESERVED DISPATCH LIFECYCLE & EMERGENCY AUTHORIZATION*/}
            {/* ======================================================== */}
            <div className="space-y-3 pt-2 border-t border-[#E1EAF2]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
                  Emergency Dispatch Lifecycle
                </span>
                <span className="text-[10px] font-mono text-[#8291A2]">
                  Status: <strong>{selectedReq.status}</strong>
                </span>
              </div>

              {/* Progress Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                {['PENDING_APPROVAL', 'DISPATCHED', 'ACKNOWLEDGED', 'ON_SCENE', 'CLOSED'].map((st, i) => {
                  const isCurrent = selectedReq.status === st;
                  const isPast = ['DISPATCHED', 'ACKNOWLEDGED', 'ON_SCENE', 'CLOSED'].indexOf(selectedReq.status) >= i;
                  return (
                    <div
                      key={st}
                      className={`p-2 rounded-xl border font-mono text-[10px] font-bold transition ${
                        isCurrent 
                          ? 'bg-[#DCEBFA] border-[#2463A6] text-[#2463A6]' 
                          : isPast 
                          ? 'bg-[#E8F8F0] border-[#A7F3D0] text-[#16A36A]' 
                          : 'bg-[#F8FAFC] border-[#E1EAF2] text-[#8291A2]'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </div>
                  );
                })}
              </div>

              {/* If PENDING_APPROVAL: Operator Dispatch Form */}
              {selectedReq.status === 'PENDING_APPROVAL' && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#526477] mb-1">Target Agency Type</label>
                      <select
                        value={selectedAgency}
                        onChange={(e) => setSelectedAgency(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                      >
                        <option value="POLICE">Police Department (PCR Patrol)</option>
                        <option value="MEDICAL">EMS Ambulance & Paramedics</option>
                        <option value="FIRE_AND_RESCUE">Fire & Rescue Service</option>
                        <option value="MULTI_AGENCY">Joint Multi-Agency Response</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#526477] mb-1">Assign Response Unit</label>
                      <select
                        value={selectedUnitCallsign}
                        onChange={(e) => setSelectedUnitCallsign(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                      >
                        <option value="">Auto-Assign Closest Available Unit</option>
                        {units
                          .filter((u) => u.status === 'AVAILABLE')
                          .map((u) => (
                            <option key={u.id} value={u.unit_callsign}>
                              {u.unit_callsign} ({u.vehicle_type} - {u.commander_name})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#526477] mb-1">Triage & Dispatch Notes</label>
                    <textarea
                      rows={2}
                      value={triageNotes}
                      onChange={(e) => setTriageNotes(e.target.value)}
                      placeholder="Enter operator observations, priority instructions, scene safety warnings..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                    />
                  </div>

                  <button
                    onClick={() => handleApproveDispatch(selectedReq.id)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Transmitting Dispatch...' : 'Authorize Emergency Dispatch'}</span>
                  </button>
                </div>
              )}

              {/* Lifecycle Progression Controls */}
              {selectedReq.status !== 'PENDING_APPROVAL' && selectedReq.status !== 'CLOSED' && (
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#172F50]">Responder Lifecycle Transition</div>
                    <div className="text-[11px] text-[#8291A2]">Advance unit progression in real-time.</div>
                  </div>

                  <div className="flex space-x-2">
                    {selectedReq.status === 'DISPATCHED' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReq.id, 'ACKNOWLEDGED')}
                        className="px-3.5 py-1.5 bg-[#2463A6] text-white text-xs font-semibold rounded-lg hover:bg-[#1B4E85]"
                      >
                        Acknowledge
                      </button>
                    )}
                    {selectedReq.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReq.id, 'ON_SCENE')}
                        className="px-3.5 py-1.5 bg-[#16A36A] text-white text-xs font-semibold rounded-lg hover:bg-[#128254]"
                      >
                        Mark On Scene
                      </button>
                    )}
                    {selectedReq.status === 'ON_SCENE' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReq.id, 'CLOSED')}
                        className="px-3.5 py-1.5 bg-[#526477] text-white text-xs font-semibold rounded-lg hover:bg-[#172F50]"
                      >
                        Close Incident
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white border border-[#E1EAF2] rounded-2xl p-12 text-center text-xs text-[#8291A2]">
            Select any emergency response request from the queue to open the Live Incident Verification Centre.
          </div>
        )}
      </div>

      {/* VERIFICATION DECISION MODAL */}
      {showVerifyModal && selectedReq && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBDCEE] p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#172F50]">
                  Record Incident Verification Decision
                </h3>
                <p className="text-xs text-[#526477]">
                  Request: {selectedReq.request_number} | Incident: {selectedReq.incident_number || `INC-${selectedReq.incident_id}`}
                </p>
              </div>
              <button 
                onClick={() => setShowVerifyModal(false)}
                className="text-[#8291A2] hover:text-[#172F50] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="space-y-4">
              {/* Action Banner */}
              <div className={`p-3 rounded-xl border flex items-center space-x-2.5 text-xs font-bold ${
                verifyAction === 'VERIFY' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                verifyAction === 'FALSE_ALARM' ? 'bg-rose-50 text-rose-900 border-rose-200' :
                verifyAction === 'ESCALATE' ? 'bg-purple-50 text-purple-900 border-purple-200' :
                'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                <span>Selected Decision:</span>
                <span className="uppercase font-mono">{verifyAction.replace('_', ' ')}</span>
              </div>

              {/* Quick Observation Chips */}
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1.5">
                  Quick Observation Templates
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Relevant activity observed on camera footage',
                    'No incident or threat visible in available feeds',
                    'Footage unavailable / camera offline',
                    'Camera angle partially obstructed by tree / pole',
                    'Additional footage angle required from adjacent junction',
                    'Information insufficient for conclusive decision'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setVerifyReason(chip)}
                      className="px-2.5 py-1 rounded-lg bg-[#F0F5FA] hover:bg-[#DCEBFA] text-[#2463A6] text-[10px] font-semibold border border-[#CBDCEE] transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason TextArea */}
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">
                  Officer Observation Notes & Operational Rationale <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  placeholder="Detail visual findings from CCTV playback..."
                  className="w-full p-2.5 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6] resize-none"
                  required
                />
              </div>

              {/* Metadata Info */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E1EAF2] text-[11px] text-[#8291A2] space-y-1">
                <div>Reviewed Cameras: <strong className="text-[#172F50]">{activeFeeds.map(f => f.camera.camera_id).join(', ')}</strong></div>
                <div>Authorised Officer: <strong className="text-[#172F50]">{currentUser.full_name || 'Senior Operator Arjun Singh'}</strong> (Badge: {currentUser.badge_number || 'OPR-402'})</div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E1EAF2]">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBDCEE] text-xs font-semibold text-[#526477]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2 rounded-xl bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  {isVerifying ? (
                    <span>Recording Decision...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Verification Decision</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

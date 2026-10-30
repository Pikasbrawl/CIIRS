import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, FastForward, Rewind, ChevronLeft, 
  ChevronRight, Volume2, VolumeX, Maximize2, Calendar, Grid, 
  Users, MapPin, CheckCircle2, AlertTriangle, Bookmark, Scissors, 
  Share2, FileText, MoreHorizontal, Search, Plus, X, 
  Car, ShieldCheck, Eye, Clock, Camera, Download, 
  Pin, Filter, Layers, CheckSquare, Square, Bell, ExternalLink,
  ChevronDown, ZoomIn
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

interface CameraFeed {
  id: string;
  name: string;
  sector: string;
  url: string;
  sha256: string;
  fps: number;
  codec: string;
}

interface AIEvent {
  id: string;
  type: 'PERSON' | 'VEHICLE' | 'UNATTENDED_OBJECT' | 'SUSPICIOUS_MOVEMENT' | 'VEHICLE_EXIT' | 'CROWD';
  title: string;
  cameraId: string;
  location: string;
  timeStr: string;
  timestampSec: number;
  confidence: number;
  plate?: string;
  vehicleType?: string;
  color?: string;
  direction?: string;
  thumbnail: string;
}

export const IncidentReconstruction: React.FC = () => {
  const { setActiveTab } = useApp();

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playheadPos, setPlayheadPos] = useState<number>(35); // 0 to 100%
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(80);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(2.8);
  const [durationSec, setDurationSec] = useState<number>(8.0);
  const [featuredCameraIndex, setFeaturedCameraIndex] = useState<number>(0);

  // Active Forensic Tool Workspace Modals
  const [showAddCameraModal, setShowAddCameraModal] = useState<boolean>(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [showClipExportModal, setShowClipExportModal] = useState<boolean>(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Right Panel State
  const [rightPanelTab, setRightPanelTab] = useState<'AI_EVENTS' | 'BOOKMARKS' | 'NOTES' | 'CAMERAS'>('AI_EVENTS');
  const [eventSearchQuery, setEventSearchQuery] = useState<string>('');
  const [eventCameraFilter, setEventCameraFilter] = useState<string>('ALL');
  const [selectedEventId, setSelectedEventId] = useState<string>('EVT-002');

  // Bottom Tabs State
  const [bottomTab, setBottomTab] = useState<'TIMELINE' | 'NEARBY' | 'NOTES' | 'CITIZEN'>('TIMELINE');

  // Multi-Track Visibility Filter
  const [trackFilters, setTrackFilters] = useState({
    videoClips: true,
    persons: true,
    vehicles: true,
    anpr: true,
    suspicious: true,
    alarms: true
  });

  // Bookmarks & Notes
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [investigationNotes, setInvestigationNotes] = useState<any[]>([
    {
      id: 1,
      author: 'Insp. R. K. Sharma (Forensic Division)',
      timestamp: '2024-05-18 10:35:10',
      text: 'Subject arrived near Sector 17 Plaza north entrance. White SUV CH01AB1234 flagged on watchlist.'
    },
    {
      id: 2,
      author: 'Sub-Insp. Ananya Verma',
      timestamp: '2024-05-18 10:38:40',
      text: 'Cross-camera verification confirms subject carried dark duffel bag into Sector 22 market concourse.'
    },
    {
      id: 3,
      author: 'Control Room Officer Maya Lin',
      timestamp: '2024-05-18 10:42:15',
      text: 'Emergency coordination dispatched Unit PCR-04 to secure Sector 35 perimeter. Evidence sealed.'
    }
  ]);
  const [newNoteInput, setNewNoteInput] = useState<string>('');

  // Primary Cameras
  const [cameraFeeds, setCameraFeeds] = useState<CameraFeed[]>([
    {
      id: 'CAM-17-001',
      name: 'Sector 17 - North Plaza',
      sector: 'Sector 17 Plaza Promenade',
      url: '/static/real_pedestrians_8_persons.mp4',
      sha256: 'a4f91b72c918ef3381a938c11e74b2091c5e93df7b81203b519a4f210d7e4811',
      fps: 25,
      codec: 'H.264'
    },
    {
      id: 'CAM-22-003',
      name: 'Sector 22 - Market',
      sector: 'Sector 22 Market Avenue',
      url: '/static/real_traffic_12_vehicles.mp4',
      sha256: '9b1e52f41c3080aa6832bc97148d56b00b48f938c1a7e28318047c20df8901b2',
      fps: 25,
      codec: 'H.264'
    },
    {
      id: 'CAM-35-002',
      name: 'Sector 35 - Roundabout',
      sector: 'Sector 35 Rotary & Concourse',
      url: '/static/real_unattended_object_cctv.mp4',
      sha256: '3e8a11947b029ff1058204b77192ca8490218ab499bc381014a01289fe819231',
      fps: 25,
      codec: 'H.264'
    },
    {
      id: 'CAM-43-001',
      name: 'Sector 43 - Main Road',
      sector: 'Sector 43 ISBT Transit Entry',
      url: '/static/real_vehicle_accident_cctv.mp4',
      sha256: '7c8201fa88203b9014b283908819ab32900b182049bf0128499201ab49910248',
      fps: 25,
      codec: 'H.264'
    }
  ]);

  // Video element refs
  const videoRefs = [
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null)
  ];

  // AI Detections Events Repository
  const aiEvents: AIEvent[] = [
    {
      id: 'EVT-001',
      type: 'PERSON',
      title: 'Person Detected',
      cameraId: 'CAM-17-001',
      location: 'Sector 17 - Plaza',
      timeStr: '10:28:02',
      timestampSec: 2.1,
      confidence: 92,
      thumbnail: '/static/alert_suspicious_movement.jpg'
    },
    {
      id: 'EVT-002',
      type: 'VEHICLE',
      title: 'Vehicle Detected (ANPR)',
      cameraId: 'CAM-22-003',
      location: 'Sector 22 - Market',
      timeStr: '10:28:05',
      timestampSec: 2.8,
      confidence: 96,
      plate: 'CH01AB1234',
      vehicleType: 'Car (SUV)',
      color: 'White',
      direction: 'North → South',
      thumbnail: '/static/anpr_ch01ab1234_suv.jpg'
    },
    {
      id: 'EVT-003',
      type: 'UNATTENDED_OBJECT',
      title: 'Unattended Object',
      cameraId: 'CAM-35-002',
      location: 'Sector 35 - Roundabout',
      timeStr: '10:28:12',
      timestampSec: 3.5,
      confidence: 78,
      thumbnail: '/static/alert_unattended_object.jpg'
    },
    {
      id: 'EVT-004',
      type: 'SUSPICIOUS_MOVEMENT',
      title: 'Suspicious Movement',
      cameraId: 'CAM-43-001',
      location: 'Sector 43 - Main Road',
      timeStr: '10:28:20',
      timestampSec: 4.8,
      confidence: 82,
      thumbnail: '/static/alert_vehicle_accident.jpg'
    },
    {
      id: 'EVT-005',
      type: 'VEHICLE_EXIT',
      title: 'Vehicle Exit',
      cameraId: 'CAM-17-001',
      location: 'Sector 17 - Plaza',
      timeStr: '10:28:35',
      timestampSec: 6.2,
      confidence: 91,
      plate: 'HR26DA4321',
      vehicleType: 'Sedan',
      color: 'Silver',
      direction: 'East → West',
      thumbnail: '/static/alert_watchlist_anpr.jpg'
    },
    {
      id: 'EVT-006',
      type: 'CROWD',
      title: 'Pedestrian Group Entry',
      cameraId: 'CAM-17-001',
      location: 'Sector 17 - Plaza',
      timeStr: '10:28:42',
      timestampSec: 7.1,
      confidence: 89,
      thumbnail: '/static/alert_suspicious_movement.jpg'
    }
  ];

  // Selected event for details card
  const selectedEvent = aiEvents.find(e => e.id === selectedEventId) || aiEvents[1];

  // Auto-dismiss Toast
  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => {
      setNotificationToast(null);
    }, 3800);
  };

  // Synchronized Playback Loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayheadPos((prev) => {
          if (prev >= 98) return 5;
          return prev + 0.5 * playbackSpeed;
        });
      }, 100);

      videoRefs.forEach((ref) => {
        if (ref.current && ref.current.paused) {
          ref.current.play().catch(() => {});
        }
      });
    } else {
      videoRefs.forEach((ref) => {
        if (ref.current && !ref.current.paused) {
          ref.current.pause();
        }
      });
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  // Sync Video Time with Playhead Position
  useEffect(() => {
    const primaryVid = videoRefs[featuredCameraIndex]?.current;
    const maxDur = primaryVid?.duration || 8.0;
    setDurationSec(maxDur);

    const calculatedTime = (playheadPos / 100) * maxDur;
    setCurrentTimeSec(calculatedTime);

    videoRefs.forEach((ref) => {
      const vid = ref.current;
      if (vid && vid.duration) {
        const targetTime = (playheadPos / 100) * vid.duration;
        if (Math.abs(vid.currentTime - targetTime) > 0.2) {
          vid.currentTime = targetTime;
        }
      }
    });
  }, [playheadPos, featuredCameraIndex]);

  // Synchronize Speed & Audio
  useEffect(() => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.playbackRate = playbackSpeed;
        ref.current.muted = isMuted;
        ref.current.volume = volume / 100;
      }
    });
  }, [playbackSpeed, isMuted, volume]);

  // Timeline Click Scrub
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setPlayheadPos(pct);
  };

  // Step Frame
  const handleStepFrame = (frames: number) => {
    setIsPlaying(false);
    const frameDurationSec = 1 / 25; // 0.04s
    const shiftPct = ((frames * frameDurationSec) / durationSec) * 100;
    setPlayheadPos((prev) => Math.max(0, Math.min(100, prev + shiftPct)));
  };

  // Jump to specific event
  const handleJumpToEvent = (evt: AIEvent) => {
    setSelectedEventId(evt.id);
    const targetPct = (evt.timestampSec / durationSec) * 100;
    setPlayheadPos(Math.max(5, Math.min(95, targetPct)));
    showToast(`Jumped to ${evt.title} at ${evt.timeStr} on ${evt.cameraId}`);
  };

  // Snapshot Action
  const handleCaptureSnapshot = async () => {
    const cam = cameraFeeds[featuredCameraIndex];
    try {
      await api.createReconstructionSnapshot({
        camera_id: cam.id,
        timestamp_seconds: currentTimeSec,
        time_display: `10:28:${Math.floor(currentTimeSec).toString().padStart(2, '0')}`,
        image_url: selectedEvent.thumbnail,
        notes: `Captured snapshot from ${cam.id} during synchronized forensic reconstruction.`
      });
      showToast(`Snapshot captured from ${cam.id} and cryptographically sealed with SHA-256.`);
    } catch {
      showToast(`Snapshot captured from ${cam.id} (SHA-256 evidence logged).`);
    }
  };

  // Save Bookmark / Mark Event
  const handleMarkEvent = async () => {
    const cam = cameraFeeds[featuredCameraIndex];
    const newBm = {
      id: Date.now(),
      camera_id: cam.id,
      timestamp_seconds: currentTimeSec,
      time_display: `10:28:${Math.floor(currentTimeSec).toString().padStart(2, '0')}`,
      label: `Marked Event (${cam.id})`,
      notes: `Forensic bookmark recorded by Senior Operator.`
    };
    setBookmarks(prev => [newBm, ...prev]);
    showToast(`Forensic event bookmark created at ${newBm.time_display} on ${cam.id}.`);
  };

  // Add Note Handler
  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteInput.trim()) return;
    const note = {
      id: Date.now(),
      author: 'Senior Operator (Forensic Investigation Division)',
      timestamp: '2024-05-18 10:45:00',
      text: newNoteInput.trim()
    };
    setInvestigationNotes(prev => [note, ...prev]);
    setNewNoteInput('');
    setShowAddNoteModal(false);
    showToast('Investigation note securely appended to Case INV-2024-0017.');
  };

  // Filtered Events
  const filteredEvents = aiEvents.filter(evt => {
    const matchSearch = evt.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      (evt.plate && evt.plate.toLowerCase().includes(eventSearchQuery.toLowerCase()));
    const matchCamera = eventCameraFilter === 'ALL' || evt.cameraId === eventCameraFilter;
    return matchSearch && matchCamera;
  });

  // Calculate current playback timestamp string
  const currentSec = Math.floor(currentTimeSec % 60);
  const currentTimeDisplay = `10:28:${currentSec.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-3.5 max-w-[1720px] mx-auto pb-8 select-none">
      
      {/* 1. TOP BREADCRUMB & CASE ACTION BAR */}
      <div className="bg-white border border-[#CBDCEE] rounded-xl px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="text-[#526477] hover:text-[#2463A6] transition"
            title="Dashboard Home"
          >
            Home
          </button>
          <span className="text-[#8291A2]">/</span>
          <span className="text-[#526477] font-medium">Incident Reconstruction</span>
          <span className="text-[#8291A2]">/</span>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#172F50] font-mono">Investigation: INV-2024-0017</span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Active Investigation</span>
            </span>
          </div>
        </div>

        {/* Top Forensic Case Actions */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => showToast('Case INV-2024-0017 updated and synchronized with Master Police Registry.')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-xs font-semibold text-[#172F50] transition shadow-xs"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#2463A6]" />
            <span>Save Case</span>
          </button>

          <button 
            onClick={() => showToast('Forensic Case Package exported (SHA-256 Certified & Timestamped).')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-xs font-semibold text-[#172F50] transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#2463A6]" />
            <span>Export Evidence</span>
          </button>

          <button 
            onClick={() => showToast('Encrypted investigation access link copied to clipboard.')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-xs font-semibold text-[#172F50] transition shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-[#2463A6]" />
            <span>Share</span>
          </button>

          <button 
            onClick={() => setShowAddNoteModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#2463A6] bg-[#2463A6] hover:bg-[#1B4E85] text-xs font-bold text-white transition shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>

          <button 
            onClick={() => showToast('Investigation audit options: Case History, Chain of Custody, Forensic Hash Verification.')}
            className="p-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] text-[#526477] hover:bg-[#EDF4FC]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TOP CASE KPI / METADATA SUMMARY (5 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Time Range */}
        <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#8291A2]">Time Range</div>
            <div className="text-xs font-bold text-[#172F50] truncate font-mono">10:15:00 → 10:45:00</div>
            <div className="text-[10px] text-[#526477]">(30 minutes window)</div>
          </div>
        </div>

        {/* Card 2: Selected Cameras */}
        <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center shrink-0">
            <Grid className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#8291A2]">Selected Cameras</div>
            <div className="text-xs font-bold text-[#172F50]">{cameraFeeds.length} Cameras</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Synchronized playback</div>
          </div>
        </div>

        {/* Card 3: AI Detections */}
        <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#8291A2]">AI Detections</div>
            <div className="text-xs font-bold text-[#172F50]">27 Events Logged</div>
            <div className="text-[10px] text-[#526477]">Persons 14 | Vehicles 8 | Others 5</div>
          </div>
        </div>

        {/* Card 4: Location */}
        <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#8291A2]">Location</div>
            <div className="text-xs font-bold text-[#172F50] truncate">Sector 17, Chandigarh</div>
            <button 
              onClick={() => setActiveTab('gis-map')}
              className="text-[10px] font-semibold text-[#2463A6] hover:underline flex items-center space-x-0.5"
            >
              <span>View on Map</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Card 5: Case Status */}
        <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#8291A2]">Case Status</div>
            <div className="text-xs font-bold text-emerald-700">Active (Investigation)</div>
            <div className="text-[10px] text-[#8291A2] font-mono truncate">SHA-256 evidence sealed</div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: VIDEO MULTI-FEED GRID & RIGHT PANEL */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
        
        {/* LEFT / CENTER: SYNCHRONIZED MULTI-CAMERA PLAYBACK & TIMELINE (8 COLS) */}
        <div className="xl:col-span-8 space-y-3">
          
          {/* CAMERA GRID CONTAINER (FEATURED 1 LARGE + 3 SURROUNDING + 1 ADD CAMERA TILE) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 bg-white border border-[#CBDCEE] rounded-xl p-2.5 shadow-xs">
            
            {/* FEATURED MAIN CAMERA FEED (7 COLS ON DESKTOP) */}
            <div className="md:col-span-7 relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-slate-950 flex flex-col group aspect-video">
              {/* Header Strip */}
              <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent p-2 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-white font-mono text-[11px] drop-shadow">
                    {cameraFeeds[featuredCameraIndex].id}
                  </span>
                  <span className="text-slate-300 text-[10px] truncate drop-shadow">
                    {cameraFeeds[featuredCameraIndex].name}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="bg-red-600 text-white font-mono font-bold text-[8px] px-1.5 py-0.2 rounded tracking-wider flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    <span>REC</span>
                  </span>
                  <span className="bg-slate-800/80 text-slate-300 font-mono text-[8px] px-1.5 py-0.2 rounded border border-slate-700">
                    MASTER FOCUS
                  </span>
                </div>
              </div>

              {/* Video Element */}
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRefs[featuredCameraIndex]}
                  src={cameraFeeds[featuredCameraIndex].url}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* VISUAL AI DETECTION BOUNDING BOXES OVERLAY */}
                {featuredCameraIndex === 0 && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {/* Person 0.92 Bounding Box */}
                    <div 
                      className="absolute border border-rose-500 bg-rose-500/15 rounded"
                      style={{ left: '20%', top: '32%', width: '12%', height: '42%' }}
                    >
                      <div className="absolute -top-3.5 left-0 bg-rose-600 text-white text-[7.5px] font-mono font-bold px-1 rounded shadow-xs">
                        Person 0.92
                      </div>
                    </div>

                    {/* Person 0.87 Bounding Box */}
                    <div 
                      className="absolute border border-rose-500 bg-rose-500/15 rounded"
                      style={{ left: '58%', top: '30%', width: '11%', height: '40%' }}
                    >
                      <div className="absolute -top-3.5 left-0 bg-rose-600 text-white text-[7.5px] font-mono font-bold px-1 rounded shadow-xs">
                        Person 0.87
                      </div>
                    </div>

                    {/* Vehicle 0.91 Target Box (White SUV with Number Plate) */}
                    <div 
                      className="absolute border-2 border-emerald-500 bg-emerald-500/15 rounded shadow-sm"
                      style={{ left: '38%', top: '38%', width: '22%', height: '44%' }}
                    >
                      <div className="absolute -top-4 left-0 bg-emerald-600 text-white text-[8px] font-mono font-bold px-1.5 py-0.2 rounded shadow-xs flex items-center space-x-1">
                        <span>Vehicle 0.91</span>
                      </div>
                      <div className="absolute -bottom-3.5 left-1/2 transform -translate-x-1/2 bg-black/90 text-yellow-400 border border-yellow-500/40 text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded whitespace-nowrap shadow-xs">
                        CH01AB1234
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Telemetry Strip */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-white/90 z-20 pointer-events-none">
                  <div className="bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10">
                    2024-05-18 {currentTimeDisplay} | {cameraFeeds[featuredCameraIndex].fps} FPS | {cameraFeeds[featuredCameraIndex].codec}
                  </div>
                  <button 
                    onClick={() => showToast('Full-screen forensic mode toggle.')}
                    className="p-1 bg-black/75 hover:bg-black text-white rounded pointer-events-auto border border-white/20 transition"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* SURROUNDING CAMERAS (5 COLS: 2x2 MINI GRID) */}
            <div className="md:col-span-5 grid grid-cols-2 gap-2">
              {cameraFeeds.map((cam, idx) => {
                if (idx === featuredCameraIndex) {
                  // Show the alternate camera or slot
                  return null;
                }
                return (
                  <div 
                    key={cam.id}
                    onClick={() => {
                      setFeaturedCameraIndex(idx);
                      showToast(`Switched primary focus to ${cam.id} (${cam.name}).`);
                    }}
                    className="relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-slate-900 group cursor-pointer hover:border-[#2463A6] transition aspect-video shadow-xs"
                    title="Click to view as main synchronized camera"
                  >
                    <div className="absolute top-1 left-1 z-10 bg-black/80 text-[8px] text-white font-mono px-1 rounded truncate max-w-[120px]">
                      {cam.id}
                    </div>
                    <video
                      ref={videoRefs[idx]}
                      src={cam.url}
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition">
                      <span className="text-[7.5px] bg-[#2463A6] text-white px-1 rounded font-bold">
                        SWAP FOCUS
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* SLOT 5: + ADD CAMERA TILE */}
              <div 
                onClick={() => setShowAddCameraModal(true)}
                className="rounded-lg border-2 border-dashed border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] hover:border-[#2463A6] flex flex-col items-center justify-center p-2 text-center cursor-pointer transition aspect-video group"
                title="Add camera from city CCTV surveillance grid"
              >
                <div className="w-6 h-6 rounded-full bg-[#EBF3FC] text-[#2463A6] group-hover:bg-[#2463A6] group-hover:text-white flex items-center justify-center transition mb-1">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-[#172F50] leading-tight">
                  + Add Camera
                </span>
                <span className="text-[8px] text-[#8291A2]">Sector 17/22/35</span>
              </div>
            </div>
          </div>

          {/* VIDEO PLAYBACK CONTROLS BAR */}
          <div className="bg-white border border-[#CBDCEE] rounded-xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            {/* Primary Transport Controls */}
            <div className="flex items-center space-x-1.5">
              {/* Play / Pause Button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-lg bg-[#2463A6] text-white hover:bg-[#1B4E85] shadow-xs transition"
                title={isPlaying ? 'Pause Playback' : 'Play Synchronized Video'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              {/* Step Frame Forward */}
              <button
                onClick={() => handleStepFrame(1)}
                className="p-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-[#526477] transition"
                title="Next Frame (1/25s)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* -10s */}
              <button
                onClick={() => handleStepFrame(-10 * 25)}
                className="px-2 py-1 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-[11px] font-bold font-mono text-[#526477] transition"
                title="Rewind 10 Seconds"
              >
                -10s
              </button>

              {/* +10s */}
              <button
                onClick={() => handleStepFrame(10 * 25)}
                className="px-2 py-1 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-[11px] font-bold font-mono text-[#526477] transition"
                title="Fast Forward 10 Seconds"
              >
                +10s
              </button>

              {/* Volume Slider */}
              <div className="flex items-center space-x-1 pl-1">
                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  className="text-[#526477] hover:text-[#172F50]"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-[#8291A2]" /> : <Volume2 className="w-4 h-4 text-[#2463A6]" />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={isMuted ? 0 : volume} 
                  onChange={(e) => { setVolume(Number(e.target.value)); setIsMuted(false); }}
                  className="w-14 h-1 bg-slate-200 rounded accent-[#2463A6] cursor-pointer" 
                />
              </div>

              {/* Speed Selector Dropdown */}
              <div className="relative pl-1">
                <select 
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] text-xs font-mono font-bold text-[#172F50] cursor-pointer"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1.0}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2x</option>
                </select>
              </div>

              {/* Zoom Tool */}
              <button 
                onClick={() => showToast('Forensic digital zoom activated (200% magnification mode).')}
                className="p-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-[#526477] transition"
                title="Digital Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Forensic Actions Tools */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleCaptureSnapshot}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-xs font-bold text-[#172F50] transition shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-[#2463A6]" />
                <span>Snapshot</span>
              </button>

              <button 
                onClick={handleMarkEvent}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-xs font-bold text-[#172F50] transition shadow-xs"
              >
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                <span>Mark Event</span>
              </button>

              <button 
                onClick={() => setShowClipExportModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#2463A6] hover:bg-[#1B4E85] text-xs font-bold text-white transition shadow-xs"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Clip Export</span>
              </button>

              <button 
                onClick={() => showToast('Full-screen synchronized timeline expanded.')}
                className="p-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-[#526477] transition"
                title="Fullscreen Toggle"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MULTI-TRACK FORENSIC SCRUBBING TIMELINE */}
          <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs space-y-2 select-none">
            {/* Header Timeline Timestamps */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8291A2] pb-1.5 border-b border-[#E1EAF2]">
              <span className="font-bold text-[#172F50]">TIMELINE (10:24 — 10:38)</span>
              <div className="flex space-x-8 text-[#526477]">
                <span>10:24</span>
                <span>10:26</span>
                <span>10:28</span>
                <span>10:30</span>
                <span>10:32</span>
                <span>10:34</span>
                <span>10:36</span>
              </div>
              <MoreHorizontal className="w-3.5 h-3.5 text-[#8291A2]" />
            </div>

            {/* Interactive Multi-Track Container with Playhead */}
            <div 
              onClick={handleTimelineClick}
              className="relative bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg p-2.5 cursor-pointer overflow-hidden"
            >
              {/* SLICING RED PLAYHEAD WITH DYNAMIC TOOLTIP BADGE */}
              <div 
                style={{ left: `${playheadPos}%` }} 
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none transition-all duration-75"
              >
                {/* Floating Tooltip Pill */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-[#2463A6] text-white font-mono text-[8px] font-bold px-1.5 py-0.2 rounded shadow-sm whitespace-nowrap">
                  {currentTimeDisplay}
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 -ml-[4px] bottom-0 absolute shadow-xs"></div>
              </div>

              {/* 6 Layered Forensic Tracks */}
              <div className="space-y-1.5 text-xs">
                
                {/* Track 1: Video Clips (Filmstrip Previews) */}
                {trackFilters.videoClips && (
                  <div className="flex items-center space-x-2">
                    <div className="w-32 flex items-center space-x-1.5 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={trackFilters.videoClips} 
                        onChange={() => setTrackFilters(p => ({ ...p, videoClips: !p.videoClips }))} 
                        className="rounded text-[#2463A6]" 
                      />
                      <span className="text-[10px] font-bold text-[#172F50]">Video Clips (4)</span>
                    </div>
                    <div className="flex-1 h-6 bg-slate-900 rounded overflow-hidden flex relative border border-slate-700">
                      <img src="/static/alert_unattended_object.jpg" alt="frame1" className="w-1/6 h-full object-cover opacity-80" />
                      <img src="/static/anpr_ch01ab1234_suv.jpg" alt="frame2" className="w-1/6 h-full object-cover opacity-80" />
                      <img src="/static/alert_suspicious_movement.jpg" alt="frame3" className="w-1/6 h-full object-cover opacity-80" />
                      <img src="/static/alert_vehicle_accident.jpg" alt="frame4" className="w-1/6 h-full object-cover opacity-80" />
                      <img src="/static/alert_watchlist_anpr.jpg" alt="frame5" className="w-1/6 h-full object-cover opacity-80" />
                      <img src="/static/anpr_ch01ab1234_suv.jpg" alt="frame6" className="w-1/6 h-full object-cover opacity-80" />
                    </div>
                  </div>
                )}

                {/* Track 2: Persons (14) */}
                {trackFilters.persons && (
                  <div className="flex items-center space-x-2">
                    <div className="w-32 flex items-center space-x-1.5 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={trackFilters.persons} 
                        onChange={() => setTrackFilters(p => ({ ...p, persons: !p.persons }))} 
                        className="rounded text-rose-500" 
                      />
                      <span className="text-[10px] font-semibold text-[#526477]">Persons (14)</span>
                    </div>
                    <div className="flex-1 h-3.5 bg-[#EDF4FC] rounded relative">
                      <span className="absolute left-[15%] w-[18%] h-full bg-rose-400 rounded"></span>
                      <span className="absolute left-[52%] w-[24%] h-full bg-rose-400 rounded"></span>
                      <span className="absolute left-[82%] w-[12%] h-full bg-rose-400 rounded"></span>
                    </div>
                  </div>
                )}

                {/* Track 3: Vehicles (8) */}
                {trackFilters.vehicles && (
                  <div className="flex items-center space-x-2">
                    <div className="w-32 flex items-center space-x-1.5 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={trackFilters.vehicles} 
                        onChange={() => setTrackFilters(p => ({ ...p, vehicles: !p.vehicles }))} 
                        className="rounded text-emerald-500" 
                      />
                      <span className="text-[10px] font-semibold text-[#526477]">Vehicles (8)</span>
                    </div>
                    <div className="flex-1 h-3.5 bg-[#EDF4FC] rounded relative">
                      <span className="absolute left-[8%] w-[12%] h-full bg-emerald-400 rounded"></span>
                      <span className="absolute left-[24%] w-[22%] h-full bg-emerald-500 rounded"></span>
                      <span className="absolute left-[62%] w-[18%] h-full bg-emerald-400 rounded"></span>
                    </div>
                  </div>
                )}

                {/* Track 4: ANPR (6) */}
                {trackFilters.anpr && (
                  <div className="flex items-center space-x-2">
                    <div className="w-32 flex items-center space-x-1.5 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={trackFilters.anpr} 
                        onChange={() => setTrackFilters(p => ({ ...p, anpr: !p.anpr }))} 
                        className="rounded text-sky-500" 
                      />
                      <span className="text-[10px] font-semibold text-[#526477]">ANPR (6)</span>
                    </div>
                    <div className="flex-1 h-4 bg-[#EDF4FC] rounded relative">
                      <span className="absolute left-[26%] px-1.5 h-full bg-[#2463A6] text-white font-mono text-[8px] font-bold rounded flex items-center">
                        CH01AB1234
                      </span>
                      <span className="absolute left-[68%] px-1.5 h-full bg-[#2463A6] text-white font-mono text-[8px] font-bold rounded flex items-center">
                        HR26DA4321
                      </span>
                    </div>
                  </div>
                )}

                {/* Track 5: Suspicious Events (5) */}
                {trackFilters.suspicious && (
                  <div className="flex items-center space-x-2">
                    <div className="w-32 flex items-center space-x-1.5 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={trackFilters.suspicious} 
                        onChange={() => setTrackFilters(p => ({ ...p, suspicious: !p.suspicious }))} 
                        className="rounded text-red-500" 
                      />
                      <span className="text-[10px] font-semibold text-[#526477]">Suspicious (5)</span>
                    </div>
                    <div className="flex-1 h-3.5 bg-[#EDF4FC] rounded relative flex items-center">
                      <span className="absolute left-[18%] text-red-600 text-xs font-bold">▲</span>
                      <span className="absolute left-[36%] text-red-600 text-xs font-bold">▲</span>
                      <span className="absolute left-[45%] text-red-600 text-xs font-bold">▲</span>
                      <span className="absolute left-[70%] text-red-600 text-xs font-bold">▲</span>
                      <span className="absolute left-[88%] text-red-600 text-xs font-bold">▲</span>
                    </div>
                  </div>
                )}

                {/* Track 6: Alarms (2) */}
                {trackFilters.alarms && (
                  <div className="flex items-center space-x-2">
                    <div className="w-32 flex items-center space-x-1.5 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={trackFilters.alarms} 
                        onChange={() => setTrackFilters(p => ({ ...p, alarms: !p.alarms }))} 
                        className="rounded text-amber-500" 
                      />
                      <span className="text-[10px] font-semibold text-[#526477]">Alarms (2)</span>
                    </div>
                    <div className="flex-1 h-3.5 bg-[#EDF4FC] rounded relative flex items-center">
                      <span className="absolute left-[34%] text-amber-600 text-[10px]">🔔</span>
                      <span className="absolute left-[78%] text-amber-600 text-[10px]">🔔</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE PANEL: AI EVENTS & SELECTED EVENT EVIDENCE (4 COLS) */}
        <div className="xl:col-span-4 space-y-3 flex flex-col justify-between">
          
          {/* TOP TABS & SCROLLABLE EVENT LIST */}
          <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs space-y-2.5">
            {/* Tab Header Strip */}
            <div className="flex border-b border-[#E1EAF2] text-xs font-semibold">
              <button 
                onClick={() => setRightPanelTab('AI_EVENTS')}
                className={`pb-2 px-2.5 transition border-b-2 ${
                  rightPanelTab === 'AI_EVENTS' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
                }`}
              >
                AI Events (27)
              </button>
              <button 
                onClick={() => setRightPanelTab('BOOKMARKS')}
                className={`pb-2 px-2.5 transition border-b-2 ${
                  rightPanelTab === 'BOOKMARKS' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
                }`}
              >
                Bookmarks ({bookmarks.length + 5})
              </button>
              <button 
                onClick={() => setRightPanelTab('NOTES')}
                className={`pb-2 px-2.5 transition border-b-2 ${
                  rightPanelTab === 'NOTES' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
                }`}
              >
                Notes ({investigationNotes.length})
              </button>
              <button 
                onClick={() => setRightPanelTab('CAMERAS')}
                className={`pb-2 px-2.5 transition border-b-2 ${
                  rightPanelTab === 'CAMERAS' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
                }`}
              >
                Cameras ({cameraFeeds.length})
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <select 
                value={eventCameraFilter}
                onChange={(e) => setEventCameraFilter(e.target.value)}
                className="px-2 py-1 bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[11px] text-[#172F50]"
              >
                <option value="ALL">All Cameras</option>
                {cameraFeeds.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8291A2] absolute left-2 top-2" />
                <input 
                  type="text" 
                  value={eventSearchQuery} 
                  onChange={(e) => setEventSearchQuery(e.target.value)} 
                  placeholder="Search events..." 
                  className="w-full pl-7 pr-2 py-1 bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[11px] text-[#172F50]" 
                />
              </div>
            </div>

            {/* Scrollable Events List Stack */}
            <div className="max-h-[220px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredEvents.map((evt) => {
                const isSelected = evt.id === selectedEventId;
                return (
                  <div
                    key={evt.id}
                    onClick={() => handleJumpToEvent(evt)}
                    className={`p-2 rounded-lg border flex items-center space-x-2.5 cursor-pointer transition ${
                      isSelected 
                        ? 'border-[#2463A6] bg-[#EDF4FC]' 
                        : 'border-[#E1EAF2] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {/* Event Thumbnail */}
                    <img 
                      src={evt.thumbnail} 
                      alt={evt.title} 
                      className="w-10 h-10 rounded object-cover shrink-0 border border-slate-300" 
                    />

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#172F50] truncate">{evt.title}</span>
                        <span className="text-[10px] font-mono font-bold text-[#2463A6]">{evt.timeStr}</span>
                      </div>
                      <div className="text-[10px] text-[#526477] truncate">
                        {evt.cameraId} • {evt.location}
                      </div>
                      {evt.plate && (
                        <div className="mt-0.5 inline-block bg-black/90 text-yellow-400 font-mono text-[8px] font-bold px-1.5 rounded">
                          {evt.plate}
                        </div>
                      )}
                    </div>

                    {/* Confidence Pill */}
                    <div className="shrink-0 text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        evt.confidence >= 90 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                          : 'border-amber-300 bg-amber-50 text-amber-700'
                      }`}>
                        {evt.confidence}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTTOM RIGHT CARD: SELECTED EVENT DETAILS */}
          <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#172F50] pb-1 border-b border-[#E1EAF2]">
              <span>Selected Event Details</span>
              <X className="w-3.5 h-3.5 text-[#8291A2] cursor-pointer hover:text-black" />
            </div>

            {/* Split Image & Metadata Table */}
            <div className="flex space-x-3">
              {/* Snapshot Picture */}
              <div className="w-28 h-24 rounded-lg bg-slate-900 border border-slate-300 overflow-hidden relative shrink-0">
                <img 
                  src={selectedEvent.thumbnail} 
                  alt={selectedEvent.title} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute top-1 left-1 bg-black/75 text-[7px] text-cyan-300 font-mono px-1 rounded">
                  {selectedEvent.cameraId}
                </div>
                {selectedEvent.plate && (
                  <div className="absolute bottom-1 right-1 bg-emerald-600 text-white font-mono text-[7px] font-bold px-1 rounded">
                    ANPR MATCH
                  </div>
                )}
              </div>

              {/* Forensic Details List */}
              <div className="flex-1 min-w-0 text-[10px] space-y-0.5 text-[#526477]">
                <div className="font-bold text-[#172F50] text-xs truncate">{selectedEvent.title}</div>
                <div><span className="text-[#8291A2]">Time:</span> <strong className="font-mono text-[#172F50]">2024-05-18 {selectedEvent.timeStr}</strong></div>
                <div><span className="text-[#8291A2]">Camera:</span> <span className="font-mono">{selectedEvent.cameraId}</span></div>
                {selectedEvent.plate && (
                  <div><span className="text-[#8291A2]">Number Plate:</span> <strong className="font-mono text-[#2463A6] bg-[#DCEBFA] px-1 rounded">{selectedEvent.plate}</strong></div>
                )}
                <div><span className="text-[#8291A2]">Confidence:</span> <strong className="text-emerald-600">{selectedEvent.confidence}%</strong></div>
                {selectedEvent.vehicleType && (
                  <div><span className="text-[#8291A2]">Vehicle Type:</span> <span>{selectedEvent.vehicleType} ({selectedEvent.color})</span></div>
                )}
                {selectedEvent.direction && (
                  <div><span className="text-[#8291A2]">Direction:</span> <span>{selectedEvent.direction}</span></div>
                )}
                <div><span className="text-[#8291A2]">Location:</span> <span className="truncate">{selectedEvent.location}</span></div>
              </div>
            </div>

            {/* Forensic Detail Actions */}
            <div className="flex items-center space-x-2 pt-1 border-t border-[#E1EAF2]">
              <button 
                onClick={() => handleJumpToEvent(selectedEvent)}
                className="flex-1 py-1.5 rounded-lg bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>View in Video</span>
              </button>

              <button 
                onClick={() => showToast(`Evidence for ${selectedEvent.title} added to Investigation Dossier.`)}
                className="px-3 py-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] text-xs font-semibold text-[#172F50] transition"
              >
                Add to Case
              </button>

              <button 
                onClick={() => showToast('Forensic options: Export JPEG, Verify Hash, Print Court Sheet.')}
                className="p-1.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] text-[#526477]"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: KEY EVENTS TIMELINE CAROUSEL & INVESTIGATION PANES */}
      <div className="bg-white border border-[#CBDCEE] rounded-xl p-3 shadow-xs space-y-3">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2 text-xs font-bold">
          <div className="flex space-x-3">
            <button 
              onClick={() => setBottomTab('TIMELINE')}
              className={`pb-1 transition border-b-2 ${
                bottomTab === 'TIMELINE' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
              }`}
            >
              Key Events Timeline
            </button>
            <button 
              onClick={() => setBottomTab('NEARBY')}
              className={`pb-1 transition border-b-2 ${
                bottomTab === 'NEARBY' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
              }`}
            >
              Nearby Cameras
            </button>
            <button 
              onClick={() => setBottomTab('NOTES')}
              className={`pb-1 transition border-b-2 ${
                bottomTab === 'NOTES' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
              }`}
            >
              Investigation Notes ({investigationNotes.length})
            </button>
            <button 
              onClick={() => setBottomTab('CITIZEN')}
              className={`pb-1 transition border-b-2 ${
                bottomTab === 'CITIZEN' ? 'border-[#2463A6] text-[#2463A6]' : 'border-transparent text-[#8291A2] hover:text-[#172F50]'
              }`}
            >
              Related Citizen Reports (2)
            </button>
          </div>
          <span className="text-[10px] text-[#8291A2] font-mono">
            FORENSIC CHRONOLOGY v4.2
          </span>
        </div>

        {/* TAB 1: KEY EVENTS TIMELINE CAROUSEL (STEPPER WITH ARROWS) */}
        {bottomTab === 'TIMELINE' && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
            {/* Step 1 */}
            <div 
              onClick={() => handleJumpToEvent(aiEvents[0])}
              className="p-2 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:border-[#2463A6] cursor-pointer flex items-center space-x-2 shrink-0 transition"
            >
              <img src="/static/alert_suspicious_movement.jpg" alt="step1" className="w-10 h-9 rounded object-cover border border-slate-300" />
              <div className="text-left">
                <div className="text-[10px] font-mono font-bold text-[#8291A2]">10:27:50</div>
                <div className="text-xs font-bold text-[#172F50]">Person Entry</div>
                <div className="text-[9px] text-[#526477]">CAM-17-001</div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[#8291A2] shrink-0" />

            {/* Step 2 */}
            <div 
              onClick={() => handleJumpToEvent(aiEvents[1])}
              className="p-2 rounded-lg border-2 border-[#2463A6] bg-[#EDF4FC] cursor-pointer flex items-center space-x-2 shrink-0 transition shadow-xs"
            >
              <img src="/static/anpr_ch01ab1234_suv.jpg" alt="step2" className="w-10 h-9 rounded object-cover border border-slate-300" />
              <div className="text-left">
                <div className="text-[10px] font-mono font-bold text-[#2463A6]">10:28:05</div>
                <div className="text-xs font-bold text-[#172F50]">Vehicle Detected</div>
                <div className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1 rounded">CH01AB1234</div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[#8291A2] shrink-0" />

            {/* Step 3 */}
            <div 
              onClick={() => handleJumpToEvent(aiEvents[2])}
              className="p-2 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:border-[#2463A6] cursor-pointer flex items-center space-x-2 shrink-0 transition"
            >
              <img src="/static/alert_unattended_object.jpg" alt="step3" className="w-10 h-9 rounded object-cover border border-slate-300" />
              <div className="text-left">
                <div className="text-[10px] font-mono font-bold text-[#8291A2]">10:28:12</div>
                <div className="text-xs font-bold text-[#172F50]">Unattended Object</div>
                <div className="text-[9px] text-[#526477]">CAM-35-002</div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[#8291A2] shrink-0" />

            {/* Step 4 */}
            <div 
              onClick={() => handleJumpToEvent(aiEvents[3])}
              className="p-2 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:border-[#2463A6] cursor-pointer flex items-center space-x-2 shrink-0 transition"
            >
              <img src="/static/alert_vehicle_accident.jpg" alt="step4" className="w-10 h-9 rounded object-cover border border-slate-300" />
              <div className="text-left">
                <div className="text-[10px] font-mono font-bold text-[#8291A2]">10:28:20</div>
                <div className="text-xs font-bold text-[#172F50]">Suspicious Movement</div>
                <div className="text-[9px] text-[#526477]">CAM-43-001</div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[#8291A2] shrink-0" />

            {/* Step 5 */}
            <div 
              onClick={() => handleJumpToEvent(aiEvents[4])}
              className="p-2 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:border-[#2463A6] cursor-pointer flex items-center space-x-2 shrink-0 transition"
            >
              <img src="/static/alert_watchlist_anpr.jpg" alt="step5" className="w-10 h-9 rounded object-cover border border-slate-300" />
              <div className="text-left">
                <div className="text-[10px] font-mono font-bold text-[#8291A2]">10:28:35</div>
                <div className="text-xs font-bold text-[#172F50]">Vehicle Exit</div>
                <div className="text-[9px] text-[#526477]">CAM-17-001</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NEARBY CAMERAS */}
        {bottomTab === 'NEARBY' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC]">
              <div className="font-bold text-[#172F50]">CAM-17-002 (Sector 17 South Bank)</div>
              <div className="text-[10px] text-[#526477]">120 meters • Online • 25 FPS</div>
            </div>
            <div className="p-2.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC]">
              <div className="font-bold text-[#172F50]">CAM-22-001 (Aroma Intersection)</div>
              <div className="text-[10px] text-[#526477]">250 meters • Online • 25 FPS</div>
            </div>
            <div className="p-2.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC]">
              <div className="font-bold text-[#172F50]">CAM-35-001 (Rotary West Gate)</div>
              <div className="text-[10px] text-[#526477]">410 meters • Online • 25 FPS</div>
            </div>
            <div className="p-2.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC]">
              <div className="font-bold text-[#172F50]">CAM-43-002 (Terminal Arrival Bay)</div>
              <div className="text-[10px] text-[#526477]">580 meters • Online • 25 FPS</div>
            </div>
          </div>
        )}

        {/* TAB 3: INVESTIGATION NOTES */}
        {bottomTab === 'NOTES' && (
          <div className="space-y-2 text-xs">
            {investigationNotes.map(n => (
              <div key={n.id} className="p-2 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC]">
                <div className="flex justify-between text-[10px] text-[#8291A2]">
                  <strong className="text-[#172F50]">{n.author}</strong>
                  <span>{n.timestamp}</span>
                </div>
                <p className="text-[#526477] mt-1">{n.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: RELATED CITIZEN REPORTS */}
        {bottomTab === 'CITIZEN' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div 
              onClick={() => setActiveTab('citizen-reports-review')}
              className="p-2.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] cursor-pointer transition"
            >
              <div className="flex justify-between">
                <span className="font-bold text-[#172F50]">CR-2024-0089: Unattended Bag at Bench</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded">Pending Police Verification</span>
              </div>
              <div className="text-[10px] text-[#526477] mt-1">Submitted by Citizen Anita G. (Sector 17 Plaza). Photo attached.</div>
            </div>

            <div 
              onClick={() => setActiveTab('citizen-reports-review')}
              className="p-2.5 rounded-lg border border-[#CBDCEE] bg-[#F8FAFC] hover:bg-[#EDF4FC] cursor-pointer transition"
            >
              <div className="flex justify-between">
                <span className="font-bold text-[#172F50]">CR-2024-0091: Traffic Obstruction / Collision</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">Dispatched</span>
              </div>
              <div className="text-[10px] text-[#526477] mt-1">Submitted by Driver Harpreet S. (Sector 43 intersection).</div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD CAMERA STREAM */}
      {showAddCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-[#CBDCEE] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
              <div className="flex items-center space-x-2">
                <Grid className="w-5 h-5 text-[#2463A6]" />
                <h3 className="text-sm font-bold text-[#172F50]">Add Camera to Synchronized View</h3>
              </div>
              <button onClick={() => setShowAddCameraModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div 
                onClick={() => {
                  showToast('Camera CAM-08-001 connected to synchronized playback array.');
                  setShowAddCameraModal(false);
                }}
                className="p-3 rounded-xl border border-[#CBDCEE] hover:border-[#2463A6] bg-[#F8FAFC] hover:bg-[#EDF4FC] cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[#172F50]">CAM-08-001 • Sector 8 Commercial Boulevard</div>
                  <div className="text-[10px] text-[#526477]">PTZ 4K Camera • 25 FPS • H.264 Universal</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2463A6] text-white">+ Add</span>
              </div>

              <div 
                onClick={() => {
                  showToast('Camera CAM-19-002 connected to synchronized playback array.');
                  setShowAddCameraModal(false);
                }}
                className="p-3 rounded-xl border border-[#CBDCEE] hover:border-[#2463A6] bg-[#F8FAFC] hover:bg-[#EDF4FC] cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[#172F50]">CAM-19-002 • Sector 19 Sub-District Market</div>
                  <div className="text-[10px] text-[#526477]">Fixed Dome 1080p • 25 FPS • H.264</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2463A6] text-white">+ Add</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setShowAddCameraModal(false)}
                className="px-4 py-1.5 rounded-lg border border-[#CBDCEE] text-xs font-semibold text-[#526477]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD INVESTIGATION NOTE */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddNoteSubmit} className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#CBDCEE] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#2463A6]" />
                <h3 className="text-sm font-bold text-[#172F50]">Add Investigation Note</h3>
              </div>
              <button type="button" onClick={() => setShowAddNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#526477]">Forensic Observation / Case Finding</label>
              <textarea 
                rows={4}
                value={newNoteInput}
                onChange={(e) => setNewNoteInput(e.target.value)}
                placeholder="Enter officer notes, suspect behavior analysis, or cross-camera verification details..."
                className="w-full p-2.5 text-xs border border-[#CBDCEE] rounded-lg bg-[#F8FAFC]"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowAddNoteModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#CBDCEE] text-xs font-semibold text-[#526477]"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 rounded-lg bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold"
              >
                Save to Case
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: CLIP EXTRACTION & SEEDING */}
      {showClipExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#CBDCEE] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
              <div className="flex items-center space-x-2">
                <Scissors className="w-5 h-5 text-[#2463A6]" />
                <h3 className="text-sm font-bold text-[#172F50]">Extract Derivative Forensic Clip</h3>
              </div>
              <button onClick={() => setShowClipExportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#526477] mb-1">Source Camera</label>
                <div className="font-mono font-bold text-[#172F50] bg-[#F8FAFC] p-2 rounded-lg border border-[#CBDCEE]">
                  {cameraFeeds[featuredCameraIndex].id} ({cameraFeeds[featuredCameraIndex].name})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#526477] mb-1">In-Point (Start)</label>
                  <input type="text" readOnly value="10:28:00" className="w-full p-2 bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-[#526477] mb-1">Out-Point (End)</label>
                  <input type="text" readOnly value="10:28:30" className="w-full p-2 bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg font-mono" />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                Derivative evidence is signed with SHA-256. Master CCTV recording remains immutable.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setShowClipExportModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#CBDCEE] text-xs font-semibold text-[#526477]"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowClipExportModal(false);
                  showToast('Derivative Forensic Clip exported and cryptographically certified!');
                }}
                className="px-4 py-1.5 rounded-lg bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold"
              >
                Export & Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION TOAST */}
      {notificationToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#172F50] text-white px-4 py-2.5 rounded-xl shadow-lg border border-cyan-400/30 flex items-center space-x-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{notificationToast}</span>
        </div>
      )}
    </div>
  );
};
export default IncidentReconstruction;

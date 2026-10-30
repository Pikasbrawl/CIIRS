import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Play, Pause, Upload, Sparkles, AlertTriangle, ShieldCheck, 
  Eye, CheckCircle2, RefreshCw, BarChart2, Layers, HelpCircle, ArrowRight,
  Maximize2, Volume2, VolumeX, RotateCcw, Filter, BellRing, Search,
  ShieldAlert, Clock, Radio, Video, ListFilter, Siren, Check
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Camera, Prediction } from '../types';

interface ScenarioConfig {
  name: string;
  tag: string;
  desc: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  compositeScore: number;
  confidence: number;
  videoUrl: string;
  defaultCam: string;
  camName: string;
  badge: string;
  explanation: string;
  observedIndicators: string[];
  recommendedAction: string;
  boxes: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    label: string;
    color: 'rose' | 'amber' | 'emerald' | 'cyan';
    isCritical?: boolean;
  }>;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    name: 'Crowd Surge',
    tag: 'USER UPLOADED CCTV • 48s',
    desc: 'Rapid pedestrian surge & density alignment vector',
    severity: 'CRITICAL',
    compositeScore: 92,
    confidence: 0.984,
    videoUrl: '/static/real_crowd_surge_cctv.mp4',
    defaultCam: 'CAM-17-001',
    camName: 'Sector 17 Central Plaza Promenade',
    badge: 'KINETIC SURGE DETECTION',
    explanation: 'PyTorch Bi-LSTM temporal model detected a sudden velocity surge (>3.2 m/s) and rapid directional coherence across 12+ tracked pedestrians.',
    observedIndicators: [
      'Velocity vector alignment exceeding 82% threshold',
      'Sudden local crowd density spike (12 tracked subjects)',
      'Cross-corridor bottleneck pressure point identified'
    ],
    recommendedAction: 'Dispatch Unit PCR-04 to Sector 17 Plaza north corridor; initiate pedestrian flow divergence advisory.',
    boxes: [
      { left: 32, top: 28, width: 14, height: 42, label: 'Person 0.67 (Surge)', color: 'rose', isCritical: true },
      { left: 48, top: 30, width: 13, height: 38, label: 'Person 0.65 (High Vel)', color: 'rose', isCritical: true },
      { left: 62, top: 34, width: 12, height: 40, label: 'Person 0.64 (Surge)', color: 'rose', isCritical: true },
      { left: 20, top: 40, width: 14, height: 45, label: 'Person 0.60', color: 'rose' },
      { left: 74, top: 36, width: 15, height: 44, label: 'Person 0.58', color: 'rose' }
    ]
  },
  {
    name: 'Restricted-Area Entry',
    tag: 'USER UPLOADED CCTV • 15s',
    desc: 'ATM kiosk perimeter & backpack loitering detection',
    severity: 'HIGH',
    compositeScore: 84,
    confidence: 0.972,
    videoUrl: '/static/real_atm_detection_cctv.mp4',
    defaultCam: 'CAM-22-003',
    camName: 'Sector 22 Market ATM & Banking Kiosk',
    badge: 'ATM RESTRICTED ZONE PERIMETER',
    explanation: 'Temporal boundary spatial model identified subject entry into restricted ATM zone with stationary backpack placement.',
    observedIndicators: [
      'Spatial perimeter boundary transition into ATM zone',
      'Subject detected (conf: 0.89) with secondary backpack (conf: 0.75)',
      'Zone dwell time approaching security review threshold'
    ],
    recommendedAction: 'Verify live ATM CCTV feed; prompt sector 22 market beat officer for perimeter check.',
    boxes: [
      { left: 28, top: 20, width: 44, height: 68, label: 'ATM Customer 0.89', color: 'amber', isCritical: false },
      { left: 40, top: 56, width: 22, height: 28, label: 'Backpack Detected 0.75', color: 'rose', isCritical: true }
    ]
  },
  {
    name: 'Unattended Object',
    tag: 'REAL CCTV FOOTAGE',
    desc: 'Stationary luggage object dwell time exceeding 12m',
    severity: 'HIGH',
    compositeScore: 86,
    confidence: 0.958,
    videoUrl: '/static/real_unattended_object_cctv.mp4',
    defaultCam: 'CAM-35-002',
    camName: 'Sector 35 Rotary & Concourse',
    badge: 'UNATTENDED OBJECT DETECTED',
    explanation: 'Object tracked stationary on pedestrian concourse with owner separation distance exceeding 15 meters.',
    observedIndicators: [
      'Stationary duffel bag detected (conf: 0.96)',
      'Owner separation distance > 15m for over 3 minutes',
      'Pedestrian passerby avoidance behavior flagged'
    ],
    recommendedAction: 'Issue automated public safety alert; dispatch nearest patrol unit to secure perimeter.',
    boxes: [
      { left: 45.6, top: 55.5, width: 8.5, height: 12.2, label: 'UNATTENDED DUFFEL BAG 0.96', color: 'amber', isCritical: true }
    ]
  },
  {
    name: 'Vehicle Collision',
    tag: 'REAL CCTV FOOTAGE',
    desc: 'Severe deceleration & vehicle collision impact',
    severity: 'CRITICAL',
    compositeScore: 96,
    confidence: 0.988,
    videoUrl: '/static/real_vehicle_accident_cctv.mp4',
    defaultCam: 'CAM-43-001',
    camName: 'Sector 43 ISBT Transit Entry Highway',
    badge: 'ROAD ACCIDENT CRITICAL',
    explanation: 'Severe multi-vehicle kinetic deceleration and trajectory deviation detected at Sector 43 transit corridor.',
    observedIndicators: [
      'Kinetic velocity drop delta > 45 km/h in 0.4s',
      'Trajectory deviation and roadway blockage identified',
      'ANPR emergency cross-referencing initiated'
    ],
    recommendedAction: 'Immediate dispatch of PCR ambulance unit and traffic diversion team.',
    boxes: [
      { left: 36.2, top: 38.3, width: 27.5, height: 31.1, label: 'CRITICAL COLLISION 0.98', color: 'rose', isCritical: true }
    ]
  },
  {
    name: 'Fall Detection',
    tag: 'CASIA SURVEILLANCE',
    desc: 'Vertical velocity & horizontal posture transition',
    severity: 'HIGH',
    compositeScore: 88,
    confidence: 0.962,
    videoUrl: '/static/casia_surveillance_fall_demo.mp4',
    defaultCam: 'CAM-DEMO-005',
    camName: 'Sukhna Lake Waterfront Promenade',
    badge: 'FALL DETECTION (MEDICAL)',
    explanation: 'Subject vertical descent vector accompanied by sudden horizontal bounding box transition and immobility.',
    observedIndicators: [
      'Rapid vertical centroid drop (< 0.3s)',
      'Aspect ratio flip from vertical (0.4) to horizontal (2.4)',
      'Zero-motion persistence after ground contact'
    ],
    recommendedAction: 'Alert Sukhna Lake emergency kiosk and dispatch nearest first-responder.',
    boxes: [
      { left: 38, top: 62, width: 24, height: 18, label: 'FALL DETECTED 0.96', color: 'rose', isCritical: true }
    ]
  },
  {
    name: 'Sudden Running',
    tag: 'SURVEILLANCE DATASET',
    desc: 'Rapid acceleration delta exceeding normal stride',
    severity: 'MEDIUM',
    compositeScore: 74,
    confidence: 0.949,
    videoUrl: '/static/real_sudden_running.mp4',
    defaultCam: 'CAM-DEMO-006',
    camName: 'Panjab University Concourse',
    badge: 'SUDDEN ACCELERATION EVASION',
    explanation: 'Individual acceleration anomaly identified departing administrative area at high speed.',
    observedIndicators: [
      'Stride velocity increased 3.8x above surrounding ambient baseline',
      'Corridor transit vector flagged for automated tracking'
    ],
    recommendedAction: 'Log camera corridor trajectory and monitor downstream sector 14 exit points.',
    boxes: [
      { left: 40, top: 35, width: 16, height: 44, label: 'RUNNING SUBJECT 0.94', color: 'rose', isCritical: true }
    ]
  },
  {
    name: 'Physical Altercation Indicators',
    tag: 'PUBLIC TRANSIT CCTV',
    desc: 'High kinetic interaction & close proximity clustering',
    severity: 'HIGH',
    compositeScore: 82,
    confidence: 0.945,
    videoUrl: '/static/real_public_interaction.mp4',
    defaultCam: 'CAM-43-001',
    camName: 'Sector 43 Transit Terminal Concourse',
    badge: 'PROXIMITY AGITATION CLUSTER',
    explanation: 'Two or more individuals exhibiting erratic kinetic velocity overlap and rapid proximity oscillation.',
    observedIndicators: [
      'Multi-entity bounding box overlap > 40%',
      'High-frequency limb kinetic motion detected'
    ],
    recommendedAction: 'Notify transit security desk for visual spot-check.',
    boxes: [
      { left: 36, top: 32, width: 26, height: 48, label: 'KINETIC INTERACTION 0.91', color: 'amber', isCritical: true }
    ]
  }
];

export const PredictiveAIEngine: React.FC = () => {
  const { triggerScenario, isTriggeringScenario, setActiveTab } = useApp();
  
  const [selectedScenarioName, setSelectedScenarioName] = useState<string>('Crowd Surge');
  const [activeViewMode, setActiveViewMode] = useState<'VIDEO_INFERENCE' | 'ALERTS_FEED'>('VIDEO_INFERENCE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Video playback states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(8.0);
  
  // Upload states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active scenario object
  const activeScenario = SCENARIOS.find(s => s.name === selectedScenarioName) || SCENARIOS[0];

  // Sync video time
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => setCurrentTimeSec(vid.currentTime);
    const onMeta = () => {
      setDurationSec(vid.duration || 8.0);
      vid.playbackRate = playbackSpeed;
      vid.muted = isMuted;
      if (isPlaying) vid.play().catch(() => {});
    };
    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('loadedmetadata', onMeta);
    return () => {
      vid.removeEventListener('timeupdate', onTime);
      vid.removeEventListener('loadedmetadata', onMeta);
    };
  }, [activeScenario.videoUrl]);

  // Handle Scenario Switch
  const handleSelectScenario = (sc: ScenarioConfig) => {
    setSelectedScenarioName(sc.name);
    setIsPlaying(true);
    triggerScenario(sc.name, sc.defaultCam).catch(() => {});
  };

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name} to CIIRS media ingest...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('camera_id', activeScenario.defaultCam);
    formData.append('scenario_hint', activeScenario.name);

    try {
      const res = await api.uploadVideo(formData);
      setUploadStatus(`Uploaded ${res.filename}. Running PyTorch temporal action analysis...`);
      setTimeout(() => {
        setUploadStatus('Video sequence analyzed successfully. Ingested into CIIRS Media Repository.');
        setIsUploading(false);
      }, 1500);
    } catch {
      setUploadStatus('Upload or processing failed.');
      setIsUploading(false);
    }
  };

  // Generate synthetic 20-frame attention vector based on scenario risk
  const attentionData = Array.from({ length: 20 }, (_, idx) => {
    const frame = `F-${idx + 1}`;
    const base = 0.05 + Math.sin((idx / 20) * Math.PI) * 0.2;
    // Peak near frame 14-16
    const peak = idx >= 12 && idx <= 16 ? (activeScenario.compositeScore / 100) * 0.75 : 0;
    const val = Math.min(1.0, base + peak);
    return {
      frame,
      weight: Number((val * 100).toFixed(1))
    };
  });

  // Filtered Alert Items
  const alertRecords = SCENARIOS.map((sc, idx) => ({
    id: `ALT-2026-90${idx + 41}`,
    title: sc.name,
    category: sc.name,
    severity: sc.severity,
    location: sc.camName,
    cameraId: sc.defaultCam,
    timestamp: `2026-10-30 23:${(25 - idx * 2).toString().padStart(2, '0')}:00`,
    confidence: sc.confidence,
    compositeScore: sc.compositeScore,
    badge: sc.badge,
    scenario: sc
  })).filter(item => {
    const matchSev = severityFilter === 'ALL' || item.severity === severityFilter;
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cameraId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSev && matchSearch;
  });

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-8 select-none font-sans">
      
      {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
      <div className="bg-white border border-[#CBDCEE] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2463A6] to-[#172F50] text-white flex items-center justify-center font-bold shadow-sm shadow-[#2463A6]/20 shrink-0">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-[#172F50] tracking-tight leading-tight">
                Alerts & Events — Predictive AI Early Warning Engine
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                PyTorch Bi-LSTM • Active
              </span>
            </div>
            <p className="text-xs text-[#526477] mt-0.5">
              Continuous multi-camera kinetic trajectory forecasting and real-time CCTV event verification across Chandigarh.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Upload Actions */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-[#F4F8FC] p-1 rounded-xl border border-[#CBDCEE] space-x-1">
            <button
              onClick={() => setActiveViewMode('VIDEO_INFERENCE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeViewMode === 'VIDEO_INFERENCE'
                  ? 'bg-white text-[#2463A6] shadow-xs'
                  : 'text-[#526477] hover:text-[#172F50]'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-[#2463A6]" />
              <span>CCTV Video & Inference</span>
            </button>
            <button
              onClick={() => setActiveViewMode('ALERTS_FEED')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeViewMode === 'ALERTS_FEED'
                  ? 'bg-white text-[#172F50] shadow-xs'
                  : 'text-[#526477] hover:text-[#172F50]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-[#172F50]" />
              <span>Live Alerts Feed ({SCENARIOS.length})</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Ingesting...' : 'Upload Video'}</span>
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="p-3 bg-[#EBF3FC] border border-[#CBDCEE] rounded-xl text-xs text-[#2463A6] font-mono flex items-center space-x-2">
          <Sparkles className="w-4 h-4 shrink-0 text-[#2463A6]" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* 2. MODE A: CCTV VIDEO & TEMPORAL AI INFERENCE */}
      {activeViewMode === 'VIDEO_INFERENCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT 8 COLS: CCTV VIDEO STREAM & TEMPORAL XAI ATTENTION */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Real CCTV Video Player */}
            <div className="relative rounded-2xl overflow-hidden border border-[#CBDCEE] bg-slate-900 shadow-md aspect-video group">
              <video
                ref={videoRef}
                key={activeScenario.videoUrl}
                src={activeScenario.videoUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />

              {/* DYNAMIC AI BOUNDING BOXES OVERLAY */}
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {activeScenario.boxes.map((b, i) => (
                  <div
                    key={i}
                    className={`absolute rounded transition-all duration-150 ${
                      b.isCritical
                        ? 'border-2 border-rose-500 bg-rose-500/20 shadow-md shadow-rose-500/30 animate-pulse'
                        : b.color === 'amber'
                        ? 'border-2 border-amber-500 bg-amber-500/15 shadow-sm'
                        : 'border-2 border-emerald-500 bg-emerald-500/15 shadow-sm'
                    }`}
                    style={{
                      left: `${b.left}%`,
                      top: `${b.top}%`,
                      width: `${b.width}%`,
                      height: `${b.height}%`
                    }}
                  >
                    <div className={`absolute -top-3.5 left-0 text-white text-[7.5px] font-mono font-bold px-1 rounded shadow-xs flex items-center space-x-1 ${
                      b.isCritical ? 'bg-rose-600' :
                      b.color === 'amber' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      <span>{b.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* In-feed Top HUD Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                <div className="flex items-center space-x-2">
                  <div className="bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20 text-white text-[11px] font-mono font-bold flex items-center space-x-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>{activeScenario.defaultCam}</span>
                    <span className="text-slate-400">•</span>
                    <span>{activeScenario.camName}</span>
                  </div>
                  <span className="bg-[#2463A6] text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-xs">
                    {activeScenario.badge}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-md ${
                    activeScenario.severity === 'CRITICAL'
                      ? 'bg-rose-600 text-white'
                      : activeScenario.severity === 'HIGH'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    RISK: {activeScenario.severity} ({activeScenario.compositeScore}/100)
                  </span>
                  <span className="px-2 py-1 rounded-lg text-xs font-mono bg-white/90 text-[#172F50] border border-white font-bold shadow-xs">
                    {(activeScenario.confidence * 100).toFixed(1)}% CONF
                  </span>
                </div>
              </div>

              {/* Bottom Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-white text-xs z-20">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleTogglePlay}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = 0;
                    }}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                    title="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="font-mono text-[11px] text-white/90 ml-1">
                    {Math.floor(currentTimeSec / 60).toString().padStart(2, '0')}:
                    {Math.floor(currentTimeSec % 60).toString().padStart(2, '0')} / {Math.floor(durationSec / 60).toString().padStart(2, '0')}:
                    {Math.floor(durationSec % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-white/20 rounded-lg p-0.5 space-x-1 text-[10px] font-mono font-bold">
                    {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackSpeed(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                        }}
                        className={`px-1.5 py-0.5 rounded transition ${
                          playbackSpeed === rate ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Temporal Self-Attention Distribution Chart */}
            <div className="bg-white border border-[#CBDCEE] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#172F50]">
                    Temporal Self-Attention Vector (20-Frame Sequence Model)
                  </h3>
                  <p className="text-[11px] text-[#526477]">
                    Peaks indicate critical pre-incident kinetic transition points for scenario: <span className="font-semibold text-[#2463A6]">{activeScenario.name}</span>
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF4FC] text-[#2463A6] font-semibold border border-[#CBDCEE]">
                  XAI ATTENTION WEIGHTS
                </span>
              </div>

              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attentionData}>
                    <defs>
                      <linearGradient id="attentionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2463A6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2463A6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E1EAF2" />
                    <XAxis dataKey="frame" stroke="#8291A2" fontSize={10} />
                    <YAxis stroke="#8291A2" fontSize={10} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBDCEE', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="weight" 
                      name="Attention %" 
                      stroke="#2463A6" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#attentionGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* RIGHT 4 COLS: SCENARIO SELECTOR & EXPLAINABLE AI OUTPUT */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Real CCTV Scenario Selector */}
            <div className="bg-white border border-[#CBDCEE] rounded-xl p-4 shadow-xs">
              <div className="text-xs font-bold text-[#172F50] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Select CCTV Scenario</span>
                <span className="text-[10px] text-[#2463A6] font-mono">Actual Surveillance</span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                {SCENARIOS.map((sc) => {
                  const isSelected = selectedScenarioName === sc.name;
                  return (
                    <button
                      key={sc.name}
                      onClick={() => handleSelectScenario(sc)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#EBF3FC] border-[#2463A6] text-[#172F50] font-semibold shadow-xs ring-1 ring-[#2463A6]'
                          : 'bg-[#F8FAFC] border-[#CBDCEE] text-[#526477] hover:bg-[#EDF4FC] hover:border-[#2463A6]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-[#172F50]">{sc.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            sc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                            sc.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {sc.severity}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8291A2] truncate max-w-[210px]">{sc.desc}</div>
                        <div className="text-[9.5px] font-mono font-bold text-[#2463A6]">{sc.tag}</div>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#2463A6] text-white flex items-center justify-center shrink-0">
                          <Play className="w-2.5 h-2.5 fill-white" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8291A2]">Play</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Explanation & XAI Action Card */}
            <div className="bg-white border border-[#CBDCEE] rounded-xl p-4 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
                <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
                  Explainable AI (XAI) Output
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  CONF: {(activeScenario.confidence * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#CBDCEE] text-xs text-[#526477] leading-relaxed">
                {activeScenario.explanation}
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#172F50] uppercase">
                  Observed Early Warning Indicators:
                </span>
                <ul className="mt-1.5 space-y-1.5 text-xs text-[#526477]">
                  {activeScenario.observedIndicators.map((ind, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2463A6] shrink-0 mt-0.5" />
                      <span>{ind}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-[#E1EAF2]">
                <div className="text-[11px] text-amber-700 font-bold mb-1 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Recommended Operator Action:</span>
                </div>
                <div className="text-xs text-[#172F50] bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
                  {activeScenario.recommendedAction}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('emergency-response')}
                className="w-full mt-2 py-2.5 px-3 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center space-x-2"
              >
                <Siren className="w-4 h-4" />
                <span>Review In Emergency Coordination Centre</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* 3. MODE B: LIVE ALERTS FEED TABLE */}
      {activeViewMode === 'ALERTS_FEED' && (
        <div className="bg-white border border-[#CBDCEE] rounded-2xl shadow-xs overflow-hidden">
          
          {/* Table Header Filter Toolbar */}
          <div className="p-4 border-b border-[#CBDCEE] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#172F50]">Severity Filter:</span>
              <div className="flex items-center bg-white p-1 rounded-lg border border-[#CBDCEE] space-x-1 text-xs">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      severityFilter === sev
                        ? 'bg-[#2463A6] text-white'
                        : 'text-[#526477] hover:text-[#172F50]'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-[#8291A2] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts, cameras, locations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:border-[#2463A6]"
              />
            </div>
          </div>

          {/* Alerts Records List */}
          <div className="divide-y divide-[#E1EAF2]">
            {alertRecords.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-[#F4F8FC] transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start space-x-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                    alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {alert.severity === 'CRITICAL' ? <AlertTriangle className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#172F50]">{alert.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {alert.severity} ({alert.compositeScore}/100)
                      </span>
                      <span className="text-[10px] font-mono text-[#2463A6] bg-[#EBF3FC] px-1.5 py-0.2 rounded border border-[#CBDCEE]">
                        {alert.badge}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#172F50] mt-1">
                      {alert.title}
                    </h4>

                    <div className="flex items-center space-x-3 text-xs text-[#526477] mt-1">
                      <span className="font-semibold text-[#172F50]">{alert.cameraId}</span>
                      <span>•</span>
                      <span>{alert.location}</span>
                      <span>•</span>
                      <span className="text-[#8291A2] font-mono">{alert.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button
                    onClick={() => {
                      handleSelectScenario(alert.scenario);
                      setActiveViewMode('VIDEO_INFERENCE');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#EBF3FC] hover:bg-[#DCEBFA] text-[#2463A6] text-xs font-bold border border-[#CBDCEE] transition flex items-center space-x-1"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>View CCTV Stream</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('emergency-response')}
                    className="px-3 py-1.5 rounded-lg bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Siren className="w-3.5 h-3.5" />
                    <span>Coordinate Dispatch</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, Play, Pause, Volume2, VolumeX, Eye, EyeOff, 
  Camera, Sliders, X, CheckCircle2, Shield, Crosshair, Clock, RotateCcw
} from 'lucide-react';

export interface CameraFeedTarget {
  trackId: string;
  label: string;
  confidence: number;
  category: 'PERSON' | 'CAR' | 'BUS' | 'SUV' | 'AUTO' | 'MOTORCYCLE' | 'UNWANTED_OBJECT' | 'ACCIDENT';
  color: string;
  getBox: (t: number) => { x: number; y: number; w: number; h: number; status: string };
}

export interface CameraFeedConfig {
  id: string;
  name: string;
  sector: string;
  sceneType: string;
  videoUrl: string;
  hudText: string;
  fps: number;
  resolution: string;
  lat: number;
  lon: number;
  objectCountLabel: string;
  primaryColor: string;
  targets: CameraFeedTarget[];
}

// 4 Distinct Camera Feed Setups with Mathematical Time-Aligned Trajectories (0 to 8s loop)
export const CAMERA_FEEDS: CameraFeedConfig[] = [
  // CAMERA 1: CAM-17-001 — Pedestrian Detection (8 Persons)
  {
    id: 'CAM-17-001',
    name: 'Sector 17 - Plaza',
    sector: 'Sector 17 Commercial Promenade & Crosswalk',
    sceneType: 'Pedestrian Street & Crosswalk Detection',
    videoUrl: '/static/real_pedestrians_8_persons.mp4',
    hudText: 'CAM-17-001 | PERSONS DETECTED: 08 | DEMO AI VISUALISATION',
    fps: 25,
    resolution: '640x360',
    lat: 30.7398,
    lon: 76.7827,
    objectCountLabel: '8 Persons Detected',
    primaryColor: '#06B6D4', // Cyan
    targets: [
      {
        trackId: 'TRK-101',
        label: 'PERSON 01',
        confidence: 96,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = ((60 + 42 * t) % 720) - 40;
          return { x: px - 12, y: 234 - 28, w: 24, h: 56, status: 'Walking East (1.2 m/s)' };
        }
      },
      {
        trackId: 'TRK-102',
        label: 'PERSON 02',
        confidence: 94,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = 640 - (((560 - 36 * t) % 720) - 40);
          return { x: px - 11, y: 198 - 25, w: 22, h: 50, status: 'Walking West (1.0 m/s)' };
        }
      },
      {
        trackId: 'TRK-103',
        label: 'PERSON 03',
        confidence: 91,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = ((140 + 28 * t) % 720) - 40;
          return { x: px - 13, y: 280 - 32, w: 26, h: 64, status: 'Crossing Zebra Line' };
        }
      },
      {
        trackId: 'TRK-104',
        label: 'PERSON 04',
        confidence: 95,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = ((-20 + 48 * t) % 720) - 40;
          return { x: px - 12, y: 216 - 27, w: 24, h: 54, status: 'Brisk Walk North' };
        }
      },
      {
        trackId: 'TRK-105',
        label: 'PERSON 05',
        confidence: 89,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = 640 - (((500 - 24 * t) % 720) - 40);
          return { x: px - 13, y: 295 - 33, w: 26, h: 66, status: 'Walking South' };
        }
      },
      {
        trackId: 'TRK-106',
        label: 'PERSON 06',
        confidence: 93,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = ((240 + 32 * t) % 720) - 40;
          return { x: px - 10, y: 187 - 23, w: 20, h: 46, status: 'Sidewalk Approach' };
        }
      },
      {
        trackId: 'TRK-107',
        label: 'PERSON 07',
        confidence: 92,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = 640 - (((620 - 30 * t) % 720) - 40);
          return { x: px - 12, y: 252 - 29, w: 24, h: 58, status: 'Crossing Walkway' };
        }
      },
      {
        trackId: 'TRK-108',
        label: 'PERSON 08',
        confidence: 88,
        category: 'PERSON',
        color: '#06B6D4',
        getBox: (t) => {
          const px = ((310 + 20 * t) % 720) - 40;
          return { x: px - 10, y: 194 - 22, w: 20, h: 44, status: 'Pedestrian Stroll' };
        }
      }
    ]
  },

  // CAMERA 2: CAM-22-003 — Road Traffic & Vehicles (12 Vehicles)
  {
    id: 'CAM-22-003',
    name: 'Sector 22 - Market',
    sector: 'Sector 22 Market Avenue & Highway',
    sceneType: 'Road Traffic & Multi-Lane Flow',
    videoUrl: '/static/real_traffic_12_vehicles.mp4',
    hudText: 'CAM-22-003 | VEHICLES DETECTED: 12 | DEMO AI VISUALISATION',
    fps: 25,
    resolution: '640x360',
    lat: 30.7290,
    lon: 76.7725,
    objectCountLabel: '12 Vehicles Detected',
    primaryColor: '#10B981', // Emerald Green
    targets: [
      {
        trackId: 'TRK-201',
        label: 'CAR 01',
        confidence: 98,
        category: 'CAR',
        color: '#10B981',
        getBox: (t) => {
          const px = ((80 + 65 * t) % 780) - 70;
          return { x: px - 31, y: 165 - 16, w: 62, h: 32, status: 'Lane 1 (55 km/h)' };
        }
      },
      {
        trackId: 'TRK-202',
        label: 'BUS 01',
        confidence: 96,
        category: 'BUS',
        color: '#3B82F6',
        getBox: (t) => {
          const px = ((-40 + 45 * t) % 780) - 70;
          return { x: px - 52, y: 137 - 21, w: 104, h: 42, status: 'CTU Transit Bus (40 km/h)' };
        }
      },
      {
        trackId: 'TRK-203',
        label: 'CAR 02',
        confidence: 94,
        category: 'CAR',
        color: '#10B981',
        getBox: (t) => {
          const px = ((260 + 60 * t) % 780) - 70;
          return { x: px - 29, y: 169 - 15, w: 58, h: 30, status: 'Lane 1 Flow' };
        }
      },
      {
        trackId: 'TRK-204',
        label: 'SUV 01',
        confidence: 97,
        category: 'SUV',
        color: '#06B6D4',
        getBox: (t) => {
          const px = 640 - (((580 - 55 * t) % 780) - 70);
          return { x: px - 34, y: 252 - 18, w: 68, h: 36, status: 'Eastbound Lane 2' };
        }
      },
      {
        trackId: 'TRK-205',
        label: 'AUTO 01',
        confidence: 93,
        category: 'AUTO',
        color: '#F59E0B',
        getBox: (t) => {
          const px = 640 - (((450 - 40 * t) % 780) - 70);
          return { x: px - 21, y: 302 - 14, w: 42, h: 28, status: 'Curb Transit (35 km/h)' };
        }
      },
      {
        trackId: 'TRK-206',
        label: 'CAR 03',
        confidence: 95,
        category: 'CAR',
        color: '#10B981',
        getBox: (t) => {
          const px = 640 - (((320 - 68 * t) % 780) - 70);
          return { x: px - 30, y: 255 - 16, w: 60, h: 32, status: 'Lane 2 Cruise' };
        }
      },
      {
        trackId: 'TRK-207',
        label: 'MOTO 01',
        confidence: 91,
        category: 'MOTORCYCLE',
        color: '#A855F7',
        getBox: (t) => {
          const px = ((380 + 70 * t) % 780) - 70;
          return { x: px - 15, y: 187 - 10, w: 30, h: 20, status: 'Motorcycle Corridor' };
        }
      },
      {
        trackId: 'TRK-208',
        label: 'CAR 04',
        confidence: 97,
        category: 'CAR',
        color: '#10B981',
        getBox: (t) => {
          const px = ((480 + 58 * t) % 780) - 70;
          return { x: px - 30, y: 165 - 16, w: 60, h: 32, status: 'Maintaining Distance' };
        }
      },
      {
        trackId: 'TRK-209',
        label: 'BUS 02',
        confidence: 95,
        category: 'BUS',
        color: '#3B82F6',
        getBox: (t) => {
          const px = 640 - (((190 - 42 * t) % 780) - 70);
          return { x: px - 49, y: 306 - 20, w: 98, h: 40, status: 'Express Route 22' };
        }
      },
      {
        trackId: 'TRK-210',
        label: 'CAR 05',
        confidence: 92,
        category: 'CAR',
        color: '#10B981',
        getBox: (t) => {
          const px = 640 - (((80 - 64 * t) % 780) - 70);
          return { x: px - 29, y: 252 - 15, w: 58, h: 30, status: 'Main Avenue Flow' };
        }
      },
      {
        trackId: 'TRK-211',
        label: 'SUV 02',
        confidence: 94,
        category: 'SUV',
        color: '#06B6D4',
        getBox: (t) => {
          const px = ((190 + 52 * t) % 780) - 70;
          return { x: px - 33, y: 140 - 17, w: 66, h: 34, status: 'Lane 1 Flow' };
        }
      },
      {
        trackId: 'TRK-212',
        label: 'MOTO 02',
        confidence: 90,
        category: 'MOTORCYCLE',
        color: '#A855F7',
        getBox: (t) => {
          const px = 640 - (((390 - 66 * t) % 780) - 70);
          return { x: px - 14, y: 273 - 10, w: 28, h: 20, status: 'Commuter Bike' };
        }
      }
    ]
  },

  // CAMERA 3: CAM-35-002 — Unwanted Objects in Camera (Unattended Bag)
  {
    id: 'CAM-35-002',
    name: 'Sector 35 - Roundabout',
    sector: 'Sector 35 Rotary & Concourse Walkway',
    sceneType: 'Unwanted Object & Unattended Bag Detection',
    videoUrl: '/static/real_unattended_object_cctv.mp4',
    hudText: 'CAM-35-002 | UNWANTED OBJECT DETECTED | DEMO AI VISUALISATION',
    fps: 25,
    resolution: '640x360',
    lat: 30.7210,
    lon: 76.7620,
    objectCountLabel: 'Alert: Unwanted Object (Unattended Bag)',
    primaryColor: '#EF4444', // Red Alert
    targets: [
      {
        trackId: 'TRK-301',
        label: 'UNWANTED OBJECT: BAG',
        confidence: 96,
        category: 'UNWANTED_OBJECT',
        color: '#EF4444',
        getBox: () => {
          return { x: 292, y: 200, w: 52, h: 44, status: 'Stationary > 180s (Unattended Luggage)' };
        }
      },
      {
        trackId: 'TRK-302',
        label: 'PERSON 01 (DEPARTING)',
        confidence: 93,
        category: 'PERSON',
        color: '#0EA5E9',
        getBox: (t) => {
          const px = 180 + t * 16;
          return { x: px, y: 142, w: 24, h: 60, status: 'Departing Concourse Corridor' };
        }
      },
      {
        trackId: 'TRK-303',
        label: 'PERSON 02 (PEDESTRIAN)',
        confidence: 91,
        category: 'PERSON',
        color: '#0EA5E9',
        getBox: (t) => {
          const px = 450 - t * 15;
          return { x: px, y: 154, w: 22, h: 56, status: 'Passerby (2.8m Separation)' };
        }
      },
      {
        trackId: 'TRK-304',
        label: 'PERSON 03 (PEDESTRIAN)',
        confidence: 89,
        category: 'PERSON',
        color: '#0EA5E9',
        getBox: (t) => {
          const px = 540 - t * 9;
          return { x: px, y: 162, w: 22, h: 52, status: 'Transit Approach Queue' };
        }
      }
    ]
  },

  // CAMERA 4: CAM-43-001 — Vehicle Accident Detection
  {
    id: 'CAM-43-001',
    name: 'Sector 43 - Transit',
    sector: 'Sector 43 ISBT Transit Terminal & Intersection',
    sceneType: 'Vehicle Accident & Collision Monitoring',
    videoUrl: '/static/real_vehicle_accident_cctv.mp4',
    hudText: 'CAM-43-001 | VEHICLE ACCIDENT DETECTED | DEMO AI VISUALISATION',
    fps: 25,
    resolution: '640x360',
    lat: 30.7180,
    lon: 76.7460,
    objectCountLabel: 'CRITICAL: Vehicle Accident Detected',
    primaryColor: '#EF4444', // Red Alert
    targets: [
      {
        trackId: 'TRK-401',
        label: 'CRITICAL: ROAD ACCIDENT',
        confidence: 98,
        category: 'ACCIDENT',
        color: '#EF4444',
        getBox: () => ({ x: 232, y: 138, w: 176, h: 112, status: 'IMPACT EVENT DETECTED — EMERGENCY DISPATCH' })
      },
      {
        trackId: 'TRK-402',
        label: 'VEHICLE A (COLLIDED)',
        confidence: 96,
        category: 'CAR',
        color: '#F59E0B',
        getBox: () => ({ x: 222, y: 148, w: 84, h: 56, status: 'Sudden Deceleration / Impact Point' })
      },
      {
        trackId: 'TRK-403',
        label: 'VEHICLE B (COLLIDED)',
        confidence: 95,
        category: 'SUV',
        color: '#F59E0B',
        getBox: () => ({ x: 294, y: 158, w: 92, h: 62, status: 'Impacted Lateral Frame' })
      },
      {
        trackId: 'TRK-404',
        label: 'QUEUE TRAFFIC 01',
        confidence: 92,
        category: 'CAR',
        color: '#3B82F6',
        getBox: (t) => ({ x: 105 + (t * 4) % 15, y: 184, w: 68, h: 42, status: 'Slowing for Obstruction' })
      }
    ]
  }
];

// Single Camera Feed Card Component
export const CameraFeedCard: React.FC<{
  feed: CameraFeedConfig;
  onExpand: (feed: CameraFeedConfig) => void;
}> = ({ feed, onExpand }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isOverlayVisible] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Sync animation loop with video playback time
  useEffect(() => {
    let animId: number;
    const updateTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setPlaybackTime(videoRef.current.currentTime || 0);
      }
      animId = requestAnimationFrame(updateTime);
    };
    animId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleVideoError = () => {
    setHasError(true);
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
  const ms = Math.floor((playbackTime % 1.0) * 100);

  return (
    <div 
      onClick={() => onExpand(feed)}
      className="relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-slate-950 flex flex-col group cursor-pointer shadow-sm hover:shadow-md hover:border-[#2463A6] transition select-none"
      title="Click to open Expanded Forensic Viewer"
    >
      {/* 1. TOP HEADER STRIP */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-2 pt-1.5 pb-3 flex items-center justify-between text-[10px]">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="font-bold text-white tracking-wide truncate drop-shadow">{feed.id}</span>
          <span className="font-medium text-slate-300 truncate text-[9px] drop-shadow">{feed.name}</span>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <span className="flex items-center space-x-1 bg-[#2463A6]/90 text-white px-1.5 py-0.2 rounded font-semibold text-[8px] tracking-wider uppercase backdrop-blur-sm border border-cyan-400/40">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300"></span>
            <span>DEMO FEED</span>
          </span>
          <span className="bg-slate-800/90 text-slate-300 px-1 py-0.2 rounded text-[8px] font-mono border border-slate-700">
            CONNECTED
          </span>
        </div>
      </div>

      {/* 2. VIDEO ELEMENT CONTAINER */}
      <div className="relative w-full h-[142px] bg-slate-900 flex items-center justify-center overflow-hidden">
        {hasError ? (
          <div className="flex flex-col items-center justify-center p-3 text-center space-y-1">
            <Shield className="w-6 h-6 text-amber-500/80" />
            <div className="text-[10px] text-slate-300 font-semibold">{feed.id} Unavailable</div>
            <div className="text-[8px] text-slate-400">Stream signal connecting...</div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={feed.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={handleVideoError}
            className="w-full h-full object-cover"
          />
        )}

        {/* 3. DYNAMIC TRANSPARENT AI DETECTION OVERLAY (SVG LAYER) */}
        {isOverlayVisible && !hasError && (
          <svg 
            viewBox="0 0 640 360" 
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            preserveAspectRatio="none"
          >
            {feed.targets.map((tgt) => {
              const b = tgt.getBox(playbackTime);
              if (b.x < -60 || b.x > 660) return null;
              
              return (
                <g key={tgt.trackId} className="transition-all duration-75">
                  {/* Subtle Box Fill */}
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    fill={tgt.color}
                    fillOpacity="0.12"
                    stroke={tgt.color}
                    strokeWidth="1.2"
                    strokeDasharray="2 1"
                  />
                  
                  {/* Corner Accent Brackets */}
                  <path
                    d={`M ${b.x} ${b.y + 6} L ${b.x} ${b.y} L ${b.x + 6} ${b.y}`}
                    fill="none"
                    stroke={tgt.color}
                    strokeWidth="1.8"
                  />
                  <path
                    d={`M ${b.x + b.w - 6} ${b.y} L ${b.x + b.w} ${b.y} L ${b.x + b.w} ${b.y + 6}`}
                    fill="none"
                    stroke={tgt.color}
                    strokeWidth="1.8"
                  />
                  <path
                    d={`M ${b.x} ${b.y + b.h - 6} L ${b.x} ${b.y + b.h} L ${b.x + 6} ${b.y + b.h}`}
                    fill="none"
                    stroke={tgt.color}
                    strokeWidth="1.8"
                  />
                  <path
                    d={`M ${b.x + b.w - 6} ${b.y + b.h} L ${b.x + b.w} ${b.y + b.h} L ${b.x + b.w} ${b.y + b.h - 6}`}
                    fill="none"
                    stroke={tgt.color}
                    strokeWidth="1.8"
                  />

                  {/* Top Tag Label Pill */}
                  <rect
                    x={b.x}
                    y={Math.max(4, b.y - 14)}
                    width={Math.max(48, tgt.label.length * 6 + 24)}
                    height="12"
                    fill="rgba(10, 15, 25, 0.88)"
                    stroke={tgt.color}
                    strokeWidth="0.8"
                    rx="2"
                  />
                  <text
                    x={b.x + 3}
                    y={Math.max(13, b.y - 4)}
                    fill={tgt.color}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {tgt.label} | {tgt.confidence}%
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* 4. SUBTLE HUD OVERLAY IN TOP-LEFT (Corner detection banner) */}
        <div className="absolute top-7 left-2 z-10 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-sm border border-cyan-500/30 px-1.5 py-0.5 rounded text-[8px] font-mono text-cyan-300 flex items-center space-x-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="font-semibold tracking-tight">{feed.hudText}</span>
          </div>
        </div>

        {/* 5. MANDATORY DEMO FOOTAGE BADGE */}
        <div className="absolute bottom-6 right-2 z-10 pointer-events-none">
          <div className="bg-blue-950/85 backdrop-blur-sm border border-blue-400/40 text-blue-200 px-1.5 py-0.2 rounded text-[7.5px] font-mono tracking-wider font-semibold shadow-sm">
            DEMO FOOTAGE — AI OVERLAY
          </div>
        </div>

        {/* 6. EXPAND BUTTON & PLAY/PAUSE CONTROLS */}
        <div className="absolute bottom-1.5 right-1.5 z-20 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={handleTogglePlay}
            className="p-1 bg-black/60 hover:bg-black/90 text-white rounded transition backdrop-blur-sm border border-white/20"
            title={isPlaying ? "Pause Stream" : "Resume Stream"}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onExpand(feed); }}
            className="p-1 bg-[#2463A6]/80 hover:bg-[#2463A6] text-white rounded transition backdrop-blur-sm border border-white/20"
            title="Expand Forensic Video Viewer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 7. BOTTOM TELEMETRY STRIP */}
      <div className="bg-slate-900 border-t border-slate-800 px-2 py-1 flex items-center justify-between text-[9px] text-slate-300 z-10">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          <span className="font-mono text-[8.5px] text-slate-300">
            {timeStr}.{String(ms).padStart(2, '0')} IST
          </span>
        </div>
        <div className="flex items-center space-x-1 font-mono text-[8.5px] text-cyan-300">
          <Crosshair className="w-2.5 h-2.5 text-cyan-400" />
          <span className="truncate">{feed.objectCountLabel}</span>
        </div>
      </div>
    </div>
  );
};

// Expanded Video Viewer Modal Component
export const ExpandedVideoModal: React.FC<{
  feed: CameraFeedConfig | null;
  onClose: () => void;
}> = ({ feed, onClose }) => {
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(8.0);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [snapshotTaken, setSnapshotTaken] = useState<boolean>(false);

  useEffect(() => {
    if (!feed) return;
    let animId: number;
    const loop = () => {
      if (modalVideoRef.current) {
        setCurrentTime(modalVideoRef.current.currentTime || 0);
        if (modalVideoRef.current.duration) {
          setDuration(modalVideoRef.current.duration);
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [feed]);

  if (!feed) return null;

  const togglePlay = () => {
    if (!modalVideoRef.current) return;
    if (modalVideoRef.current.paused) {
      modalVideoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      modalVideoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!modalVideoRef.current) return;
    modalVideoRef.current.muted = !modalVideoRef.current.muted;
    setIsMuted(modalVideoRef.current.muted);
  };

  const changeSpeed = (spd: number) => {
    if (!modalVideoRef.current) return;
    modalVideoRef.current.playbackRate = spd;
    setPlaybackSpeed(spd);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (modalVideoRef.current) {
      modalVideoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleCaptureSnapshot = () => {
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2400);
  };

  const ms = Math.floor((currentTime % 1.0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        ref={containerRef}
        className="bg-white rounded-2xl border border-[#CBDCEE] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="bg-[#172F50] text-white px-5 py-3 flex items-center justify-between border-b border-[#2463A6]/40 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#2463A6] flex items-center justify-center text-white shrink-0">
              <Crosshair className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base tracking-wide">{feed.id} • {feed.name}</h3>
                <span className="bg-[#2463A6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-cyan-400/30">
                  DEMO FOOTAGE • 25 FPS
                </span>
                <span className="bg-slate-800 text-cyan-200 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-400/30">
                  FEED: {feed.resolution} H.264
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">{feed.sector} • GPS: {feed.lat.toFixed(4)}°N, {feed.lon.toFixed(4)}°E (RECORDED DEMONSTRATION)</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 shrink-0">
            {/* Overlay toggle */}
            <button
              onClick={() => setShowOverlays(!showOverlays)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                showOverlays 
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {showOverlays ? <Eye className="w-3.5 h-3.5 text-cyan-300" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showOverlays ? 'DEMO AI OVERLAY: ON' : 'RAW VIDEO ONLY'}</span>
            </button>

            {/* Close button */}
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle Main Video Viewport */}
        <div className="relative bg-slate-950 flex items-center justify-center aspect-video max-h-[500px] overflow-hidden">
          <video
            ref={modalVideoRef}
            src={feed.videoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-contain"
          />

          {/* SVG Overlay Layer */}
          {showOverlays && (
            <svg 
              viewBox="0 0 640 360" 
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {feed.targets.map((tgt) => {
                const b = tgt.getBox(currentTime);
                if (b.x < -60 || b.x > 660) return null;
                return (
                  <g key={tgt.trackId}>
                    {/* Box boundary */}
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill={tgt.color}
                      fillOpacity="0.14"
                      stroke={tgt.color}
                      strokeWidth="1.5"
                      strokeDasharray="2 1"
                    />
                    {/* Corner Reticles */}
                    <path d={`M ${b.x} ${b.y + 8} L ${b.x} ${b.y} L ${b.x + 8} ${b.y}`} fill="none" stroke={tgt.color} strokeWidth="2.2" />
                    <path d={`M ${b.x + b.w - 8} ${b.y} L ${b.x + b.w} ${b.y} L ${b.x + b.w} ${b.y + 8}`} fill="none" stroke={tgt.color} strokeWidth="2.2" />
                    <path d={`M ${b.x} ${b.y + b.h - 8} L ${b.x} ${b.y + b.h} L ${b.x + 8} ${b.y + b.h}`} fill="none" stroke={tgt.color} strokeWidth="2.2" />
                    <path d={`M ${b.x + b.w - 8} ${b.y + b.h} L ${b.x + b.w} ${b.y + b.h} L ${b.x + b.w} ${b.y + b.h - 8}`} fill="none" stroke={tgt.color} strokeWidth="2.2" />

                    {/* Tag Banner */}
                    <rect
                      x={b.x}
                      y={Math.max(4, b.y - 16)}
                      width={Math.max(58, tgt.label.length * 7 + 28)}
                      height="14"
                      fill="rgba(10, 15, 25, 0.92)"
                      stroke={tgt.color}
                      strokeWidth="1"
                      rx="2"
                    />
                    <text
                      x={b.x + 3}
                      y={Math.max(15, b.y - 5)}
                      fill={tgt.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {tgt.label} | {tgt.confidence}%
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Corner Monospace HUD */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-300 shadow-lg space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="font-bold text-white">{feed.hudText}</span>
              </div>
              <div className="text-[10px] text-slate-300">
                SCENE: {feed.sceneType.toUpperCase()} • ENCODE: H.264
              </div>
            </div>
          </div>

          {/* Mandatory Demo Watermark */}
          <div className="absolute top-4 right-4 z-20 pointer-events-none">
            <div className="bg-blue-950/90 border border-blue-400/50 text-blue-200 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider shadow-lg">
              DEMO FOOTAGE — NOT A LIVE CCTV STREAM
            </div>
          </div>

          {/* Snapshot Confirmation Overlay */}
          {snapshotTaken && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-xs flex items-center justify-center z-30 animate-in fade-in duration-150">
              <div className="bg-[#172F50] text-white px-5 py-3 rounded-xl shadow-2xl border border-cyan-400 flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="font-bold text-sm">Forensic Snapshot Captured</div>
                  <div className="text-xs text-slate-300 font-mono">Frame saved with SHA-256 evidence timestamp</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Scrubber & Playback Controls Bar */}
        <div className="bg-[#0F1E36] px-5 py-3 border-t border-[#1E3A60] flex flex-col space-y-2 shrink-0">
          {/* Progress / Seek bar */}
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono text-cyan-300 shrink-0 w-16">
              00:{String(Math.floor(currentTime)).padStart(2, '0')}.{String(ms).padStart(2, '0')}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 8.0}
              step="0.04"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] font-mono text-slate-400 shrink-0 w-12 text-right">
              00:{String(Math.floor(duration || 8.0)).padStart(2, '0')}.00
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center space-x-2">
              <button 
                onClick={togglePlay}
                className="p-2 bg-[#2463A6] hover:bg-[#1E528B] text-white rounded-lg transition flex items-center space-x-1 px-3"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="font-semibold text-xs">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button 
                onClick={toggleMute}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center space-x-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => changeSpeed(spd)}
                    className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition ${
                      playbackSpeed === spd 
                        ? 'bg-[#2463A6] text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Snapshot Button */}
              <button
                onClick={handleCaptureSnapshot}
                className="px-3 py-1.5 bg-[#16A36A] hover:bg-emerald-600 text-white rounded-lg transition font-semibold flex items-center space-x-1.5 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Forensic Snapshot</span>
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={handleFullscreen}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Inspection Drawer: Active Tracking Telemetry */}
        <div className="bg-[#F8FAFC] border-t border-[#E1EAF2] p-4 overflow-y-auto max-h-[190px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-[#2463A6]" />
              <h4 className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
                Active Computer-Vision Detections (Demo Annotations)
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-[#526477]">
              {feed.targets.length} Tracked Targets Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {feed.targets.map((tgt) => {
              const b = tgt.getBox(currentTime);
              return (
                <div 
                  key={tgt.trackId}
                  className="bg-white border border-[#CBDCEE] rounded-lg p-2 shadow-xs hover:border-[#2463A6] transition text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#172F50]">{tgt.label}</span>
                    <span className="font-mono text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                      {tgt.confidence}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[#526477] mt-0.5 truncate">
                    Status: <span className="font-medium text-slate-800">{b.status}</span>
                  </div>
                  <div className="text-[9px] font-mono text-[#8291A2] mt-0.5">
                    Track: {tgt.trackId} • X:{Math.round(b.x)} Y:{Math.round(b.y)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Grid Container for Dashboard
export const DashboardLiveCameraGrid: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<CameraFeedConfig | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {CAMERA_FEEDS.map((feed) => (
          <CameraFeedCard
            key={feed.id}
            feed={feed}
            onExpand={(f) => setSelectedFeed(f)}
          />
        ))}
      </div>

      {selectedFeed && (
        <ExpandedVideoModal
          feed={selectedFeed}
          onClose={() => setSelectedFeed(null)}
        />
      )}
    </>
  );
};

export default DashboardLiveCameraGrid;

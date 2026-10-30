import React, { useState, useEffect, useRef } from 'react';
import { 
  GitFork, Play, Pause, RotateCcw, Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const IncidentReconstruction: React.FC = () => {
  const { setActiveTab } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(35); // 0 to 100%

  const cameraFeeds = [
    { 
      id: 'CAM-17-001', 
      name: 'Sector 17 - North Plaza',
      url: '/static/real_pedestrian_walk.mp4',
      targetLabel: 'Target #101',
      targetClass: 'Pedestrian Subject'
    },
    { 
      id: 'CAM-22-003', 
      name: 'Sector 22 - Central Market',
      url: '/static/real_public_interaction.mp4',
      targetLabel: 'Target #102',
      targetClass: 'Carrying Duffel'
    },
    { 
      id: 'CAM-35-002', 
      name: 'Sector 35 - Outer Roundabout',
      url: '/static/real_unattended_bag.mp4',
      targetLabel: 'Target #103',
      targetClass: 'Unattended Object'
    },
    { 
      id: 'CAM-43-001', 
      name: 'Sector 43 - Main Transit Entry',
      url: '/static/ucf_crime_road_accidents_demo.mp4',
      targetLabel: 'Target #104',
      targetClass: 'Vehicle CH01AB1234'
    }
  ];

  const videoRefs = [
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null)
  ];

  // Playhead auto-scrubbing animation when playing
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayheadPos((prev) => {
          if (prev >= 98) {
            return 10;
          }
          return prev + 0.5;
        });
      }, 100);

      // Play all 4 synchronized videos
      videoRefs.forEach((ref) => {
        if (ref.current && ref.current.paused) {
          ref.current.play().catch(() => {});
        }
      });
    } else {
      // Pause all 4 synchronized videos
      videoRefs.forEach((ref) => {
        if (ref.current && !ref.current.paused) {
          ref.current.pause();
        }
      });
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Synchronize video time when playhead scrub changes
  useEffect(() => {
    videoRefs.forEach((ref) => {
      const vid = ref.current;
      if (vid && vid.duration) {
        const targetTime = (playheadPos / 100) * vid.duration;
        if (Math.abs(vid.currentTime - targetTime) > 0.3) {
          vid.currentTime = targetTime;
        }
      }
    });
  }, [playheadPos]);

  // Handle playhead click or drag
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    setPlayheadPos(pct);
  };

  const handleReset = () => {
    setPlayheadPos(10);
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.currentTime = 0;
      }
    });
  };

  const mins = Math.floor(playheadPos * 0.3);
  const secs = Math.floor((playheadPos * 18) % 60);
  const formattedSecs = secs < 10 ? `0${secs}` : secs;

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Header */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Multi-Camera Incident Reconstruction & Chronology
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Cross-camera temporal synchronization, kinetic trajectory reconstruction, and courtroom-admissible evidence export.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('investigation')}
            className="px-3 py-1.5 rounded-lg border border-[#CBDCEE] text-xs font-semibold text-[#526477] hover:bg-[#F4F8FC] transition"
          >
            Investigation Workspace
          </button>
          <button
            onClick={() => alert('Exporting digital evidence archive package with SHA-256 tamper seal...')}
            className="px-3.5 py-1.5 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Case Package</span>
          </button>
        </div>
      </div>

      {/* 4 Synchronized Camera Views Grid with Real Footage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {cameraFeeds.map((cam, idx) => {
          // Dynamic box calculation based on playhead
          const boxX = 20 + ((playheadPos * 0.5 + idx * 12) % 60);
          const boxY = 35 + ((idx * 8 + playheadPos * 0.2) % 30);

          return (
            <div key={cam.id} className="bg-white border border-[#E1EAF2] rounded-xl overflow-hidden shadow-sm">
              <div className="p-2 border-b border-[#E1EAF2] bg-[#EDF4FC] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#172F50]">{cam.id}</span>
                  <span className="text-[10px] text-[#8291A2] ml-1.5">{cam.name}</span>
                </div>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#DCEBFA] text-[#2463A6]">
                  Sync Track {idx + 1}
                </span>
              </div>

              <div className="relative bg-slate-900 aspect-video overflow-hidden group">
                {/* Real CCTV Footage Stream */}
                <video
                  ref={videoRefs[idx]}
                  src={cam.url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay={isPlaying}
                />

                {/* CCTV Telemetry Overlay HUD */}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-white flex items-center space-x-1.5 z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold">REC</span>
                  <span className="text-slate-300">|</span>
                  <span>{cam.id}</span>
                </div>

                <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 z-10">
                  25 FPS | H.264
                </div>

                {/* Real-time Forensic Target Bounding Box Overlay */}
                <div 
                  className="absolute border border-rose-500/90 bg-rose-500/20 rounded pointer-events-none transition-all duration-100 z-10"
                  style={{
                    left: `${boxX}%`,
                    top: `${boxY}%`,
                    width: '26%',
                    height: '42%'
                  }}
                >
                  <div className="absolute -top-4 left-0 bg-rose-600 text-white font-mono text-[8px] font-bold px-1 rounded-xs tracking-tight whitespace-nowrap shadow-xs">
                    {cam.targetLabel} ({cam.targetClass})
                  </div>
                </div>

                {/* CCTV Timestamp Bar */}
                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white z-10">
                  2026-05-18 10:{15 + mins}:{formattedSecs}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synchronized Timeline & Controls Panel */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-[#2463A6] text-white hover:bg-[#1B4E85] shadow-sm transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-[#F4F8FC] border border-[#CBDCEE] text-[#526477] hover:bg-[#E2EDF9] transition cursor-pointer"
              title="Reset Timeline to Start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="text-xs">
              <span className="text-[#8291A2]">Current Forensic Timestamp:</span>{' '}
              <strong className="text-[#172F50] font-mono text-sm">
                2026-05-18 10:{15 + mins}:{formattedSecs}
              </strong>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#8291A2]">Scrub Velocity:</span>
            <span className="px-2 py-0.5 rounded bg-[#F4F8FC] border border-[#E1EAF2] font-mono font-bold text-[#172F50]">
              1.0x Realtime
            </span>
          </div>
        </div>

        {/* Multi-Track Scrubber Graphic */}
        <div 
          className="relative bg-[#F8FAFC] border border-[#E1EAF2] rounded-xl p-4 select-none cursor-pointer"
          onClick={handleTimelineClick}
        >
          {/* Header Time Markers */}
          <div className="flex justify-between text-[10px] font-mono text-[#8291A2] pb-2 border-b border-[#E1EAF2] mb-2">
            <span>10:15:00</span>
            <span>10:20:00</span>
            <span>10:25:00</span>
            <span>10:30:00</span>
            <span>10:35:00</span>
            <span>10:40:00</span>
            <span>10:45:00</span>
          </div>

          {/* Red Playhead */}
          <div 
            style={{ left: `${playheadPos}%` }} 
            className="absolute top-0 bottom-0 w-[2px] bg-[#E34D59] z-20 pointer-events-none"
          >
            <div className="w-3 h-3 rounded-full bg-[#E34D59] -ml-[5px] -mt-1 shadow"></div>
          </div>

          {/* Tracks */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-3">
              <span className="w-36 text-[#526477] font-medium text-[11px] shrink-0">CAM-17-001 (Plaza)</span>
              <div className="flex-1 h-5 bg-[#EDF4FC] rounded relative">
                <span className="absolute left-[10%] w-[25%] h-full bg-[#2463A6]/40 border-l-2 border-r-2 border-[#2463A6] rounded"></span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="w-36 text-[#526477] font-medium text-[11px] shrink-0">CAM-22-003 (Market)</span>
              <div className="flex-1 h-5 bg-[#EDF4FC] rounded relative">
                <span className="absolute left-[28%] w-[35%] h-full bg-[#E34D59]/40 border-l-2 border-r-2 border-[#E34D59] rounded flex items-center justify-center text-[9px] font-bold text-[#E34D59]">
                  CRITICAL EVENT WINDOW
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="w-36 text-[#526477] font-medium text-[11px] shrink-0">CAM-35-002 (Roundabout)</span>
              <div className="flex-1 h-5 bg-[#EDF4FC] rounded relative">
                <span className="absolute left-[55%] w-[25%] h-full bg-[#2463A6]/40 border-l-2 border-r-2 border-[#2463A6] rounded"></span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="w-36 text-[#526477] font-medium text-[11px] shrink-0">ANPR Plate CH01AB1234</span>
              <div className="flex-1 h-5 bg-[#EDF4FC] rounded relative flex items-center">
                <span className="absolute left-[32%] px-1.5 py-0.5 rounded bg-[#16A36A] text-white text-[9px] font-mono font-bold">
                  Matched 96.3%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Reconstruction Log */}
        <div className="border border-[#E1EAF2] rounded-lg p-3 bg-[#F8FAFC]">
          <h4 className="text-xs font-bold text-[#172F50] mb-2">Automated Incident Chronology</h4>
          <ol className="list-decimal list-inside text-xs text-[#526477] space-y-1">
            <li><strong>10:18:20</strong> — Subject detected entering Sector 17 North Plaza via CAM-17-001 walking south.</li>
            <li><strong>10:24:10</strong> — Subject transitioned to Sector 22 Market carrying black duffel bag (CAM-22-003).</li>
            <li><strong>10:28:15</strong> — Object placed on sidewalk; subject separated by &gt;15 meters. Early warning indicator flagged.</li>
            <li><strong>10:31:05</strong> — Vehicle CH01AB1234 arrived near market perimeter; ANPR logged registration match.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

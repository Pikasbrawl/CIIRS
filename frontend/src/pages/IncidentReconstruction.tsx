import React, { useState, useEffect, useRef } from 'react';
import { 
  GitFork, Play, Pause, RotateCcw, Video, Clock, 
  MapPin, Shield, Download, Camera, Maximize2, CheckCircle2 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const IncidentReconstruction: React.FC = () => {
  const { setActiveTab } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(35); // 0 to 100%
  const [activeIncident, setActiveIncident] = useState({
    title: 'Suspicious Person Loitering & Unattended Object',
    time: '2026-05-18 10:28:15',
    primaryCam: 'CAM-22-003',
    location: 'Sector 22 Market',
    severity: 'High'
  });

  const canvasRefs = [
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null)
  ];

  // Playhead auto-scrubbing animation when playing
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayheadPos((prev) => (prev >= 98 ? 10 : prev + 0.5));
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Synchronized canvas playback
  useEffect(() => {
    let animId: number;
    const renderCanvases = () => {
      canvasRefs.forEach((ref, idx) => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = idx % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Ground walkway
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, h * 0.5, w, h * 0.5);

        // Simulated tracked subject
        const xPos = ((playheadPos / 100) * w * 0.8) + (idx * 15);
        const yPos = h * 0.65;

        // Bounding Box
        ctx.strokeStyle = '#E34D59';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(xPos - 12, yPos - 24, 24, 38);
        ctx.fillStyle = 'rgba(227, 77, 89, 0.2)';
        ctx.fillRect(xPos - 12, yPos - 24, 24, 38);

        ctx.fillStyle = '#E34D59';
        ctx.font = '8px monospace';
        ctx.fillText(`Target #${101 + idx}`, xPos - 12, yPos - 27);

        // Timestamp
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(4, h - 18, 90, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        const mins = Math.floor(playheadPos * 0.3);
        const secs = Math.floor((playheadPos * 18) % 60);
        ctx.fillText(`10:${15 + mins}:${secs < 10 ? '0' : ''}${secs}`, 8, h - 8);
      });

      animId = requestAnimationFrame(renderCanvases);
    };

    renderCanvases();
    return () => cancelAnimationFrame(animId);
  }, [playheadPos]);

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

      {/* 4 Synchronized Camera Views Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: 'CAM-17-001', name: 'Sector 17 - North Plaza' },
          { id: 'CAM-22-003', name: 'Sector 22 - Central Market' },
          { id: 'CAM-35-002', name: 'Sector 35 - Outer Roundabout' },
          { id: 'CAM-43-001', name: 'Sector 43 - Main Transit Entry' }
        ].map((cam, idx) => (
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
            <div className="relative bg-slate-900 aspect-video">
              <canvas ref={canvasRefs[idx]} width={300} height={170} className="w-full h-full object-cover" />
            </div>
          </div>
        ))}
      </div>

      {/* Synchronized Timeline & Controls Panel */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-[#2463A6] text-white hover:bg-[#1B4E85] shadow-sm transition"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => setPlayheadPos(10)}
              className="p-2 rounded-lg bg-[#F4F8FC] border border-[#CBDCEE] text-[#526477] hover:bg-[#E2EDF9] transition"
              title="Reset Timeline to Start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="text-xs">
              <span className="text-[#8291A2]">Current Forensic Timestamp:</span>{' '}
              <strong className="text-[#172F50] font-mono text-sm">
                2026-05-18 10:{15 + Math.floor(playheadPos * 0.3)}:{Math.floor((playheadPos * 18) % 60) < 10 ? '0' : ''}{Math.floor((playheadPos * 18) % 60)}
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
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
            setPlayheadPos(pct);
          }}
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

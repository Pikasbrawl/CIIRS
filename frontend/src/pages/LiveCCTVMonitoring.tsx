import React, { useState, useEffect } from 'react';
import { 
  Video, Grid2X2, Grid3X3, Maximize2, Camera, ShieldAlert, 
  RefreshCw, Play, Volume2, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Camera as CameraType } from '../types';

export const LiveCCTVMonitoring: React.FC = () => {
  const { triggerScenario, isTriggeringScenario } = useApp();
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [gridMode, setGridMode] = useState<'2x2' | '3x3' | 'single'>('2x2');
  const [selectedCam, setSelectedCam] = useState<CameraType | null>(null);

  useEffect(() => {
    api.getCameras().then((res) => {
      setCameras(res);
      if (res.length > 0) setSelectedCam(res[0]);
    });
  }, []);

  const displayedCameras = gridMode === 'single' && selectedCam 
    ? [selectedCam] 
    : gridMode === '2x2' 
    ? cameras.slice(0, 4) 
    : cameras.slice(0, 9);

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Header & Grid Controls */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Live CCTV Video Monitoring Matrix
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Multi-grid stream telemetry, anonymous kinetic tracking bounding boxes, and lens health monitoring.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Grid Layout Switcher */}
          <div className="flex items-center bg-[#F4F8FC] p-1 rounded-lg border border-[#E1EAF2]">
            <button
              onClick={() => setGridMode('2x2')}
              className={`p-1.5 rounded text-xs transition ${gridMode === '2x2' ? 'bg-[#2463A6] text-white font-bold' : 'text-[#526477] hover:text-[#172F50]'}`}
              title="2x2 Grid View"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('3x3')}
              className={`p-1.5 rounded text-xs transition ${gridMode === '3x3' ? 'bg-[#2463A6] text-white font-bold' : 'text-[#526477] hover:text-[#172F50]'}`}
              title="3x3 Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('single')}
              className={`p-1.5 rounded text-xs transition ${gridMode === 'single' ? 'bg-[#2463A6] text-white font-bold' : 'text-[#526477] hover:text-[#172F50]'}`}
              title="Single Focused View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => triggerScenario('Fall Detection', selectedCam?.camera_id || 'CAM-17-001')}
            disabled={isTriggeringScenario}
            className="px-3.5 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center space-x-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Incident</span>
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`grid gap-4 ${
        gridMode === 'single' 
          ? 'grid-cols-1' 
          : gridMode === '2x2' 
          ? 'grid-cols-1 md:grid-cols-2' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {displayedCameras.map((cam, idx) => {
          const isDegraded = cam.status === 'DEGRADED';
          return (
            <div
              key={cam.id}
              onClick={() => setSelectedCam(cam)}
              className={`relative rounded-xl overflow-hidden border bg-white group cursor-pointer transition-all shadow-sm ${
                selectedCam?.id === cam.id ? 'border-[#2463A6] ring-2 ring-[#2463A6]/20' : 'border-[#E1EAF2] hover:border-[#CBDCEE]'
              }`}
            >
              {/* Simulated Camera Video Canvas with animated elements */}
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                {/* Background CCTV grid pattern */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

                {/* Simulated Walking pedestrians / Bounding Boxes */}
                <div className="absolute inset-0 pointer-events-none p-4">
                  {/* Subject Box 1 */}
                  <div 
                    className="absolute border border-cyan-400 text-[9px] font-mono text-cyan-300 p-1 rounded-sm bg-cyan-950/20"
                    style={{
                      top: `${30 + (idx * 8) % 30}%`,
                      left: `${20 + (idx * 15) % 55}%`,
                      width: '65px',
                      height: '110px'
                    }}
                  >
                    <div className="bg-cyan-950 text-[8px] px-1 py-0.2 rounded -mt-3.5 mb-1 inline-block border border-cyan-800">
                      TRK-{idx + 10} • WALKING
                    </div>
                  </div>

                  {/* If degraded camera, show obstruction overlay */}
                  {isDegraded && (
                    <div className="absolute inset-0 bg-[#E5A12B]/20 backdrop-blur-[2px] flex items-center justify-center p-4">
                      <div className="p-3 rounded-lg bg-black/85 border border-[#E5A12B] text-center text-[#E5A12B]">
                        <AlertCircle className="w-5 h-5 mx-auto mb-1 animate-pulse" />
                        <div className="text-xs font-bold font-mono">LENS PARTIAL OBSTRUCTION</div>
                        <div className="text-[10px] text-slate-300">Reliability degraded (Trust: {cam.trust_score}%)</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Corner Telemetry Overlay */}
                <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-black/75 px-2 py-1 rounded text-[10px] font-mono">
                  <span className={`w-2 h-2 rounded-full ${cam.status === 'ONLINE' ? 'bg-[#16A36A] animate-pulse' : 'bg-[#E5A12B]'}`}></span>
                  <span className="font-bold text-white">{cam.camera_id}</span>
                  <span className="text-slate-300">• {cam.fps} FPS</span>
                </div>

                <div className="absolute top-2 right-2 bg-black/75 px-2 py-1 rounded text-[10px] font-mono text-[#DCEBFA]">
                  TRUST: {cam.trust_score}%
                </div>

                <div className="absolute bottom-2 left-2 bg-black/80 px-2.5 py-1 rounded text-[10px] text-slate-200 max-w-[85%] truncate">
                  <strong>{cam.name}</strong> • {cam.area_zone}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

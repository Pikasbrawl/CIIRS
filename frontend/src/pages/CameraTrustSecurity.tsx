import React, { useState, useEffect } from 'react';
import { 
  Camera, ShieldCheck, AlertTriangle, Activity, Wifi, 
  RotateCcw, Sliders, CheckCircle2, ShieldAlert 
} from 'lucide-react';
import { api } from '../services/api';
import { Camera as CameraType } from '../types';

export const CameraTrustSecurity: React.FC = () => {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [selectedCam, setSelectedCam] = useState<CameraType | null>(null);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);

  // Simulation controls for testing camera degradation
  const [simPing, setSimPing] = useState(16.4);
  const [simFps, setSimFps] = useState(29.8);
  const [simDropped, setSimDropped] = useState(0);
  const [simFrozen, setSimFrozen] = useState(0);
  const [simObstructed, setSimObstructed] = useState(false);
  const [simTampered, setSimTampered] = useState(false);

  const fetchCameras = async () => {
    try {
      const data = await api.getCameras();
      setCameras(data);
      if (data.length > 0 && !selectedCam) {
        handleSelectCam(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCam = async (cam: CameraType) => {
    setSelectedCam(cam);
    setSimFps(cam.fps);
    setSimObstructed(cam.is_obstructed);
    setSimTampered(cam.is_tampered);
    try {
      const logs = await api.getCameraHealthLogs(cam.camera_id);
      setHealthLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleUpdateTelemetry = async () => {
    if (!selectedCam) return;
    try {
      await api.updateCameraTelemetry(selectedCam.camera_id, {
        ping_ms: Number(simPing),
        fps_actual: Number(simFps),
        dropped_frames: Number(simDropped),
        frozen_frames: Number(simFrozen),
        is_obstructed: simObstructed,
        is_tampered: simTampered
      });
      await fetchCameras();
      const updated = await api.getCameras();
      const match = updated.find((c) => c.camera_id === selectedCam.camera_id);
      if (match) handleSelectCam(match);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center space-x-2">
            <Camera className="w-5 h-5 text-pink-400" />
            <span>CCTV STREAM TRUST & SYSTEM INTEGRITY</span>
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-950 text-pink-400 border border-pink-800 font-bold">
            CONTINUOUS HEALTH AUDIT
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Real-time diagnostics for frame jitter, obstruction detection, dropped frames, and tampering. A low-trust score mandates technical review.
        </p>
      </div>

      {/* Camera Grid & Diagnostics View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Camera Trust Scoreboard */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            Camera Trust Scoreboard
          </span>

          <div className="space-y-2">
            {cameras.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCam(c)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                  selectedCam?.id === c.id ? 'bg-slate-800 border-cyan-500' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <span>{c.camera_id}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({c.name})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{c.fps} FPS • {c.area_zone}</div>
                </div>

                <div className="text-right">
                  <div className={`font-mono font-bold text-sm ${
                    c.trust_score >= 85 ? 'text-emerald-400' : c.trust_score >= 70 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {c.trust_score}%
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">{c.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2-Cols: Diagnostics, Health Logs & Simulation */}
        {selectedCam && (
          <div className="lg:col-span-2 space-y-4">
            {/* Live Camera Health Breakdown */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedCam.camera_id} – {selectedCam.name}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{selectedCam.address}</div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Reliability Grade:</div>
                  <div className={`text-base font-mono font-bold ${
                    selectedCam.trust_score >= 85 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {selectedCam.trust_score >= 85 ? 'HIGH_TRUST' : 'DEGRADED_TRUST'} ({selectedCam.trust_score}%)
                  </div>
                </div>
              </div>

              {/* Low Trust Warning Notice if applicable */}
              {selectedCam.trust_score < 75 && (
                <div className="p-3 bg-amber-950/40 border border-amber-600/70 rounded-lg text-xs text-amber-200 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    <strong>TECHNICAL REVIEW MANDATORY:</strong> Camera trust has fallen below the 75% evidentiary confidence threshold. Evidence must be corroborated by adjacent nodes prior to emergency escalation.
                  </span>
                </div>
              )}

              {/* Interactive Telemetry Degradation Simulator */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Simulate Network / Sensor Degradation (Test Trust Model)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400">Ping Latency ({simPing} ms)</label>
                    <input
                      type="range"
                      min="10"
                      max="350"
                      value={simPing}
                      onChange={(e) => setSimPing(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Actual FPS ({simFps})</label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={simFps}
                      onChange={(e) => setSimFps(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400">Dropped Frames ({simDropped})</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={simDropped}
                      onChange={(e) => setSimDropped(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="flex flex-col justify-end space-y-1">
                    <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simObstructed}
                        onChange={(e) => setSimObstructed(e.target.checked)}
                        className="rounded"
                      />
                      <span>Lens Obstructed</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simTampered}
                        onChange={(e) => setSimTampered(e.target.checked)}
                        className="rounded"
                      />
                      <span>Stream Tampered</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleUpdateTelemetry}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs rounded-lg transition"
                >
                  Recalculate Reliability Score
                </button>
              </div>

              {/* Health Logs */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Recent Telemetry Audit Logs
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {healthLogs.map((log) => (
                    <div key={log.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs flex items-center justify-between font-mono">
                      <span className="text-slate-300">{log.status_message}</span>
                      <span className="text-cyan-400">{log.fps_actual} FPS • {log.ping_ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

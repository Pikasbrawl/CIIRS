import React, { useState, useEffect } from 'react';
import { 
  Network, Camera, Clock, ArrowRight, ShieldCheck, AlertTriangle, 
  CheckCircle2, UserCheck, Eye, Layers 
} from 'lucide-react';
import { api } from '../services/api';

export const MultiCameraIntelligence: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getMultiCameraCorrelations().then((res) => setData(res));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center space-x-2">
            <Network className="w-5 h-5 text-purple-400" />
            <span>MULTI-CAMERA CROSS-NODE INTELLIGENCE</span>
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-bold">
            ANONYMOUS TRAJECTORY SYNTHESIS
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Correlates timestamps, directional velocity vectors, and transit corridors across camera nodes. Flags ambiguous associations for human verification.
        </p>
      </div>

      {/* Ethics & Compliance Notice */}
      <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Non-Biometric Anonymous Kinematics Standard: <strong>Active</strong> (Zero facial recognition or demographic features).</span>
        </div>
        <span className="text-[10px] text-cyan-400 font-mono">ISO/IEC 27701 COMPLIANT</span>
      </div>

      {/* Unified Timeline & Cross-Camera Chains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Correlated Trajectory Sequence Chains */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Cross-Camera Trajectory Chains
            </span>
            <span className="text-[10px] font-mono text-purple-400">WAYPOINTS</span>
          </div>

          <div className="space-y-3">
            {data?.chains?.map((chain: any) => (
              <div key={chain.track_chain_id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white text-xs">{chain.track_chain_id}</span>
                  {chain.human_review_required ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>UNCERTAIN LINK: HUMAN REVIEW REQ</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      CORRELATED ({(chain.confidence * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>

                {/* Waypoint Sequence */}
                <div className="flex items-center space-x-2 overflow-x-auto py-1">
                  {chain.waypoints.map((wp: any, i: number) => (
                    <React.Fragment key={i}>
                      <div className={`p-2 rounded border text-[11px] shrink-0 ${
                        wp.is_uncertain_link ? 'bg-amber-950/40 border-amber-600 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}>
                        <div className="font-mono font-bold text-cyan-400">{wp.camera_id}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{wp.camera_name}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{wp.motion_direction}</div>
                      </div>
                      {i < chain.waypoints.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Association Notes */}
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  {chain.association_notes?.join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Unified Multi-Camera Chronological Event Timeline */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Unified Incident Reconstruction Timeline
            </span>
            <span className="text-[10px] font-mono text-cyan-400">CHRONOLOGICAL</span>
          </div>

          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {data?.unified_timeline?.map((item: any, idx: number) => (
              <div key={idx} className="relative group">
                <span className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                  item.human_review_required ? 'bg-amber-400 animate-ping' : 'bg-cyan-400'
                }`}></span>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-cyan-400 font-semibold">{item.time} UTC</span>
                    <span className="font-mono text-[10px] text-slate-400">{item.camera_id}</span>
                  </div>
                  <div className="font-bold text-slate-200">{item.camera_name}</div>
                  <div className="text-slate-400 leading-relaxed">{item.event}</div>
                  {item.human_review_required && (
                    <div className="mt-2 text-[10px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-900 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Operator inspection recommended before confirming track continuation.</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Activity, Zap, Users, Compass, Eye, Sliders, Shield, AlertTriangle, 
  ArrowRight, ShieldCheck, Play 
} from 'lucide-react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { useApp } from '../context/AppContext';

export const BehaviourIntelligence: React.FC = () => {
  const { setActiveTab } = useApp();

  // Threshold tuners
  const [motionThreshold, setMotionThreshold] = useState(3.5);
  const [proximityThreshold, setProximityThreshold] = useState(40);
  const [crowdDensityThreshold, setCrowdDensityThreshold] = useState(10);
  const [dwellTimeThreshold, setDwellTimeThreshold] = useState(25);

  const radarData = [
    { metric: 'Velocity Vector', value: 82, baseline: 30 },
    { metric: 'Direction Divergence', value: 74, baseline: 25 },
    { metric: 'Crowd Density', value: 88, baseline: 40 },
    { metric: 'Interaction Proximity', value: 92, baseline: 20 },
    { metric: 'Posture Abnormality', value: 65, baseline: 15 },
    { metric: 'Temporal Persistence', value: 78, baseline: 35 }
  ];

  const zoneEntropyData = [
    { zone: 'Platform 3 Egress', kinetic_energy: 88, dispersion_entropy: 76 },
    { zone: 'Central Concourse', kinetic_energy: 35, dispersion_entropy: 28 },
    { zone: 'Underpass B', kinetic_energy: 94, dispersion_entropy: 82 },
    { zone: 'East Checkpoint', kinetic_energy: 22, dispersion_entropy: 18 },
    { zone: 'Escalator Skywalk', kinetic_energy: 48, dispersion_entropy: 42 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>BEHAVIOUR INTELLIGENCE & SPATIAL KINETICS</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              PHYSICAL VECTOR ANALYTICS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Continuous optical flow variance, crowd entropy dispersion, and multi-agent interaction proximity metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400">
            ETHICAL COMPLIANCE: 100%
          </span>
        </div>
      </div>

      {/* Primary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: 6-Dimensional Kinematic Radar */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-200">Pre-Incident Kinetic Radar</h3>
              <p className="text-[11px] text-slate-400">Active sequence vs nominal baseline</p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">MULTI-FACTOR</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis stroke="#475569" fontSize={9} />
                <Radar name="Active Feed" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.45} />
                <Radar name="Nominal Baseline" dataKey="baseline" stroke="#64748b" fill="#64748b" fillOpacity={0.15} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
            Interaction Proximity (92/100) and Crowd Density (88/100) are the predominant drivers of the active early warning signal.
          </div>
        </div>

        {/* Center Col: Kinetic Energy & Dispersion Entropy by Zone */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-200">Zone Kinetic Energy vs Dispersion Entropy</h3>
              <p className="text-[11px] text-slate-400">High entropy + high energy indicates crowd panic or surge</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">SECTORS</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneEntropyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="zone" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={40} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="kinetic_energy" name="Kinetic Energy" fill="#ec4899" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dispersion_entropy" name="Dispersion Entropy" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
            <strong>Underpass B</strong> and <strong>Platform 3 Egress</strong> display acute kinetic surges requiring active operator monitoring.
          </div>
        </div>

        {/* Right Col: Calibrated Threshold Tuner */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sensitivity Thresholds</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400">CALIBRATED</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Motion Acceleration Trigger:</span>
                <span className="font-mono text-cyan-400">{motionThreshold} px/f</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.1"
                value={motionThreshold}
                onChange={(e) => setMotionThreshold(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Filters out regular pedestrian pace while detecting sudden sprints.</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Interaction Proximity Limit:</span>
                <span className="font-mono text-pink-400">{proximityThreshold} px</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                value={proximityThreshold}
                onChange={(e) => setProximityThreshold(Number(e.target.value))}
                className="w-full accent-pink-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Flags dense interpersonal physical proximity associated with altercations.</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Focal Crowd Density Delta:</span>
                <span className="font-mono text-amber-400">{crowdDensityThreshold} entities</span>
              </div>
              <input
                type="range"
                min="4"
                max="25"
                value={crowdDensityThreshold}
                onChange={(e) => setCrowdDensityThreshold(Number(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Prevents false alarms in naturally crowded stations until surge rate spikes.</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Stationary Dwell Persistence:</span>
                <span className="font-mono text-indigo-400">{dwellTimeThreshold} seconds</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={dwellTimeThreshold}
                onChange={(e) => setDwellTimeThreshold(Number(e.target.value))}
                className="w-full accent-indigo-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Unattended baggage or motionless person dwell time threshold.</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setActiveTab('risk-assessment')}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1"
            >
              <span>View Full Incident Risk Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

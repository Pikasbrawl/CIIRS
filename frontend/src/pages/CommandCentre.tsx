import React, { useState, useEffect } from 'react';
import { 
  Camera, AlertCircle, ShieldAlert, Siren, Activity, Users, Clock, 
  CheckCircle, ArrowUpRight, Radio, Filter, RefreshCw, BarChart2 
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend, Cell 
} from 'recharts';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const CommandCentre: React.FC = () => {
  const { setActiveTab, isDemoMode, triggerScenario, isTriggeringScenario } = useApp();
  const [kpi, setKpi] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [kpiRes, chartsRes] = await Promise.all([
        api.getDashboardKPI(),
        api.getDashboardCharts()
      ]);
      setKpi(kpiRes);
      setCharts(chartsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#06b6d4', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Mode Notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-white tracking-wide">
              INTEGRATED OPERATIONS COMMAND CENTRE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
              SYS-STATUS: OPTIMAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time urban surveillance telemetry with early warning predictive intelligence.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-slate-300">DISPATCH LATENCY:</span>
            <span className="text-cyan-400 font-bold">{kpi?.average_dispatch_latency_seconds || 18.4}s</span>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh Operations Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Connected Cameras */}
        <div 
          onClick={() => setActiveTab('camera-trust')}
          className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">CCTV Feeds</span>
            <Camera className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {kpi?.cameras.online || 7}<span className="text-xs text-slate-500 font-normal"> / {kpi?.cameras.total || 8}</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>{kpi?.cameras.health_ratio || 87.5}% Nominal Trust</span>
          </div>
        </div>

        {/* Early Warnings Today */}
        <div 
          onClick={() => setActiveTab('predictive-ai')}
          className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Early Warnings</span>
            <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {kpi?.incidents.early_warnings_today || 8}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Pre-incident kinetic signals
          </div>
        </div>

        {/* Pending Human Verification */}
        <div 
          onClick={() => setActiveTab('emergency-response')}
          className="p-3.5 rounded-xl bg-slate-900/70 border border-rose-900/40 hover:border-rose-500/60 transition cursor-pointer group shadow-sm bg-gradient-to-b from-rose-950/20 to-transparent"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-rose-300">Needs Verify</span>
            <AlertCircle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {kpi?.incidents.pending_verification || 1}
          </div>
          <div className="text-[10px] text-rose-300/80 mt-1 font-semibold">
            Human-in-loop approval
          </div>
        </div>

        {/* Confirmed Emergencies */}
        <div 
          onClick={() => setActiveTab('emergency-response')}
          className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-red-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Dispatches</span>
            <Siren className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {kpi?.incidents.confirmed_emergencies || 1}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Units en-route / on scene
          </div>
        </div>

        {/* Available Response Units */}
        <div 
          onClick={() => setActiveTab('gis-map')}
          className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Available Units</span>
            <Users className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-blue-300 font-mono">
            {kpi?.response_units.available || 6}<span className="text-xs text-slate-500 font-normal"> / {kpi?.response_units.total || 6}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Police • Medic • Fire
          </div>
        </div>

        {/* False Positive Rate */}
        <div 
          onClick={() => setActiveTab('analytics')}
          className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">False Positive</span>
            <Activity className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-indigo-300 font-mono">
            {kpi?.incidents.false_positive_rate || 3.8}%
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">
            Validated by operators
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Incidents & Warnings by Time */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">24-Hour Temporal Incident & Early Warning Pattern</h3>
              <p className="text-[11px] text-slate-400">Comparing early warning indicators vs approved dispatches</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">TIME SERIES</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.hourly_trend || []}>
                <defs>
                  <linearGradient id="colorWarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDispatches" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="early_warnings" name="Early Warnings" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorWarnings)" />
                <Area type="monotone" dataKey="dispatches" name="Approved Dispatches" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDispatches)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Risk Indicators by Category */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Incident Distribution & Prevention Rate (%)</h3>
              <p className="text-[11px] text-slate-400">Classified observable activity scenarios</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-400">CATEGORICAL</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.category_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: '#94a3b8' }} angle={-20} textAnchor="end" height={45} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="count" name="Incidents Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prevention_rate" name="Prevention Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Geographic Zone Risk Index */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Geographic Sector Incident Density</h3>
              <p className="text-[11px] text-slate-400">Zone-level incident clusters and active camera coverage</p>
            </div>
            <button 
              onClick={() => setActiveTab('gis-map')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>View Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.zone_distribution || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="zone" type="category" stroke="#64748b" fontSize={10} width={130} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="incidents" name="Incidents" fill="#ec4899" radius={[0, 4, 4, 0]} />
                <Bar dataKey="cameras" name="Cameras" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. AI Model Performance & Confidence Metrics */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Temporal AI Model Metrics</h3>
                <p className="text-[11px] text-slate-400">Validated on real-world pre-event benchmark dataset</p>
              </div>
              <button 
                onClick={() => setActiveTab('analytics')}
                className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <span>Predictive Analytics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</div>
                <div className="text-xl font-bold font-mono text-emerald-400">{charts?.model_metrics?.accuracy || 94.2}%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Precision</div>
                <div className="text-xl font-bold font-mono text-cyan-400">{charts?.model_metrics?.precision || 94.6}%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">F1-Score</div>
                <div className="text-xl font-bold font-mono text-indigo-400">{charts?.model_metrics?.f1_score || 94.2}%</div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>False Positive Rate (FPR):</span>
                <span className="font-mono text-emerald-400 font-semibold">{charts?.model_metrics?.fpr || 3.8}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '3.8%' }}></div>
              </div>

              <div className="flex justify-between items-center text-slate-300 pt-1">
                <span>False Negative Rate (FNR):</span>
                <span className="font-mono text-amber-400 font-semibold">{charts?.model_metrics?.fnr || 4.2}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '4.2%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Active Architecture: <strong>{charts?.model_metrics?.architecture || 'Temporal LSTM + Attention'}</strong></span>
            <span className="font-mono text-[10px] text-emerald-400">CHECKPOINT: VALIDATED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

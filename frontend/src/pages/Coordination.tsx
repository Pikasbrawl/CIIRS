import React, { useState, useEffect } from 'react';
import { 
  Users2, Shield, HeartPulse, Flame, CheckCircle, Clock, 
  AlertCircle, Lock, UserCheck, RefreshCw, Send, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { ResponseRequest, Incident } from '../types';

export const Coordination: React.FC = () => {
  const { activeRole } = useApp();
  const [activeAgencyTab, setActiveAgencyTab] = useState<'POLICE' | 'MEDICAL' | 'FIRE_AND_RESCUE'>('POLICE');
  const [requests, setRequests] = useState<ResponseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Default tab based on active user role
  useEffect(() => {
    if (activeRole === 'MEDICAL_RESPONDER') {
      setActiveAgencyTab('MEDICAL');
    } else if (activeRole === 'POLICE_RESPONDER') {
      setActiveAgencyTab('POLICE');
    }
  }, [activeRole]);

  const fetchData = async () => {
    try {
      const data = await api.getResponseRequests();
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = requests.filter((r) => r.agency_type === activeAgencyTab);

  const handleStatusUpdate = async (reqId: number, status: string) => {
    await api.updateResponseStatus(reqId, status);
    await fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center space-x-2">
              <Users2 className="w-5 h-5 text-sky-400" />
              <span>POLICE, MEDICAL & EMERGENCY COORDINATION</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold">
              ROLE-BASED DISPATCH VIEWS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tailored operational intelligence consoles. Encrypted channel communications preserving privacy and public security compliance.
          </p>
        </div>

        {/* Agency Navigation Tabs */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveAgencyTab('POLICE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
              activeAgencyTab === 'POLICE'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Police Console</span>
          </button>

          <button
            onClick={() => setActiveAgencyTab('MEDICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
              activeAgencyTab === 'MEDICAL'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Medical (EMS) Console</span>
          </button>

          <button
            onClick={() => setActiveAgencyTab('FIRE_AND_RESCUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
              activeAgencyTab === 'FIRE_AND_RESCUE'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Fire & Rescue</span>
          </button>
        </div>
      </div>

      {/* Role Access Indicator */}
      <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span>Active Authenticated Role: <strong className="text-cyan-300 font-mono">{activeRole}</strong></span>
        </div>
        <div className="text-[10px] text-emerald-400 font-mono">ENCRYPTED DISPATCH LINK ACTIVE</div>
      </div>

      {/* Agency Response Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((req) => (
          <div
            key={req.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-mono font-bold text-white text-sm">{req.request_number}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  req.status === 'PENDING_APPROVAL' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {req.status}
                </span>
              </div>

              <div className="mt-2.5 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Priority:</span>
                  <div className="font-bold text-slate-200">{req.severity} PRIORITY</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Required Units / Triage:</span>
                  <div className="text-slate-300">{req.recommended_units}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Unit Callsign:</span>
                  <div className="font-mono text-cyan-300 font-bold">{req.assigned_unit_callsign || 'Awaiting Authorization'}</div>
                </div>

                {req.triage_notes && (
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                    <strong>Triage:</strong> {req.triage_notes}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-400">ETA: {req.eta_minutes} Min</span>

              {req.status === 'DISPATCHED' && (
                <button
                  onClick={() => handleStatusUpdate(req.id, 'ACKNOWLEDGED')}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition"
                >
                  Acknowledge
                </button>
              )}
              {req.status === 'ACKNOWLEDGED' && (
                <button
                  onClick={() => handleStatusUpdate(req.id, 'ON_SCENE')}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-500 text-white transition"
                >
                  Confirm Arrival
                </button>
              )}
              {req.status === 'ON_SCENE' && (
                <button
                  onClick={() => handleStatusUpdate(req.id, 'CLOSED')}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Close Incident</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

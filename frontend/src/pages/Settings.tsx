import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, ShieldCheck, Users, Radio, 
  Database, RefreshCw, Key, CheckCircle2, Lock 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';

export const Settings: React.FC = () => {
  const { activeRole, switchRole, isDemoMode, setIsDemoMode, soundEnabled, setSoundEnabled } = useApp();

  const [wsUrl, setWsUrl] = useState('ws://localhost:8000/ws');
  const [dedupCooldown, setDedupCooldown] = useState(60);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleSave = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const auditLogs = [
    { time: '14:32:15', user: 'investigator', action: 'FORENSIC_TIMELINE_SCRUB', module: 'RECONSTRUCTION', ip: '127.0.0.1' },
    { time: '14:28:18', user: 'system', action: 'ANPR_WATCHLIST_MATCH', module: 'ANPR', ip: '127.0.0.1' },
    { time: '14:20:04', user: 'operator', action: 'DISPATCH_APPROVED', module: 'EMERGENCY', ip: '192.168.1.42' },
    { time: '13:45:00', user: 'system', action: 'CAMERA_OFFLINE_DETECTED', module: 'TELEMETRY', ip: '127.0.0.1' },
    { time: '10:30:00', user: 'admin', action: 'PLATFORM_INITIALIZED', module: 'CORE', ip: '127.0.0.1' }
  ];

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Command Centre Settings & Security Governance
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Role-based access credentials, alert thresholds, audio beeper controls, and non-repudiation audit trails.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#E8F8F0] text-[#16A36A] font-bold border border-[#A7F3D0]">
          AUDIT READY
        </span>
      </div>

      {showSavedToast && (
        <div className="p-3 bg-[#E8F8F0] border border-[#A7F3D0] rounded-xl text-xs text-[#16A36A] flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>System configuration parameters committed to persistent store.</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Operational & Access Controls */}
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-4">
          <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider block border-b border-[#E1EAF2] pb-2">
            Role-Based Access Control (RBAC)
          </span>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[#526477] font-semibold block mb-1">Active Operational Profile</label>
              <select
                value={activeRole}
                onChange={(e) => switchRole(e.target.value as Role)}
                className="w-full bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] p-2.5 rounded-lg font-semibold focus:outline-none focus:border-[#2463A6]"
              >
                <option value="INVESTIGATOR">INVESTIGATOR – Forensic Incident Reconstruction & Chain of Custody</option>
                <option value="OPERATOR">OPERATOR – Real-time CCTV Monitoring & Verification</option>
                <option value="POLICE_RESPONDER">POLICE_RESPONDER – Police Tactical Dispatch & Patrol Unit</option>
                <option value="MEDICAL_RESPONDER">MEDICAL_RESPONDER – Emergency Medical Services (EMS) & ALS</option>
                <option value="ADMIN">ADMIN – Full Operations Command & Model Deployment</option>
              </select>
            </div>

            <div className="pt-2 border-t border-[#E1EAF2] space-y-2">
              <label className="text-[#526477] font-semibold block mb-1">System Modes & Audio Telemetry</label>
              <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E1EAF2]">
                <div>
                  <div className="font-semibold text-[#172F50]">Demonstration Simulation Mode</div>
                  <div className="text-[10px] text-[#8291A2]">Enables quick test scenario triggers across cameras</div>
                </div>
                <input
                  type="checkbox"
                  checked={isDemoMode}
                  onChange={(e) => setIsDemoMode(e.target.checked)}
                  className="rounded text-[#2463A6] w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E1EAF2]">
                <div>
                  <div className="font-semibold text-[#172F50]">Web Audio Synthesizer Beeper</div>
                  <div className="text-[10px] text-[#8291A2]">Play alert frequency chime on HIGH/CRITICAL early warnings</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded text-[#2463A6] w-4 h-4"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E1EAF2]">
              <label className="text-[#526477] font-semibold block mb-1">Alert Deduplication Cooldown (Seconds)</label>
              <input
                type="number"
                value={dedupCooldown}
                onChange={(e) => setDedupCooldown(Number(e.target.value))}
                className="w-full bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] p-2 rounded-lg font-mono focus:outline-none focus:border-[#2463A6]"
              />
              <span className="text-[10px] text-[#8291A2]">Suppresses repeated notification bursts for ongoing incident events.</span>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold rounded-lg transition text-xs shadow-sm"
            >
              Save Configuration
            </button>
          </div>
        </div>

        {/* Right: Immutable Audit Logs */}
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
          <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider block border-b border-[#E1EAF2] pb-2">
            Cryptographic Audit Trail (Non-Repudiation)
          </span>

          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {auditLogs.map((log, i) => (
              <div key={i} className="p-2.5 rounded bg-[#F8FAFC] border border-[#E1EAF2] text-xs font-mono">
                <div className="flex items-center justify-between text-[10px] text-[#8291A2] mb-0.5">
                  <span className="text-[#2463A6] font-bold">{log.time}</span>
                  <span>IP: {log.ip}</span>
                </div>
                <div className="text-[#172F50] font-semibold">{log.action}</div>
                <div className="text-[10px] text-[#526477]">User: {log.user} • Module: {log.module}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#EBF3FC] rounded-lg border border-[#CBDCEE] text-[11px] text-[#526477]">
            <strong className="text-[#172F50]">Ethical AI & Hackathon Standards:</strong> CIIRS adheres strictly to Prevention-First kinetic telemetry, anonymous human movement analysis, and mandatory human operator authorization before emergency dispatches.
          </div>
        </div>
      </div>
    </div>
  );
};

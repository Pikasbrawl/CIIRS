import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, Info, ArrowRight, 
  Activity, Sliders, ExternalLink, HelpCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Incident } from '../types';

export const IncidentRiskAssessment: React.FC = () => {
  const { setActiveTab } = useApp();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    api.getIncidents().then((res) => {
      setIncidents(res);
      if (res.length > 0) setSelectedIncident(res[0]);
    });
  }, []);

  const riskTiers = [
    {
      level: 'LOW',
      color: 'border-emerald-500 text-emerald-400 bg-emerald-950/20',
      description: 'Normal activity with no significant safety indicators.',
      action: 'Automated background logging; no operator intervention required.'
    },
    {
      level: 'MODERATE',
      color: 'border-blue-500 text-blue-400 bg-blue-950/20',
      description: 'Unusual activity requiring continued observation and trajectory logging.',
      action: 'Maintain automated camera tracking; alert if persistence exceeds 60s.'
    },
    {
      level: 'HIGH',
      color: 'border-amber-500 text-amber-400 bg-amber-950/20',
      description: 'Multiple concerning indicators that require operator verification.',
      action: 'Operator review mandatory; prepare response standby.'
    },
    {
      level: 'CRITICAL',
      color: 'border-rose-500 text-rose-400 bg-rose-950/20',
      description: 'Strong indicators of an active emergency requiring immediate human review.',
      action: 'Urgent human review; prompt emergency dispatch authorization.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>INCIDENT RISK ASSESSMENT MATRIX</span>
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
            CALIBRATED 4-TIER RISK
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Multi-factor probability synthesis combining kinetic motion, density delta, proximity, and posture orientation.
        </p>
      </div>

      {/* 4 Risk Tiers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {riskTiers.map((tier) => (
          <div key={tier.level} className={`p-3.5 rounded-xl border ${tier.color}`}>
            <div className="text-xs font-mono font-bold uppercase mb-1">{tier.level} RISK</div>
            <div className="text-xs font-medium text-slate-200 mb-2">{tier.description}</div>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
              <strong>Action:</strong> {tier.action}
            </div>
          </div>
        ))}
      </div>

      {/* Critical Guidance Notice: Confidence vs Incident Probability */}
      <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/60 text-xs text-slate-300 leading-relaxed flex items-start space-x-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-cyan-300 block mb-0.5">Methodological Distinction: Model Confidence vs. Incident Probability</strong>
          High model confidence denotes that the temporal sequence closely matches learned scenario kinematics. Incident probability additionally accounts for multi-frame temporal persistence, cross-camera corroboration, and camera reliability trust scores. Never rely on an isolated confidence threshold alone.
        </div>
      </div>

      {/* Active Incidents Risk Assessment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Active Incident Queue</span>
          <div className="space-y-2">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                  selectedIncident?.id === inc.id ? 'bg-slate-800/80 border-cyan-500' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-white">{inc.incident_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    inc.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {inc.severity}
                  </span>
                </div>
                <div className="text-slate-300 font-semibold">{inc.category}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{inc.address}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Incident Risk Breakdown */}
        {selectedIncident ? (
          <div className="lg:col-span-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white">{selectedIncident.incident_number} – {selectedIncident.category}</h3>
                  <span className="text-xs font-mono text-cyan-400">({(selectedIncident.ai_confidence * 100).toFixed(1)}% Confidence)</span>
                </div>
                <p className="text-xs text-slate-400">{selectedIncident.address}</p>
              </div>

              <button
                onClick={() => setActiveTab('emergency-response')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1"
              >
                <span>Authorize Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong>Model Inference Explanation:</strong> {selectedIncident.ai_explanation}
            </div>

            {/* Supporting Early Warning Indicators */}
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase">Observable Early Warning Indicators:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {selectedIncident.observed_indicators.map((ind, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{ind}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Window & Coordinates */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Registered Coordinates:</span>
                <div className="font-mono text-cyan-400 font-bold mt-0.5">
                  {selectedIncident.latitude.toFixed(4)}°N, {selectedIncident.longitude.toFixed(4)}°E
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Verification Status:</span>
                <div className="font-mono text-amber-400 font-bold mt-0.5">
                  {selectedIncident.status}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-slate-500 text-xs">
            Select an incident from the queue to view detailed risk breakdown.
          </div>
        )}
      </div>
    </div>
  );
};

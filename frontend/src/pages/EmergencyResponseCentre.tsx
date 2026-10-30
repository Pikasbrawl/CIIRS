import React, { useState, useEffect } from 'react';
import { 
  Siren, Shield, HeartPulse, Flame, Users, CheckCircle, 
  Clock, AlertTriangle, ArrowRight, UserCheck, RefreshCw, Send, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { ResponseRequest, ResponseUnit } from '../types';

export const EmergencyResponseCentre: React.FC = () => {
  const { refreshIncidentsCount } = useApp();
  const [requests, setRequests] = useState<ResponseRequest[]>([]);
  const [units, setUnits] = useState<ResponseUnit[]>([]);
  const [selectedReq, setSelectedReq] = useState<ResponseRequest | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string>('POLICE');
  const [selectedUnitCallsign, setSelectedUnitCallsign] = useState<string>('');
  const [triageNotes, setTriageNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterAgency, setFilterAgency] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      const [reqs, respUnits] = await Promise.all([
        api.getResponseRequests(),
        api.getResponseUnits()
      ]);
      setRequests(reqs);
      setUnits(respUnits);
      if (reqs.length > 0 && !selectedReq) {
        setSelectedReq(reqs[0]);
        setSelectedAgency(reqs[0].agency_type);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveDispatch = async (requestId: number) => {
    setIsSubmitting(true);
    try {
      await api.approveDispatch(
        requestId,
        selectedAgency,
        selectedUnitCallsign || undefined,
        triageNotes || undefined
      );
      await fetchData();
      await refreshIncidentsCount();
      const updated = await api.getResponseRequests();
      const match = updated.find((r) => r.id === requestId);
      if (match) setSelectedReq(match);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId: number, nextStatus: string) => {
    try {
      await api.updateResponseStatus(requestId, nextStatus);
      await fetchData();
      const updated = await api.getResponseRequests();
      const match = updated.find((r) => r.id === requestId);
      if (match) setSelectedReq(match);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRequests = filterAgency === 'ALL' 
    ? requests 
    : requests.filter((r) => r.agency_type === filterAgency);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#E5A12B] border border-[#FDE68A]">PENDING APPROVAL</span>;
      case 'DISPATCHED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEE2E2] text-[#E34D59] border border-[#FECACA]">DISPATCHED</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DCEBFA] text-[#2463A6] border border-[#BFDBFE]">ACKNOWLEDGED</span>;
      case 'EN_ROUTE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3ECFB] text-[#7E3AF2] border border-[#E9D5FF]">EN ROUTE</span>;
      case 'ON_SCENE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8F8F0] text-[#16A36A] border border-[#A7F3D0]">ON SCENE</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#8795A5] border border-[#E2E8F0]">CLOSED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#8795A5]">{status}</span>;
    }
  };

  const getAgencyIcon = (agency: string) => {
    switch (agency) {
      case 'POLICE': return <Shield className="w-4 h-4 text-[#2463A6]" />;
      case 'MEDICAL': return <HeartPulse className="w-4 h-4 text-[#E34D59]" />;
      case 'FIRE_AND_RESCUE': return <Flame className="w-4 h-4 text-[#E5A12B]" />;
      default: return <Users className="w-4 h-4 text-[#2463A6]" />;
    }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <Siren className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Emergency Response & Rapid Coordination Centre
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Strict human-in-the-loop dispatch protocol. Operators authorize simulated police, medical, and multi-agency response units.
            </p>
          </div>
        </div>

        {/* Agency Filter */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#F4F8FC] p-1 rounded-lg border border-[#E1EAF2] text-xs">
            {['ALL', 'POLICE', 'MEDICAL', 'FIRE_AND_RESCUE'].map((ag) => (
              <button
                key={ag}
                onClick={() => setFilterAgency(ag)}
                className={`px-2.5 py-1 rounded transition text-xs font-semibold ${
                  filterAgency === ag ? 'bg-[#2463A6] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
                }`}
              >
                {ag === 'ALL' ? 'All' : ag.replace('_AND_RESCUE', '')}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] text-[#526477] hover:text-[#172F50] transition"
            title="Refresh Requests"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Col View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Request Queue */}
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
            <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
              Response Requests ({filteredRequests.length})
            </span>
            <span className="text-[10px] font-mono text-[#2463A6] font-bold">ACTIVE QUEUE</span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => {
                  setSelectedReq(req);
                  setSelectedAgency(req.agency_type);
                }}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                  selectedReq?.id === req.id 
                    ? 'bg-[#DCEBFA]/40 border-[#2463A6] shadow-sm' 
                    : 'bg-[#F8FAFC] border-[#E1EAF2] hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-[#172F50] flex items-center space-x-1.5">
                    {getAgencyIcon(req.agency_type)}
                    <span>{req.request_number}</span>
                  </span>
                  {getStatusBadge(req.status)}
                </div>

                <div className="text-[#172F50] font-semibold">{req.agency_type} RESPONSE</div>
                <div className="text-[11px] text-[#526477] mt-0.5">Rec: {req.recommended_units}</div>

                <div className="mt-2 pt-2 border-t border-[#E1EAF2] flex items-center justify-between text-[10px] text-[#8291A2]">
                  <span>ETA: <strong className="text-[#16A36A] font-mono">{req.eta_minutes} min</strong></span>
                  <span>Unit: {req.assigned_unit_callsign || 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2-Cols: Dispatch Authorization & Lifecycle Progression */}
        {selectedReq ? (
          <div className="lg:col-span-2 bg-white border border-[#E1EAF2] rounded-xl p-5 shadow-sm space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1EAF2] pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#172F50] flex items-center space-x-2">
                    {getAgencyIcon(selectedReq.agency_type)}
                    <span>{selectedReq.request_number}</span>
                  </h3>
                  {getStatusBadge(selectedReq.status)}
                </div>
                <p className="text-xs text-[#8291A2] mt-0.5">Incident Reference: INC-#{selectedReq.incident_id}</p>
              </div>

              <div className="text-right">
                <div className="text-xs text-[#8291A2]">Estimated Transit ETA:</div>
                <div className="text-lg font-mono font-bold text-[#16A36A]">{selectedReq.eta_minutes} Minutes</div>
              </div>
            </div>

            {/* Response Lifecycle State Machine */}
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E1EAF2]">
              <span className="text-[10px] font-mono text-[#8291A2] uppercase tracking-wider block mb-2 font-bold">
                DISPATCH LIFECYCLE PROGRESSION
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                {['PENDING_APPROVAL', 'DISPATCHED', 'ACKNOWLEDGED', 'ON_SCENE', 'CLOSED'].map((st, i) => {
                  const isCurrent = selectedReq.status === st;
                  const isPast = ['DISPATCHED', 'ACKNOWLEDGED', 'ON_SCENE', 'CLOSED'].indexOf(selectedReq.status) >= i;
                  return (
                    <div
                      key={st}
                      className={`p-2 rounded-lg border font-mono text-[11px] font-semibold transition ${
                        isCurrent 
                          ? 'bg-[#DCEBFA] border-[#2463A6] text-[#2463A6]' 
                          : isPast 
                          ? 'bg-[#E8F8F0] border-[#A7F3D0] text-[#16A36A]' 
                          : 'bg-white border-[#E1EAF2] text-[#8291A2]'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* If PENDING_APPROVAL: Operator Verification & Dispatch Form */}
            {selectedReq.status === 'PENDING_APPROVAL' && (
              <div className="p-4 rounded-xl bg-[#FFFDF5] border border-[#FEF08A] space-y-3.5">
                <div className="flex items-center space-x-2 text-[#E5A12B] font-bold text-xs uppercase">
                  <UserCheck className="w-4 h-4" />
                  <span>Human Operator Verification Required</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#526477] mb-1">Target Agency Type</label>
                    <select
                      value={selectedAgency}
                      onChange={(e) => setSelectedAgency(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                    >
                      <option value="POLICE">Police Department (PCR)</option>
                      <option value="MEDICAL">EMS Ambulance & Medical</option>
                      <option value="FIRE_AND_RESCUE">Fire & Rescue Service</option>
                      <option value="MULTI_AGENCY">Joint Multi-Agency Response</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#526477] mb-1">Assign Available Unit</label>
                    <select
                      value={selectedUnitCallsign}
                      onChange={(e) => setSelectedUnitCallsign(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                    >
                      <option value="">Auto-Assign Closest Available Unit</option>
                      {units
                        .filter((u) => u.status === 'AVAILABLE')
                        .map((u) => (
                          <option key={u.id} value={u.unit_callsign}>
                            {u.unit_callsign} ({u.vehicle_type} - {u.commander_name})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Triage & Dispatch Notes</label>
                  <textarea
                    rows={2}
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                    placeholder="Enter operator observations, priority instructions, scene safety warnings..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                  />
                </div>

                <button
                  onClick={() => handleApproveDispatch(selectedReq.id)}
                  disabled={isSubmitting}
                  className="w-full py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Transmitting Dispatch...' : 'Authorize Emergency Dispatch'}</span>
                </button>
              </div>
            )}

            {/* If Already Dispatched: Fast Progression Controls */}
            {selectedReq.status !== 'PENDING_APPROVAL' && selectedReq.status !== 'CLOSED' && (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E1EAF2] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#172F50]">Simulate Unit State Transition</div>
                  <div className="text-[11px] text-[#8291A2]">Advance lifecycle for testing coordination workflows.</div>
                </div>

                <div className="flex space-x-2">
                  {selectedReq.status === 'DISPATCHED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReq.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 bg-[#2463A6] text-white text-xs font-semibold rounded-lg hover:bg-[#1B4E85]"
                    >
                      Acknowledge
                    </button>
                  )}
                  {selectedReq.status === 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReq.id, 'ON_SCENE')}
                      className="px-3 py-1.5 bg-[#16A36A] text-white text-xs font-semibold rounded-lg hover:bg-[#128254]"
                    >
                      Mark On Scene
                    </button>
                  )}
                  {selectedReq.status === 'ON_SCENE' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReq.id, 'CLOSED')}
                      className="px-3 py-1.5 bg-[#526477] text-white text-xs font-semibold rounded-lg hover:bg-[#172F50]"
                    >
                      Close Incident
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white border border-[#E1EAF2] rounded-xl p-12 text-center text-xs text-[#8291A2]">
            Select any response request from the queue to review and authorize dispatch.
          </div>
        )}
      </div>
    </div>
  );
};

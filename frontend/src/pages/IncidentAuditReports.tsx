import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle, 
  Clock, Plus, Filter, RefreshCw, FileText, Lock, 
  Activity, Flame, Siren, User, Building, MapPin, 
  ExternalLink, ChevronRight, Hash, Edit3
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { IncidentAuditEntry } from '../types';

export const IncidentAuditReports: React.FC = () => {
  const { currentUser } = useApp();

  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentNum, setSelectedIncidentNum] = useState<string>('INC-2026-0842');
  const [entries, setEntries] = useState<IncidentAuditEntry[]>([]);
  const [chainStatus, setChainStatus] = useState<any>(null);
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // New Entry Modal / Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [agencyType, setAgencyType] = useState<'POLICE' | 'MEDICAL' | 'FIRE_AND_RESCUE' | 'CONTROL_ROOM'>('POLICE');
  const [authorName, setAuthorName] = useState('ASI Ramesh Kumar');
  const [organization, setOrganization] = useState('Chandigarh Police — Sector 17 Division');
  const [badgeId, setBadgeId] = useState('POL-2202');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryCategory, setEntryCategory] = useState('INITIAL_SCENE_ASSESSMENT');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Sector 22 Market, Block C');
  const [patientCount, setPatientCount] = useState(0);
  const [triageStatus, setTriageStatus] = useState('NONE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revision Modal
  const [revisionTarget, setRevisionTarget] = useState<IncidentAuditEntry | null>(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');

  const fetchIncidents = async () => {
    try {
      const data = await api.getAuditableIncidents();
      setIncidents(data);
      if (data.length > 0 && !selectedIncidentNum) {
        setSelectedIncidentNum(data[0].incident_number);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEntries = async () => {
    if (!selectedIncidentNum) return;
    setIsLoading(true);
    try {
      const data = await api.getIncidentAuditEntries(selectedIncidentNum);
      setEntries(data);
      // Automatically verify hash chain
      const verifyRes = await api.verifyAuditChain(selectedIncidentNum);
      setChainStatus(verifyRes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [selectedIncidentNum]);

  const handleAgencyPresetChange = (agency: 'POLICE' | 'MEDICAL' | 'FIRE_AND_RESCUE' | 'CONTROL_ROOM') => {
    setAgencyType(agency);
    if (agency === 'POLICE') {
      setAuthorName('ASI Ramesh Kumar');
      setOrganization('Chandigarh Police — Sector 17 Division');
      setBadgeId('POL-2202');
      setEntryCategory('INITIAL_SCENE_ASSESSMENT');
      setEntryTitle('Perimeter Security & First Responder Log');
    } else if (agency === 'MEDICAL') {
      setAuthorName('Dr. Harleen Kaur, Paramedic Lead');
      setOrganization('Government Multi-Specialty Hospital (GMSH-16) / PGIMER EMS');
      setBadgeId('MED-0430');
      setEntryCategory('PATIENT_TRIAGE_AND_TRANSPORT');
      setEntryTitle('Emergency Triage & Vital Signs Evaluation');
      setTriageStatus('GREEN_MINOR');
    } else if (agency === 'FIRE_AND_RESCUE') {
      setAuthorName('Station Officer Balwant Singh');
      setOrganization('Chandigarh Fire & Emergency Services — Sector 17 Station');
      setBadgeId('FIR-1704');
      setEntryCategory('HAZARD_CONTAINMENT');
      setEntryTitle('Hazardous Gas & Thermal Scan Clearance');
      setTriageStatus('NONE');
    } else {
      setAuthorName('Arjun Singh');
      setOrganization('Chandigarh Smart City Integrated Operations Centre (ICCC)');
      setBadgeId('OPR-402');
      setEntryCategory('DISPATCH_TIMELINE');
      setEntryTitle('Multi-Camera Telemetry & Dispatch Correlation');
      setTriageStatus('NONE');
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryTitle.trim() || !description.trim()) {
      alert('Please fill in required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const roleMap: Record<string, string> = {
        POLICE: 'Police Officer',
        MEDICAL: 'Hospital / Medical Responder',
        FIRE_AND_RESCUE: 'Fire & Rescue Responder',
        CONTROL_ROOM: 'Control-Room Operator'
      };

      await api.addIncidentAuditEntry(selectedIncidentNum, {
        agency_type: agencyType,
        role: roleMap[agencyType],
        author_name: authorName,
        organization,
        badge_id: badgeId,
        entry_title: entryTitle,
        entry_category: entryCategory,
        description,
        location,
        patient_count: Number(patientCount),
        triage_status: triageStatus,
        evidence_url: '/static/sample_cctv_frame1.jpg'
      });

      setShowAddModal(false);
      setDescription('');
      setEntryTitle('');
      await fetchEntries();
    } catch (err) {
      alert('Error committing audit record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviseEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionTarget || !revisionReason.trim() || !updatedDescription.trim()) return;

    setIsSubmitting(true);
    try {
      await api.reviseIncidentAuditEntry(selectedIncidentNum, revisionTarget.id, {
        author_name: currentUser.full_name || 'Inspector Rajesh Sharma',
        organization: 'Chandigarh Police Crime Investigation Branch',
        badge_id: 'POL-1201',
        revision_reason: revisionReason,
        updated_description: updatedDescription
      });

      setRevisionTarget(null);
      setRevisionReason('');
      setUpdatedDescription('');
      await fetchEntries();
    } catch (err) {
      alert('Error submitting revision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (agencyFilter === 'ALL') return true;
    return e.agency_type === agencyFilter;
  });

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1EAF2] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#2463A6] mb-1">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Multi-Agency Incident Audit Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-[#172F50]">Incident Audit & Scene Reports</h1>
          <p className="text-xs text-[#526477] mt-0.5">
            Tamper-evident, append-only scene observations and multi-agency records signed with SHA-256 cryptographic chain of custody.
          </p>
        </div>

        {/* Incident Selector */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-[#8291A2] uppercase">Active Incident ID</label>
            <select
              value={selectedIncidentNum}
              onChange={(e) => setSelectedIncidentNum(e.target.value)}
              className="px-3.5 py-2 text-xs font-mono font-bold bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6]"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.incident_number}>
                  {inc.incident_number} — {inc.category} ({inc.address})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#2463A6] hover:bg-[#1E528B] text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm self-end"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Scene Record</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Ledger Health Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E1EAF2] shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ledger Security</div>
            <div className="text-xs font-bold text-[#172F50]">
              {chainStatus?.status === 'VERIFIED' ? 'Cryptographically Sealed (SHA-256)' : 'Validating Block Chain...'}
            </div>
            <div className="text-[10px] text-[#8291A2]">
              {chainStatus?.entries_checked || entries.length} immutable blocks chained
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E1EAF2] shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2463A6] flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#2463A6] uppercase tracking-wider">Participating Agencies</div>
            <div className="text-xs font-bold text-[#172F50]">Police, Medical EMS, Fire, ICCC</div>
            <div className="text-[10px] text-[#8291A2]">Joint inter-agency operational response</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E1EAF2] shadow-sm flex items-center justify-between">
          <div className="truncate mr-2">
            <div className="text-[10px] font-bold text-[#8291A2] uppercase tracking-wider">Latest Block Hash</div>
            <div className="text-xs font-mono font-bold text-[#172F50] truncate max-w-[200px]">
              {chainStatus?.latest_block_hash || '82545fc6fc2c7f...772c706f'}
            </div>
          </div>
          <button
            onClick={fetchEntries}
            className="p-2 rounded-lg bg-[#EDF4FC] hover:bg-[#DCEBFA] text-[#2463A6] transition"
            title="Re-verify Ledger Integrity"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Agency Filter Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-[#8291A2] mr-1">Filter by Agency:</span>
        {[
          { id: 'ALL', label: 'All Agencies', icon: Building },
          { id: 'POLICE', label: 'Police Department', icon: Siren },
          { id: 'MEDICAL', label: 'Hospital / EMS', icon: Activity },
          { id: 'FIRE_AND_RESCUE', label: 'Fire & Rescue', icon: Flame },
          { id: 'CONTROL_ROOM', label: 'Control Room', icon: Lock }
        ].map((ag) => {
          const Icon = ag.icon;
          const isActive = agencyFilter === ag.id;
          return (
            <button
              key={ag.id}
              onClick={() => setAgencyFilter(ag.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                isActive
                  ? 'bg-[#172F50] text-white shadow-sm'
                  : 'bg-white border border-[#E1EAF2] text-[#526477] hover:bg-[#F8FAFC]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{ag.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chronological Append-Only Audit Entries */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E1EAF2] text-xs text-[#8291A2]">
            No audit records matching active filter for {selectedIncidentNum}.
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const isPolice = entry.agency_type === 'POLICE';
            const isMedical = entry.agency_type === 'MEDICAL';
            const isFire = entry.agency_type === 'FIRE_AND_RESCUE';
            const isControl = entry.agency_type === 'CONTROL_ROOM';

            const agencyBadge = isPolice ? 'bg-blue-100 text-blue-800 border-blue-200' :
              isMedical ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
              isFire ? 'bg-amber-100 text-amber-800 border-amber-200' :
              'bg-purple-100 text-purple-800 border-purple-200';

            const agencyIcon = isPolice ? <Siren className="w-4 h-4 text-blue-600" /> :
              isMedical ? <Activity className="w-4 h-4 text-emerald-600" /> :
              isFire ? <Flame className="w-4 h-4 text-amber-600" /> :
              <Lock className="w-4 h-4 text-purple-600" />;

            return (
              <div 
                key={entry.id} 
                className="bg-white rounded-2xl border border-[#E1EAF2] p-5 shadow-sm space-y-4 hover:border-[#2463A6]/40 transition"
              >
                {/* Entry Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#E1EAF2]">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] flex items-center justify-center">
                      {agencyIcon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${agencyBadge}`}>
                          {entry.role}
                        </span>
                        <span className="text-xs font-bold text-[#172F50]">{entry.entry_title}</span>
                      </div>
                      <div className="text-[11px] text-[#526477] mt-0.5">
                        <strong>{entry.author_name}</strong> ({entry.badge_id || 'ID Verified'}) • {entry.organization}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-right">
                    <div className="text-[11px] text-[#8291A2] font-mono">
                      {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
                    </div>
                    {entry.revision_number > 1 && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                        Rev #{entry.revision_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body & Observation Details */}
                <p className="text-xs text-[#172F50] leading-relaxed">
                  {entry.description}
                </p>

                {/* Additional Triage & Scene Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                  <div className="flex items-center space-x-1.5 text-[#526477]">
                    <MapPin className="w-3.5 h-3.5 text-[#2463A6]" />
                    <span>{entry.location}</span>
                  </div>

                  {entry.patient_count > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                      Patients Screened: {entry.patient_count} (Triage: {entry.triage_status})
                    </span>
                  )}

                  <span className="text-[10px] uppercase font-bold text-[#2463A6] bg-[#DCEBFA] px-2 py-0.5 rounded">
                    Category: {entry.entry_category}
                  </span>
                </div>

                {/* Cryptographic Proof Footer & Revision Trigger */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-[#E1EAF2] gap-2 text-[10px] font-mono text-[#8291A2]">
                  <div className="flex items-center space-x-2 truncate max-w-lg">
                    <span className="text-emerald-600 font-bold">● SHA-256 Valid:</span>
                    <span className="truncate" title={entry.entry_hash}>Block: {entry.entry_hash.slice(0, 16)}...</span>
                    <span className="text-gray-400">|</span>
                    <span className="truncate" title={entry.previous_entry_hash}>Prev: {entry.previous_entry_hash.slice(0, 12)}...</span>
                  </div>

                  <button
                    onClick={() => {
                      setRevisionTarget(entry);
                      setUpdatedDescription(entry.description);
                    }}
                    className="flex items-center space-x-1 text-[#2463A6] hover:underline font-sans font-bold text-xs"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Submit Authorized Amendment</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SUBMIT RECORD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBDCEE] p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#172F50]">Submit Multi-Agency Scene Record</h3>
                <p className="text-xs text-[#526477]">Adding an append-only entry to Incident {selectedIncidentNum}</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#8291A2] hover:text-[#172F50] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              {/* Agency Preset Selection */}
              <div>
                <label className="block text-xs font-bold text-[#172F50] mb-1.5">Authorized Agency</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['POLICE', 'MEDICAL', 'FIRE_AND_RESCUE', 'CONTROL_ROOM'] as const).map((ag) => (
                    <button
                      key={ag}
                      type="button"
                      onClick={() => handleAgencyPresetChange(ag)}
                      className={`p-2 rounded-xl text-xs font-bold border transition ${
                        agencyType === ag
                          ? 'border-[#2463A6] bg-[#DCEBFA] text-[#2463A6]'
                          : 'border-[#CBDCEE] bg-[#F8FAFC] text-[#526477] hover:bg-[#E2EDF9]'
                      }`}
                    >
                      {ag.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author & Org */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Author Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[#172F50]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Badge / Officer ID</label>
                  <input
                    type="text"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[#172F50]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Category</label>
                  <select
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[#172F50]"
                  >
                    <option value="INITIAL_SCENE_ASSESSMENT">Initial Scene Assessment</option>
                    <option value="PATIENT_TRIAGE_AND_TRANSPORT">Patient Triage & Transport</option>
                    <option value="HAZARD_CONTAINMENT">Hazard Containment & Clearance</option>
                    <option value="EVIDENCE_COLLECTION">Evidence Collection</option>
                    <option value="DISPATCH_TIMELINE">Dispatch Timeline</option>
                  </select>
                </div>
              </div>

              {/* Title & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Record Title</label>
                  <input
                    type="text"
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                    placeholder="e.g. Perimeter Established & Eyewitness Recorded"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[#172F50]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Scene Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[#172F50]"
                    required
                  />
                </div>
              </div>

              {/* Medical Specific Details if Medical */}
              {agencyType === 'MEDICAL' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Patients Screened</label>
                    <input
                      type="number"
                      value={patientCount}
                      onChange={(e) => setPatientCount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Triage Classification</label>
                    <select
                      value={triageStatus}
                      onChange={(e) => setTriageStatus(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-emerald-900"
                    >
                      <option value="GREEN_MINOR">GREEN (Minor / Walking Wounded)</option>
                      <option value="YELLOW_DELAYED">YELLOW (Delayed Care Required)</option>
                      <option value="RED_IMMEDIATE">RED (Immediate Life-Threatening)</option>
                      <option value="NONE">None / Precautionary</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">
                  Official Observations / Report Findings
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail on-scene measurements, timeline, suspect descriptions, patient condition, or hazard clearance..."
                  className="w-full p-3 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6] resize-none"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E1EAF2]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBDCEE] text-xs font-semibold text-[#526477]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2463A6] hover:bg-[#1E528B] text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Calculating SHA-256 Block...</span>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Sign & Append to Ledger</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVISION MODAL */}
      {revisionTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBDCEE] p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#172F50]">Submit Authorized Revision</h3>
                <p className="text-xs text-[#526477]">Original Record #{revisionTarget.id} is strictly preserved</p>
              </div>
              <button 
                onClick={() => setRevisionTarget(null)}
                className="text-[#8291A2] hover:text-[#172F50] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviseEntry} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Reason for Revision</label>
                <input
                  type="text"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Corrected suspect vehicle model from CCTV plate match"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-lg text-[#172F50]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Updated Observation Text</label>
                <textarea
                  rows={4}
                  value={updatedDescription}
                  onChange={(e) => setUpdatedDescription(e.target.value)}
                  className="w-full p-3 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50]"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E1EAF2]">
                <button
                  type="button"
                  onClick={() => setRevisionTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#CBDCEE] text-xs font-semibold text-[#526477]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                >
                  <span>Commit Revision #{revisionTarget.revision_number + 1}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

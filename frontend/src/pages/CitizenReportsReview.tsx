import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, CheckCircle2, XCircle, Clock, MapPin, 
  Search, Filter, AlertTriangle, ArrowRight, Video, 
  ShieldCheck, RefreshCw, Eye, User, FileText, Send
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { PublicIncidentReport } from '../types';

export const CitizenReportsReview: React.FC = () => {
  const { currentUser, setActiveTab } = useApp();
  const [reports, setReports] = useState<PublicIncidentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<PublicIncidentReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPublicReports();
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleAction = async (action: 'UNDER_REVIEW' | 'VERIFY_AND_CONVERT' | 'DISMISS') => {
    if (!selectedReport) return;
    setIsProcessing(true);
    setActionSuccess(null);
    try {
      const res = await api.verifyCitizenReport(selectedReport.report_code, {
        action,
        review_notes: reviewNotes || (action === 'VERIFY_AND_CONVERT' ? 'Verified by control operator. Response team dispatched.' : 'Under evaluation by control room.'),
        operator_name: currentUser.full_name || 'Senior Operator Arjun Singh'
      });

      if (res && res.status === 'SUCCESS') {
        setActionSuccess(res.message);
        setReviewNotes('');
        await fetchReports();
        // Update selected report view
        const updated = await api.trackPublicReport(selectedReport.report_code);
        setSelectedReport(updated);
      }
    } catch (err) {
      alert('Error updating report status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesFilter = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch = !searchQuery || 
      r.report_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reporter_name && r.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E1EAF2] shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#2463A6] mb-1">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Police Operations Review Desk</span>
          </div>
          <h1 className="text-xl font-bold text-[#172F50]">Citizen Incident Reports Verification</h1>
          <p className="text-xs text-[#526477] mt-0.5">
            Review incoming reports submitted by citizens across Chandigarh, verify photographic/video evidence, and convert genuine alerts to Incident response cases.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="px-4 py-2 rounded-xl bg-[#EDF4FC] hover:bg-[#DCEBFA] text-[#2463A6] text-xs font-bold transition flex items-center space-x-2 self-start sm:self-auto border border-[#CBDCEE]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Report List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E1EAF2] p-4 shadow-sm space-y-4">
          {/* Search & Filter Bar */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8291A2] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports by ID, category, location..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6] focus:bg-white"
              />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'DISMISSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    filterStatus === st
                      ? 'bg-[#172F50] text-white shadow-sm'
                      : 'bg-[#F0F5FA] text-[#526477] hover:bg-[#E2EDF9]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
            {filteredReports.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8291A2]">No citizen reports matching filter</div>
            ) : (
              filteredReports.map((r) => {
                const isSelected = selectedReport?.report_code === r.report_code;
                return (
                  <div
                    key={r.id}
                    onClick={() => { setSelectedReport(r); setActionSuccess(null); }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-[#2463A6] bg-[#DCEBFA]/40 shadow-sm'
                        : 'border-[#E1EAF2] hover:border-[#CBDCEE] bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#2463A6]">{r.report_code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' :
                        r.status === 'DISMISSED' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#172F50]">{r.category}</div>
                    <div className="text-[11px] text-[#526477] line-clamp-1">{r.description}</div>

                    <div className="flex items-center justify-between text-[10px] text-[#8291A2] pt-1 border-t border-[#E1EAF2]/60">
                      <span className="truncate max-w-[180px]">{r.address}</span>
                      <span>{r.reporter_name || 'Anonymous'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Verification Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E1EAF2] p-5 shadow-sm space-y-5">
          {selectedReport ? (
            <div className="space-y-5">
              {/* Report Header Card */}
              <div className="flex items-start justify-between pb-4 border-b border-[#E1EAF2]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-bold text-[#2463A6] bg-[#DCEBFA] px-2 py-0.5 rounded">
                      {selectedReport.report_code}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedReport.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                      selectedReport.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' :
                      selectedReport.status === 'DISMISSED' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Status: {selectedReport.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#172F50] mt-2">{selectedReport.category}</h2>
                  <div className="flex items-center space-x-1.5 text-xs text-[#526477] mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2463A6]" />
                    <span>{selectedReport.address}</span>
                  </div>
                </div>

                {selectedReport.incident_number && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-right">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Converted Incident ID</div>
                    <div className="text-sm font-mono font-black text-emerald-900">{selectedReport.incident_number}</div>
                    <button
                      onClick={() => setActiveTab('incident-reconstruction')}
                      className="text-[10px] text-[#2463A6] font-bold hover:underline mt-1"
                    >
                      View in Reconstruction →
                    </button>
                  </div>
                )}
              </div>

              {/* Success Notification */}
              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{actionSuccess}</span>
                </div>
              )}

              {/* Citizen Description */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-1.5">
                <div className="text-[10px] font-bold text-[#8291A2] uppercase tracking-wider">Citizen Statement</div>
                <p className="text-xs text-[#172F50] leading-relaxed">{selectedReport.description}</p>
                <div className="flex items-center justify-between text-[11px] text-[#8291A2] pt-2 border-t border-[#E1EAF2]">
                  <span>Submitted by: <strong>{selectedReport.reporter_name || 'Anonymous Citizen'}</strong></span>
                  <span>Contact: {selectedReport.reporter_phone || selectedReport.reporter_contact || 'None provided'}</span>
                </div>
              </div>

              {/* Attached Evidence & Geolocation correlation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E1EAF2] bg-[#F8FAFC] space-y-2">
                  <div className="text-[11px] font-bold text-[#172F50] flex items-center space-x-1.5">
                    <Video className="w-3.5 h-3.5 text-[#2463A6]" />
                    <span>Evidence Attachment</span>
                  </div>
                  {selectedReport.attachment_url ? (
                    <div className="rounded-lg overflow-hidden border border-[#CBDCEE] bg-black">
                      <img 
                        src={selectedReport.attachment_url} 
                        alt="Citizen Evidence" 
                        className="w-full h-32 object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="h-32 rounded-lg bg-[#E2EDF9] flex items-center justify-center text-xs text-[#8291A2]">
                      No digital attachment submitted
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-[#E1EAF2] bg-[#F8FAFC] space-y-2">
                  <div className="text-[11px] font-bold text-[#172F50] flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2463A6]" />
                    <span>CCTV Cross-Correlation</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 rounded bg-white border border-[#E1EAF2] flex justify-between items-center">
                      <span className="font-mono text-[#2463A6] font-bold">CAM-17-001</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">120m away (Nominal)</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#E1EAF2] flex justify-between items-center">
                      <span className="font-mono text-[#2463A6] font-bold">CAM-22-003</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">340m away (Nominal)</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#8291A2]">
                    Coordinates: {selectedReport.latitude}, {selectedReport.longitude}
                  </div>
                </div>
              </div>

              {/* Operator Verification Actions */}
              <div className="p-4 rounded-xl bg-[#F0F5FA] border border-[#CBDCEE] space-y-3">
                <div className="text-xs font-bold text-[#172F50]">Control Operator Actions</div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">
                    Operator Verification Assessment Notes
                  </label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter operator observation notes or conversion instructions..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction('UNDER_REVIEW')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#CBDCEE] text-xs font-bold text-[#2463A6] hover:bg-[#E2EDF9] transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark Under Review</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction('VERIFY_AND_CONVERT')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify & Convert to Incident Record</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction('DISMISS')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition flex items-center space-x-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Dismiss with Reason</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#8291A2]">
              Select a citizen report from the left pane to begin operator verification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, CheckCircle2, XCircle, Clock, MapPin, 
  Search, Filter, AlertTriangle, ArrowRight, Video, 
  ShieldCheck, RefreshCw, Eye, User, FileText, Send,
  AlertCircle, ShieldAlert, Check
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { PublicIncidentReport } from '../types';

export const CitizenReportsReview: React.FC = () => {
  const { currentUser, setActiveTab } = useApp();
  const [reports, setReports] = useState<PublicIncidentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<PublicIncidentReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // Default: Active review queue
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [notesError, setNotesError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const data = await api.getPublicReports();
      setReports(data);

      // Set default selected report if none selected or if current is lost
      if (data.length > 0) {
        if (!selectedReport || !data.some(r => r.report_code === selectedReport.report_code)) {
          // Prefer first active report (SUBMITTED or UNDER_REVIEW)
          const firstActive = data.find(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW') || data[0];
          setSelectedReport(firstActive);
        }
      } else {
        setSelectedReport(null);
      }
    } catch (e) {
      console.error('Error fetching citizen reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // When selecting a different report, prefill its existing review notes if any, and clear error
  const handleSelectReport = (r: PublicIncidentReport) => {
    setSelectedReport(r);
    setActionSuccess(null);
    setActionError(null);
    setNotesError(null);
    setReviewNotes(r.review_notes || '');
  };

  const handleAction = async (action: 'UNDER_REVIEW' | 'VERIFY_AND_CONVERT' | 'DECLINE') => {
    if (!selectedReport) return;

    // Strict validation: Operator MUST write assessment notes
    const trimmedNotes = reviewNotes.trim();
    if (!trimmedNotes || trimmedNotes.length < 5) {
      setNotesError("Operator Assessment Notes are mandatory! Please enter detailed notes (minimum 5 characters) explaining your assessment before proceeding.");
      if (notesInputRef.current) {
        notesInputRef.current.focus();
      }
      return;
    }

    setNotesError(null);
    setActionError(null);
    setIsProcessing(true);
    setActionSuccess(null);

    const currentCode = selectedReport.report_code;

    try {
      const res = await api.verifyCitizenReport(currentCode, {
        action: action === 'DECLINE' ? 'DISMISS' : action,
        review_notes: trimmedNotes,
        operator_name: currentUser.full_name || 'Senior Operator Arjun Singh'
      });

      if (res && res.status === 'SUCCESS') {
        setActionSuccess(res.message);

        if (action === 'DECLINE') {
          // 1. Immediately remove the declined report from the active review list
          setReports(prev => prev.filter(r => r.report_code !== currentCode));
          setReviewNotes('');

          // 2. Select next remaining report in the queue
          const remainingInQueue = filteredReports.filter(r => r.report_code !== currentCode);
          if (remainingInQueue.length > 0) {
            setSelectedReport(remainingInQueue[0]);
            setReviewNotes(remainingInQueue[0].review_notes || '');
          } else {
            setSelectedReport(null);
          }
        } else if (action === 'VERIFY_AND_CONVERT') {
          // If verified & converted, update status
          setReports(prev => prev.map(r => r.report_code === currentCode ? {
            ...r,
            status: 'VERIFIED',
            incident_number: res.incident_number,
            incident_id: res.incident_id,
            review_notes: trimmedNotes
          } : r));

          // If in ACTIVE filter, remove from active queue and select next
          if (filterStatus === 'ACTIVE') {
            const remaining = filteredReports.filter(r => r.report_code !== currentCode);
            setSelectedReport(remaining.length > 0 ? remaining[0] : null);
            setReviewNotes(remaining.length > 0 ? (remaining[0].review_notes || '') : '');
          } else {
            setSelectedReport(prev => prev ? {
              ...prev,
              status: 'VERIFIED',
              incident_number: res.incident_number,
              incident_id: res.incident_id,
              review_notes: trimmedNotes
            } : null);
          }
        } else {
          // UNDER_REVIEW: update in place
          setReports(prev => prev.map(r => r.report_code === currentCode ? {
            ...r,
            status: 'UNDER_REVIEW',
            review_notes: trimmedNotes
          } : r));
          setSelectedReport(prev => prev ? {
            ...prev,
            status: 'UNDER_REVIEW',
            review_notes: trimmedNotes
          } : null);
        }
      } else {
        setActionError(res?.message || 'Error updating citizen report.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update report status.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter calculations
  const activeCount = reports.filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length;
  const submittedCount = reports.filter(r => r.status === 'SUBMITTED').length;
  const underReviewCount = reports.filter(r => r.status === 'UNDER_REVIEW').length;
  const verifiedCount = reports.filter(r => r.status === 'VERIFIED').length;
  const declinedCount = reports.filter(r => r.status === 'DECLINED' || r.status === 'DISMISSED').length;
  const totalCount = reports.length;

  const filteredReports = reports.filter((r) => {
    let matchesFilter = true;
    if (filterStatus === 'ACTIVE') {
      matchesFilter = r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW';
    } else if (filterStatus === 'DECLINED') {
      matchesFilter = r.status === 'DECLINED' || r.status === 'DISMISSED';
    } else if (filterStatus !== 'ALL') {
      matchesFilter = r.status === filterStatus;
    }

    const matchesSearch = !searchQuery || 
      r.report_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reporter_name && r.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const isProcessed = selectedReport?.status === 'VERIFIED' || selectedReport?.status === 'DECLINED' || selectedReport?.status === 'DISMISSED';

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
            Review incoming citizen reports, verify photographic/video evidence, write mandatory assessment notes, and accept into Incident Reconstruction or decline non-actionable submissions.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-[#EDF4FC] hover:bg-[#DCEBFA] text-[#2463A6] text-xs font-bold transition flex items-center space-x-2 self-start sm:self-auto border border-[#CBDCEE] disabled:opacity-60"
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

            {/* Filter Tabs with Live Counts */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ACTIVE', label: 'Active Queue', count: activeCount, alert: activeCount > 0 },
                { id: 'SUBMITTED', label: 'New', count: submittedCount },
                { id: 'UNDER_REVIEW', label: 'In Review', count: underReviewCount },
                { id: 'VERIFIED', label: 'Accepted', count: verifiedCount },
                { id: 'DECLINED', label: 'Declined Archive', count: declinedCount },
                { id: 'ALL', label: 'All', count: totalCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterStatus(tab.id);
                    setActionSuccess(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1.5 ${
                    filterStatus === tab.id
                      ? 'bg-[#172F50] text-white shadow-sm'
                      : 'bg-[#F0F5FA] text-[#526477] hover:bg-[#E2EDF9]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filterStatus === tab.id 
                      ? 'bg-white/20 text-white' 
                      : tab.alert ? 'bg-amber-100 text-amber-800' : 'bg-gray-200/70 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
            {filteredReports.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-xs font-bold text-[#172F50]">No reports in this view</div>
                <div className="text-[11px] text-[#8291A2]">
                  {filterStatus === 'ACTIVE' 
                    ? 'All incoming citizen reports have been reviewed or declined!' 
                    : 'No reports match the selected filter.'}
                </div>
              </div>
            ) : (
              filteredReports.map((r) => {
                const isSelected = selectedReport?.report_code === r.report_code;
                const isDeclined = r.status === 'DECLINED' || r.status === 'DISMISSED';
                const isVerified = r.status === 'VERIFIED';
                const isUnderReview = r.status === 'UNDER_REVIEW';

                return (
                  <div
                    key={r.id || r.report_code}
                    onClick={() => handleSelectReport(r)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-[#2463A6] bg-[#DCEBFA]/40 shadow-sm'
                        : isDeclined 
                        ? 'border-gray-200 bg-gray-50/60 opacity-75 hover:opacity-100'
                        : 'border-[#E1EAF2] hover:border-[#CBDCEE] bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#2463A6]">{r.report_code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isVerified ? 'bg-emerald-100 text-emerald-800' :
                        isUnderReview ? 'bg-amber-100 text-amber-800' :
                        isDeclined ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
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
                      selectedReport.status === 'DECLINED' || selectedReport.status === 'DISMISSED' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
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
                      className="text-[10px] text-[#2463A6] font-bold hover:underline mt-1 block"
                    >
                      View in Reconstruction →
                    </button>
                  </div>
                )}
              </div>

              {/* Success Notification */}
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 shadow-sm animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{actionSuccess}</span>
                </div>
              )}

              {/* Error Notification */}
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 shadow-sm">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{actionError}</span>
                </div>
              )}

              {/* Citizen Statement */}
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
                      <span className="text-[10px] text-emerald-600 font-semibold">120m away (Sector 17)</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#E1EAF2] flex justify-between items-center">
                      <span className="font-mono text-[#2463A6] font-bold">CAM-22-003</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">340m away (Sector 22)</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#8291A2]">
                    Coordinates: {selectedReport.latitude}, {selectedReport.longitude}
                  </div>
                </div>
              </div>

              {/* Already Processed Notice */}
              {isProcessed && (
                <div className={`p-4 rounded-xl border text-xs space-y-1 ${
                  selectedReport.status === 'VERIFIED'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}>
                  <div className="font-bold flex items-center space-x-1.5">
                    {selectedReport.status === 'VERIFIED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {selectedReport.status === 'VERIFIED'
                        ? 'This report has been Verified and converted into an official Incident.'
                        : 'This report has been Declined by Operations Control.'}
                    </span>
                  </div>
                  {selectedReport.review_notes && (
                    <p className="text-[11px] mt-1 pl-5 text-gray-700">
                      <strong>Recorded Assessment:</strong> "{selectedReport.review_notes}"
                    </p>
                  )}
                </div>
              )}

              {/* Control Operator Decision & Assessment Workspace */}
              <div className="p-4 rounded-xl bg-[#F0F5FA] border border-[#CBDCEE] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#172F50] flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#2463A6]" />
                    <span>Control Operator Assessment & Decision Desk</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Assessment Notes Mandatory *
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-[#172F50]">
                      Operator Assessment Notes <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-[#526477]">
                      {reviewNotes.trim().length} chars (min 5)
                    </span>
                  </div>
                  
                  <textarea
                    ref={notesInputRef}
                    rows={3}
                    value={reviewNotes}
                    disabled={isProcessing}
                    onChange={(e) => {
                      setReviewNotes(e.target.value);
                      if (notesError) setNotesError(null);
                    }}
                    placeholder="Enter mandatory operator assessment notes (e.g., CCTV verified, duplicate report, team dispatched, non-actionable footage)..."
                    className={`w-full px-3 py-2 text-xs bg-white rounded-lg text-[#172F50] transition focus:outline-none ${
                      notesError
                        ? 'border-2 border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border border-[#CBDCEE] focus:border-[#2463A6]'
                    }`}
                  />

                  {/* Mandatory Error Alert */}
                  {notesError && (
                    <div className="mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-1.5 animate-shake">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="font-medium text-[11px]">{notesError}</span>
                    </div>
                  )}

                  <p className="text-[10px] text-[#8291A2] mt-1">
                    * Operator assessment notes are permanently sealed in the official CIIRS investigation audit trail. Both acceptance and decline require explicit reasoning.
                  </p>
                </div>

                {/* Decision Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#CBDCEE]">
                  {/* Accept & Convert */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction('VERIFY_AND_CONVERT')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept & Convert to Incident Record</span>
                  </button>

                  {/* Decline Report */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction('DECLINE')}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Decline Report (Remove from Queue)</span>
                  </button>

                  {/* Mark Under Review */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction('UNDER_REVIEW')}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-[#CBDCEE] text-xs font-bold text-[#2463A6] hover:bg-[#E2EDF9] transition flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark Under Review</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center space-y-3">
              <ClipboardList className="w-10 h-10 text-[#8291A2] mx-auto opacity-50" />
              <div className="text-sm font-bold text-[#172F50]">No citizen report selected</div>
              <p className="text-xs text-[#8291A2] max-w-sm mx-auto">
                Select a report from the active queue on the left pane to begin operator verification, evidence correlation, and assessment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

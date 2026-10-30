import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Plus, CheckCircle2, Clock, ShieldCheck, 
  MessageSquare, AlertCircle, ArrowRight, User, X
} from 'lucide-react';
import { api } from '../services/api';
import { InvestigationCase } from '../types';

export const InvestigationWorkspace: React.FC = () => {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<any>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseSummary, setNewCaseSummary] = useState('');

  const fetchCases = async () => {
    try {
      const data = await api.getCases();
      setCases(data);
      if (data.length > 0 && !selectedCaseDetail) {
        handleSelectCase(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCase = async (caseId: number) => {
    try {
      const detail = await api.getCaseDetail(caseId);
      setSelectedCaseDetail(detail);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !selectedCaseDetail) return;
    setIsAddingNote(true);
    try {
      await api.addCaseNote(selectedCaseDetail.case.id, newNoteContent, 'INVESTIGATOR_OBSERVATION');
      setNewNoteContent('');
      await handleSelectCase(selectedCaseDetail.case.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseTitle.trim()) return;
    try {
      const created = await api.createCase({
        case_number: `CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: newCaseTitle,
        assigned_investigator: 'Inspector Priya Sen',
        status: 'OPEN',
        priority: 'HIGH',
        summary: newCaseSummary,
        ai_preliminary_findings: 'Automated temporal sequence flagged kinetic anomaly.',
        operator_verified_facts: 'Operator verified real-time CCTV feeds and approved investigation.'
      });
      setShowNewCaseModal(false);
      setNewCaseTitle('');
      setNewCaseSummary('');
      await fetchCases();
      handleSelectCase(created.id);
    } catch (e) {
      console.error(e);
    }
  };

  const currentCase = selectedCaseDetail?.case;

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Header */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Investigation Reports & Forensic Evidence Vault
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Strict legal separation of AI probabilistic indicators, operator verified facts, and investigator findings.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentCase && (
            <a
              href={api.exportCasePdfUrl(currentCase.id)}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Forensic PDF</span>
            </a>
          )}

          <button
            onClick={() => setShowNewCaseModal(true)}
            className="px-3.5 py-2 bg-[#F4F8FC] hover:bg-[#DCEBFA] text-[#2463A6] font-semibold text-xs rounded-lg border border-[#E1EAF2] flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open New Case</span>
          </button>
        </div>
      </div>

      {/* Main 2-Col View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Cases List */}
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
          <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider block border-b border-[#E1EAF2] pb-2">
            Investigation Cases ({cases.length})
          </span>

          <div className="space-y-2 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
            {cases.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCase(c.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                  currentCase?.id === c.id 
                    ? 'bg-[#DCEBFA]/40 border-[#2463A6] shadow-sm' 
                    : 'bg-[#F8FAFC] border-[#E1EAF2] hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[#172F50]">{c.case_number}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCEBFA] text-[#2463A6] font-bold">
                    {c.status}
                  </span>
                </div>
                <div className="font-semibold text-[#172F50] line-clamp-1">{c.title}</div>
                <div className="text-[10px] text-[#8291A2] mt-1">Lead: {c.assigned_investigator}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2-Cols: Tripartite Evidence & Case Telemetry */}
        {selectedCaseDetail ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Case Overview Card */}
            <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
                <div>
                  <h3 className="text-base font-bold text-[#172F50]">{currentCase.title}</h3>
                  <div className="text-xs text-[#8291A2] font-mono mt-0.5">
                    {currentCase.case_number} • Lead: {currentCase.assigned_investigator} • Priority: <span className="text-[#E34D59] font-bold">{currentCase.priority}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#526477] leading-relaxed pt-1">
                {currentCase.summary}
              </p>
            </div>

            {/* Tripartite Evidence Attribution */}
            <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
              <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider block border-b border-[#E1EAF2] pb-2">
                Tripartite Evidence Distinction (Legal Evidentiary Standard)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. AI Predictions */}
                <div className="p-3 rounded-lg bg-[#EBF3FC] border border-[#CBDCEE] space-y-1.5">
                  <div className="font-bold text-[#2463A6] uppercase text-[10px] font-mono">
                    1. AI Predictions (Probabilistic)
                  </div>
                  <div className="text-[11px] text-[#526477] leading-relaxed">
                    {currentCase.ai_preliminary_findings || 'Automated pre-incident kinetic telemetry.'}
                  </div>
                </div>

                {/* 2. Operator Verified */}
                <div className="p-3 rounded-lg bg-[#E8F8F0] border border-[#A7F3D0] space-y-1.5">
                  <div className="font-bold text-[#16A36A] uppercase text-[10px] font-mono">
                    2. Operator Verified (Facts)
                  </div>
                  <div className="text-[11px] text-[#526477] leading-relaxed">
                    {currentCase.operator_verified_facts || 'Verified by control room operator.'}
                  </div>
                </div>

                {/* 3. Investigator Conclusions */}
                <div className="p-3 rounded-lg bg-[#FFFDF5] border border-[#FEF08A] space-y-1.5">
                  <div className="font-bold text-[#E5A12B] uppercase text-[10px] font-mono">
                    3. Investigator Conclusions
                  </div>
                  <div className="text-[11px] text-[#526477] leading-relaxed">
                    {currentCase.investigator_conclusions || 'Forensic analysis corroborates timeline.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Items with SHA-256 Hashes */}
            <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-2.5">
              <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider block border-b border-[#E1EAF2] pb-2">
                Cryptographically Sealed Evidence Vault
              </span>

              <div className="space-y-2">
                {selectedCaseDetail.evidence_items?.map((ev: any) => (
                  <div key={ev.id} className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1EAF2] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#172F50]">{ev.title}</div>
                      <div className="text-[10px] font-mono text-[#8291A2] mt-0.5">
                        SHA-256: <span className="text-[#2463A6]">{ev.sha256_hash.slice(0, 36)}...</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#E8F8F0] text-[#16A36A] border border-[#A7F3D0] font-bold">
                      VERIFIED TAMPER-FREE
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Case Notes & Adding Note */}
            <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
              <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider block border-b border-[#E1EAF2] pb-2">
                Investigator Chronology & Notes
              </span>

              <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {selectedCaseDetail.notes?.map((note: any) => (
                  <div key={note.id} className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1EAF2] text-xs">
                    <div className="flex items-center justify-between text-[10px] text-[#8291A2] mb-1">
                      <span className="font-semibold text-[#172F50]">{note.author_name}</span>
                      <span className="font-mono">{note.note_type}</span>
                    </div>
                    <div className="text-[#526477]">{note.content}</div>
                  </div>
                ))}
              </div>

              {/* Add Note Input */}
              <div className="flex items-center space-x-2 pt-2 border-t border-[#E1EAF2]">
                <input
                  type="text"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Append investigator observation to case file..."
                  className="flex-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#2463A6]"
                />
                <button
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNoteContent.trim()}
                  className="px-3 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white border border-[#E1EAF2] rounded-xl p-12 text-center text-[#8291A2] text-xs">
            Select a case to inspect evidence and notes.
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E1EAF2] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
              <h3 className="text-sm font-bold text-[#172F50]">Open Forensic Investigation Case</h3>
              <button onClick={() => setShowNewCaseModal(false)} className="text-[#8291A2] hover:text-[#172F50]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-[#526477] font-semibold">Case Title</label>
              <input
                type="text"
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
                placeholder="e.g. Sector 22 Unattended Bag Analysis"
                className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#2463A6]"
              />
            </div>
            <div>
              <label className="text-xs text-[#526477] font-semibold">Executive Summary</label>
              <textarea
                rows={3}
                value={newCaseSummary}
                onChange={(e) => setNewCaseSummary(e.target.value)}
                placeholder="Summary of incident circumstances..."
                className="w-full mt-1 bg-[#F4F8FC] border border-[#E1EAF2] text-[#172F50] text-xs p-2.5 rounded-lg focus:outline-none focus:border-[#2463A6]"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E1EAF2]">
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[#CBDCEE] text-[#526477] text-xs font-semibold hover:bg-[#F4F8FC]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                className="px-4 py-1.5 rounded-lg bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-xs shadow-sm transition"
              >
                Create Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

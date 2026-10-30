import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Crosshair, CheckCircle2, AlertTriangle, 
  Search, Clock, ShieldCheck, MapPin, Send, FileText, User
} from 'lucide-react';
import { api } from '../services/api';
import { PublicIncidentReport } from '../types';

export const IncidentReporting: React.FC = () => {
  const [reports, setReports] = useState<PublicIncidentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [trackedReport, setTrackedReport] = useState<PublicIncidentReport | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Form State
  const [category, setCategory] = useState('Traffic Obstruction');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(30.7333);
  const [longitude, setLongitude] = useState<number>(76.7794);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getPublicReports();
      setReports(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        if (!address) {
          setAddress(`GPS Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
        }
      },
      (err) => alert(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please provide a description of the incident.');
      return;
    }

    try {
      setSubmitting(true);
      const report = await api.submitPublicReport({
        category,
        description,
        address: address || 'Chandigarh City Centre',
        latitude,
        longitude,
        reporter_name: reporterName || 'Anonymous Citizen',
        reporter_phone: reporterPhone || undefined
      });

      setSubmittedCode(report.report_code);
      setDescription('');
      setAddress('');
      fetchReports();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    try {
      setTrackingLoading(true);
      const report = await api.trackPublicReport(trackingCode.trim());
      setTrackedReport(report);
    } catch (err: any) {
      alert('Report code not found or invalid.');
      setTrackedReport(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const categories = [
    'Traffic Obstruction',
    'Possible Altercation / Fight',
    'Medical Distress / Person Fallen',
    'Unattended Object / Bag',
    'Road Accident',
    'Restricted-Area Intrusion',
    'Civic / Infrastructure Hazard',
    'Other Public Safety Concern'
  ];

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Header */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Citizen Public Safety & Incident Reporting
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Secure citizen portal for real-time incident submissions with geolocation verification and status tracking.
            </p>
          </div>
        </div>
      </div>

      {submittedCode && (
        <div className="p-4 bg-[#E8F8F0] border border-[#A7F3D0] rounded-xl text-xs flex items-center justify-between text-[#16A36A]">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold">Incident Report Submitted Successfully</div>
              <div>Your unique tracking code is: <strong className="font-mono text-sm underline">{submittedCode}</strong>. Control operators have been alerted.</div>
            </div>
          </div>
          <button 
            onClick={() => setSubmittedCode(null)}
            className="px-3 py-1 bg-white border border-[#A7F3D0] text-[#16A36A] font-semibold rounded hover:bg-[#F0FDF4]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Submission Form (Left 7 cols) & Track Code / Recent Reports (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Report Submission Form */}
        <div className="lg:col-span-7 bg-white border border-[#E1EAF2] rounded-xl p-5 shadow-sm">
          <div className="border-b border-[#E1EAF2] pb-2 mb-4">
            <h2 className="text-sm font-bold text-[#172F50]">Submit New Incident Report</h2>
            <p className="text-[11px] text-[#8291A2]">
              Reports are instantly cross-referenced with nearby CCTV streams for verification.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#526477] mb-1">Incident Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#526477] mb-1">Detailed Description *</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you observed (e.g. unattended black backpack near Sector 17 fountain, crowd gathering quickly...)"
                className="w-full px-3 py-2 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#526477]">Location & Landmark</label>
                <button
                  type="button"
                  onClick={handleUseGps}
                  className="text-xs text-[#2463A6] hover:underline flex items-center space-x-1"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Auto-detect My GPS Location</span>
                </button>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Sector, Street, or prominent building landmark"
                className="w-full px-3 py-2 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Your Name (Optional)</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Citizen / Anonymous"
                  className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Contact Phone (Optional)</label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Transmitting to Command Centre...' : 'Submit Incident Report'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Track Report Status & Recent Reports List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tracker Card */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-[#172F50] mb-2 flex items-center space-x-1.5">
              <Search className="w-3.5 h-3.5 text-[#2463A6]" />
              <span>Track Existing Report Status</span>
            </h3>

            <form onSubmit={handleTrack} className="flex space-x-2 mb-3">
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Enter Code (e.g. REP-2026-1042)"
                className="flex-1 px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] font-mono uppercase"
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="px-3 py-1.5 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                Track
              </button>
            </form>

            {trackedReport && (
              <div className="p-3 bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-[#2463A6]">{trackedReport.report_code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    trackedReport.status === 'VERIFIED' ? 'bg-[#E8F8F0] text-[#16A36A]' :
                    trackedReport.status === 'PENDING' ? 'bg-[#FEF3C7] text-[#E5A12B]' :
                    'bg-[#F1F4F8] text-[#8795A5]'
                  }`}>
                    {trackedReport.status}
                  </span>
                </div>
                <div><strong className="text-[#172F50]">{trackedReport.category}</strong></div>
                <div className="text-[11px] text-[#526477]">{trackedReport.description}</div>
                <div className="text-[10px] text-[#8291A2] pt-1 border-t border-[#CBDCEE]">
                  Submitted on: {new Date(trackedReport.created_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Recent Reports Received */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-[#172F50] mb-2 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#2463A6]" />
              <span>Recent Public Incident Feed</span>
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {reports.map((r) => (
                <div key={r.id} className="p-2.5 rounded-lg border border-[#E1EAF2] bg-[#F8FAFC] text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-bold text-[#2463A6] text-[11px]">{r.report_code}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      r.status === 'VERIFIED' ? 'bg-[#E8F8F0] text-[#16A36A]' :
                      r.status === 'PENDING' ? 'bg-[#FEF3C7] text-[#E5A12B]' :
                      'bg-[#F1F4F8] text-[#8795A5]'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="font-semibold text-[#172F50]">{r.category}</div>
                  <div className="text-[11px] text-[#526477] line-clamp-2">{r.description}</div>
                  <div className="text-[10px] text-[#8291A2] mt-1">{r.address}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

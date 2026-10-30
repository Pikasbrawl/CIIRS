import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Search, ShieldCheck, MapPin, Upload, 
  FileText, CheckCircle2, Clock, AlertTriangle, Phone,
  Camera, ArrowRight, UserCheck, Shield, ExternalLink,
  Info, Sparkles, Navigation, Send, RefreshCw, Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PublicIncidentReport } from '../types';

export const CitizenPortal: React.FC = () => {
  const { activeTab, setActiveTab, currentUser } = useApp();

  // Tab mode within Citizen Portal: 'dashboard' | 'report' | 'track' | 'help'
  const [subTab, setSubTab] = useState<'dashboard' | 'report' | 'track' | 'help'>(
    activeTab === 'citizen-report' ? 'report' :
    activeTab === 'citizen-track' ? 'track' :
    activeTab === 'citizen-help' ? 'help' : 'dashboard'
  );

  useEffect(() => {
    if (activeTab === 'citizen-report') setSubTab('report');
    else if (activeTab === 'citizen-track') setSubTab('track');
    else if (activeTab === 'citizen-help') setSubTab('help');
    else if (activeTab === 'citizen-dashboard') setSubTab('dashboard');
  }, [activeTab]);

  // Form State
  const [category, setCategory] = useState('Traffic Incident');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState('Sector 17');
  const [address, setAddress] = useState('Sector 17 Central Plaza, Chandigarh');
  const [latitude, setLatitude] = useState(30.7398);
  const [longitude, setLongitude] = useState(76.7827);
  const [reporterName, setReporterName] = useState(currentUser.full_name || 'Pooja Sharma');
  const [reporterContact, setReporterContact] = useState('+91 98140 55122');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('/static/sample_cctv_frame1.jpg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  // Tracking State
  const [trackCodeInput, setTrackCodeInput] = useState('CIT-2026-7841');
  const [trackedReport, setTrackedReport] = useState<any>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Recent Reports submitted by Citizen
  const [myReports, setMyReports] = useState<PublicIncidentReport[]>([]);

  const fetchMyReports = async () => {
    try {
      const reports = await api.getPublicReports();
      setMyReports(reports);
      // Preload first report for tracking
      if (reports.length > 0 && !trackedReport) {
        handleTrackReport(reports[0].report_code);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  const handleUseGPS = () => {
    // Simulate high-accuracy GPS fix in Chandigarh
    const sectors: Record<string, { lat: number; lng: number; addr: string }> = {
      'Sector 17': { lat: 30.7398, lng: 76.7827, addr: 'Sector 17 Central Plaza Promenade' },
      'Sector 22': { lat: 30.7290, lng: 76.7725, addr: 'Sector 22 Shastri Market Walkway' },
      'Sector 35': { lat: 30.7210, lng: 76.7620, addr: 'Sector 35 Commercial District, Inner Road' },
      'Sector 43': { lat: 30.7182, lng: 76.7465, addr: 'Sector 43 Inter-State Bus Terminal Perimeter' },
      'Sukhna Lake': { lat: 30.7421, lng: 76.8188, addr: 'Sukhna Lake Promenade & Boating Deck' }
    };

    const target = sectors[sector] || sectors['Sector 17'];
    setLatitude(target.lat);
    setLongitude(target.lng);
    setAddress(target.addr);
  };

  const handleSectorChange = (sec: string) => {
    setSector(sec);
    const coords: Record<string, { lat: number; lng: number; addr: string }> = {
      'Sector 17': { lat: 30.7398, lng: 76.7827, addr: 'Sector 17 Plaza, Chandigarh' },
      'Sector 22': { lat: 30.7290, lng: 76.7725, addr: 'Sector 22 Shastri Market, Chandigarh' },
      'Sector 35': { lat: 30.7210, lng: 76.7620, addr: 'Sector 35 Commercial Hub, Chandigarh' },
      'Sector 43': { lat: 30.7182, lng: 76.7465, addr: 'Sector 43 Transit Terminal, Chandigarh' },
      'Sector 9': { lat: 30.7480, lng: 76.7880, addr: 'Sector 9 Police Headquarters Outer Perimeter' },
      'Sukhna Lake': { lat: 30.7421, lng: 76.8188, addr: 'Sukhna Lake Promenade, Chandigarh' },
      'IT Park': { lat: 30.7250, lng: 76.8400, addr: 'Chandigarh Technology Park (IT Park) Boulevard' }
    };
    if (coords[sec]) {
      setLatitude(coords[sec].lat);
      setLongitude(coords[sec].lng);
      setAddress(coords[sec].addr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe what happened.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitPublicReport({
        category,
        description,
        address,
        latitude,
        longitude,
        reporter_name: isAnonymous ? 'Anonymous Citizen' : reporterName,
        reporter_contact: isAnonymous ? '' : reporterContact,
        attachment_url: attachmentUrl
      });

      if (res && res.report_code) {
        setSubmittedCode(res.report_code);
        setTrackCodeInput(res.report_code);
        await fetchMyReports();
      }
    } catch (err: any) {
      alert('Error submitting report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackReport = async (code: string) => {
    if (!code.trim()) return;
    setIsSearching(true);
    setTrackError(null);
    try {
      const data = await api.trackPublicReport(code);
      setTrackedReport(data);
    } catch (err) {
      setTrackedReport(null);
      setTrackError('Report ID not found. Please verify the code.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Citizen Banner */}
      <div className="bg-gradient-to-r from-[#172F50] via-[#2463A6] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
                Chandigarh Public Safety Portal
              </span>
              <span className="text-xs text-blue-200">
                City Division: Sector 17 & 22 Sub-District
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {currentUser.full_name || 'Pooja Sharma'}
            </h1>
            <p className="text-sm text-blue-100 max-w-xl mt-1">
              Empowering citizens to report incidents quickly, follow verified safety alerts, and track status transparently while upholding strict privacy.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setSubTab('report'); setActiveTab('citizen-report'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                subTab === 'report' ? 'bg-white text-[#172F50] shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Megaphone className="w-4 h-4 text-[#E34D59]" />
              <span>Report Incident</span>
            </button>
            <button
              onClick={() => { setSubTab('track'); setActiveTab('citizen-track'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                subTab === 'track' ? 'bg-white text-[#172F50] shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Search className="w-4 h-4 text-[#60A5FA]" />
              <span>Track Report</span>
            </button>
            <button
              onClick={() => { setSubTab('help'); setActiveTab('citizen-help'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                subTab === 'help' ? 'bg-white text-[#172F50] shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Phone className="w-4 h-4 text-[#34D399]" />
              <span>Emergency 112</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB CONTENT */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Emergency Hotlines Quick Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Emergency Response', number: '112', color: 'bg-red-50 text-red-700 border-red-200', note: 'National Toll-Free' },
              { label: 'Chandigarh Police', number: '100', color: 'bg-blue-50 text-blue-700 border-blue-200', note: 'PCR Van Dispatch' },
              { label: 'Ambulance & EMS', number: '108', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', note: 'PGIMER & GMSH' },
              { label: 'Women Helpline', number: '1091', color: 'bg-purple-50 text-purple-700 border-purple-200', note: '24/7 Rapid Support' },
              { label: 'Traffic Police', number: '1073', color: 'bg-amber-50 text-amber-700 border-amber-200', note: 'Traffic & Accidents' },
              { label: 'Fire & Rescue', number: '101', color: 'bg-orange-50 text-orange-700 border-orange-200', note: 'Sector 17 Station' }
            ].map((hotline, idx) => (
              <div key={idx} className={`p-3.5 rounded-xl border ${hotline.color} flex flex-col justify-between`}>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{hotline.label}</div>
                  <div className="text-2xl font-black font-mono mt-1">{hotline.number}</div>
                </div>
                <div className="text-[10px] opacity-75 mt-2 font-medium">{hotline.note}</div>
              </div>
            ))}
          </div>

          {/* Active Public Safety Advisories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-white rounded-2xl border border-[#E1EAF2] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#2463A6]" />
                  <h3 className="text-sm font-bold text-[#172F50]">Chandigarh Police Safety Advisories</h3>
                </div>
                <span className="text-[11px] font-semibold text-[#2463A6] bg-[#DCEBFA] px-2 py-0.5 rounded-full">
                  Verified Bulletins
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: 'Traffic Advisory: Tribune Chowk Flyover Maintenance',
                    sector: 'Sector 29 / 31 Intersection',
                    time: 'Today, 08:00 AM',
                    severity: 'NOTICE',
                    desc: 'Diversion in place via Dakshin Marg. Commuters heading to IT Park are advised to use Madhya Marg between 16:00 and 20:00.'
                  },
                  {
                    title: 'Festive Season Crowd Safety Protocol in Sector 17 Plaza',
                    sector: 'Sector 17 Commercial Centre',
                    time: 'Yesterday, 18:30 PM',
                    severity: 'ADVISORY',
                    desc: 'Additional PCR rapid response teams stationed near Musical Fountain. Do not leave unattended personal luggage or belongings.'
                  },
                  {
                    title: 'Pedestrian Crossing Safety Enhancement',
                    sector: 'Sector 22 Shastri Market',
                    time: '28 Oct 2026',
                    severity: 'UPDATE',
                    desc: 'New automated smart pelican pedestrian signals calibrated. Speed limit enforced at 30 km/h in pedestrian school zones.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[#E1EAF2] bg-[#F8FAFC] hover:bg-white hover:border-[#2463A6]/40 transition space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-[#172F50]">{item.title}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E2EDF9] text-[#2463A6]">
                        {item.sector}
                      </span>
                    </div>
                    <p className="text-xs text-[#526477]">{item.desc}</p>
                    <div className="text-[10px] text-[#8291A2]">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Recent Reports Card */}
            <div className="bg-white rounded-2xl border border-[#E1EAF2] p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-[#2463A6]" />
                    <h3 className="text-sm font-bold text-[#172F50]">My Submitted Reports</h3>
                  </div>
                  <span className="text-xs font-semibold text-[#8291A2] font-mono">
                    {myReports.length} Total
                  </span>
                </div>

                <div className="space-y-2.5">
                  {myReports.slice(0, 3).map((rep) => (
                    <div 
                      key={rep.id} 
                      onClick={() => {
                        setTrackCodeInput(rep.report_code);
                        handleTrackReport(rep.report_code);
                        setSubTab('track');
                      }}
                      className="p-3 rounded-xl border border-[#E1EAF2] hover:border-[#2463A6] bg-[#F8FAFC] cursor-pointer transition space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2463A6] font-mono">{rep.report_code}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rep.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                          rep.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rep.status}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#172F50] truncate">{rep.category}</div>
                      <div className="text-[11px] text-[#8291A2] truncate">{rep.address}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setSubTab('report'); setActiveTab('citizen-report'); }}
                className="w-full py-2.5 rounded-xl bg-[#2463A6] hover:bg-[#1E528B] text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <Megaphone className="w-4 h-4" />
                <span>Submit New Incident Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT AN INCIDENT FORM */}
      {subTab === 'report' && (
        <div className="bg-white rounded-2xl border border-[#E1EAF2] p-6 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-[#E1EAF2] pb-4">
            <div className="flex items-center space-x-2 text-[#2463A6] mb-1">
              <Megaphone className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Citizen Public Safety Intake</span>
            </div>
            <h2 className="text-xl font-bold text-[#172F50]">Report a Public Safety Incident</h2>
            <p className="text-xs text-[#526477] mt-0.5">
              Your report will be securely transmitted to the Chandigarh Police Integrated Operations Command Centre for immediate verification and response.
            </p>
          </div>

          {submittedCode ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900">Incident Report Logged Successfully!</h3>
                <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                  Your reference tracking number has been generated. The Sector Control Room and Field Patrol units have been notified.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200 max-w-sm mx-auto shadow-sm">
                <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Tracking Reference Code</div>
                <div className="text-2xl font-black font-mono text-[#172F50] mt-1 select-all">{submittedCode}</div>
                <div className="text-[10px] text-gray-500 mt-1">Keep this code to track response updates</div>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => {
                    setTrackCodeInput(submittedCode);
                    handleTrackReport(submittedCode);
                    setSubTab('track');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#2463A6] text-white text-xs font-bold hover:bg-[#1E528B] transition flex items-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Track This Report Now</span>
                </button>
                <button
                  onClick={() => {
                    setSubmittedCode(null);
                    setDescription('');
                  }}
                  className="px-5 py-2.5 rounded-xl border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition"
                >
                  Submit Another Report
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category & Date/Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#172F50] mb-1.5">
                    Incident Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6] focus:bg-white"
                  >
                    <option value="Traffic Incident">Traffic Incident / Collision</option>
                    <option value="Reckless Driving">Reckless Driving / Speeding</option>
                    <option value="Theft or Robbery">Theft or Robbery</option>
                    <option value="Suspicious Object">Suspicious Unattended Object / Bag</option>
                    <option value="Public Harassment">Public Harassment / Eve Teasing</option>
                    <option value="Vandalism">Vandalism / Public Property Damage</option>
                    <option value="Road Hazard">Road Hazard / Open Manhole / Tree Fall</option>
                    <option value="Noise Disturbance">Noise Disturbance / Public Nuisance</option>
                    <option value="Other">Other Community Safety Concern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172F50] mb-1.5">
                    Incident Sector in Chandigarh <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6] focus:bg-white"
                  >
                    <option value="Sector 17">Sector 17 — Commercial Plaza & Promenade</option>
                    <option value="Sector 22">Sector 22 — Shastri Market & Residential</option>
                    <option value="Sector 35">Sector 35 — Hotel & Restaurant Belt</option>
                    <option value="Sector 43">Sector 43 — ISBT Transit Hub</option>
                    <option value="Sector 9">Sector 9 — Police Headquarters Belt</option>
                    <option value="Sukhna Lake">Sukhna Lake Promenade</option>
                    <option value="IT Park">Chandigarh IT Park (Kishangarh)</option>
                  </select>
                </div>
              </div>

              {/* Exact Location & Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#172F50]">
                    Specific Location & Landmark <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUseGPS}
                    className="text-[11px] font-bold text-[#2463A6] hover:underline flex items-center space-x-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Auto-Detect My GPS Location</span>
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#8291A2] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Fountain, Block C, Sector 17"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6] focus:bg-white"
                    required
                  />
                </div>
                <div className="flex items-center space-x-4 text-[11px] text-[#8291A2] font-mono">
                  <span>Lat: {latitude.toFixed(4)} N</span>
                  <span>Long: {longitude.toFixed(4)} E</span>
                  <span className="text-emerald-600 font-sans font-medium">● Geolocation Validated</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#172F50] mb-1.5">
                  Detailed Description of Occurrence <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details: what happened, approximate number of individuals involved, vehicle license plates (if seen), direction of movement, etc."
                  className="w-full p-3 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] focus:outline-none focus:border-[#2463A6] focus:bg-white resize-none"
                  required
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#172F50]">
                  Attach Photographic or Video Evidence (Optional)
                </label>
                <div className="border-2 border-dashed border-[#CBDCEE] rounded-xl p-4 bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    {attachmentUrl ? (
                      <img src={attachmentUrl} alt="Evidence Preview" className="w-16 h-12 rounded-lg object-cover border border-[#CBDCEE]" />
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-[#E2EDF9] flex items-center justify-center text-[#2463A6]">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#172F50]">
                        {attachmentUrl ? 'Evidence Attached (1 file)' : 'Upload Photo or Video'}
                      </div>
                      <div className="text-[11px] text-[#8291A2]">Supports JPG, PNG, MP4 up to 50MB</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl('/static/sample_cctv_frame1.jpg')}
                      className="px-3 py-1.5 rounded-lg border border-[#CBDCEE] text-[11px] font-semibold text-[#2463A6] hover:bg-[#E2EDF9] transition"
                    >
                      Attach Scene Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl('/static/real_pedestrian_walk.mp4')}
                      className="px-3 py-1.5 rounded-lg border border-[#CBDCEE] text-[11px] font-semibold text-[#2463A6] hover:bg-[#E2EDF9] transition"
                    >
                      Attach Video Clip
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Info & Anonymous Toggle */}
              <div className="p-4 rounded-xl bg-[#F0F5FA] border border-[#CBDCEE] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#172F50]">Reporter Identity</div>
                  <label className="flex items-center space-x-2 text-xs text-[#526477] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-[#CBDCEE] text-[#2463A6] focus:ring-0"
                    />
                    <span>Submit Anonymously</span>
                  </label>
                </div>

                {!isAnonymous && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#526477] mb-1">Your Name</label>
                      <input
                        type="text"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#526477] mb-1">Mobile Contact</label>
                      <input
                        type="text"
                        value={reporterContact}
                        onChange={(e) => setReporterContact(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBDCEE] rounded-lg text-[#172F50]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubTab('dashboard')}
                  className="px-5 py-2.5 rounded-xl border border-[#CBDCEE] text-xs font-semibold text-[#526477] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#2463A6] hover:bg-[#1E528B] text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting Report...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Report to Police Operations</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TRACK MY REPORTS */}
      {subTab === 'track' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Tracking Search Card */}
          <div className="bg-white rounded-2xl border border-[#E1EAF2] p-6 shadow-sm space-y-4">
            <div>
              <div className="flex items-center space-x-2 text-[#2463A6] mb-1">
                <Search className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Public Status Tracker</span>
              </div>
              <h2 className="text-xl font-bold text-[#172F50]">Track Your Incident Report</h2>
              <p className="text-xs text-[#526477] mt-0.5">
                Check current status updates, assigned division, and actions taken by Chandigarh Police.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-[#8291A2] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={trackCodeInput}
                  onChange={(e) => setTrackCodeInput(e.target.value)}
                  placeholder="Enter tracking code (e.g. CIT-2026-7841)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl text-[#172F50] font-mono focus:outline-none focus:border-[#2463A6] focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => handleTrackReport(trackCodeInput)}
                disabled={isSearching}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2463A6] hover:bg-[#1E528B] text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Check Status</span>
              </button>
            </div>

            {/* Quick Demo Pre-fills */}
            <div className="flex items-center space-x-2 pt-1 text-xs text-[#526477]">
              <span className="text-[11px] font-semibold text-[#8291A2]">Quick Select:</span>
              {myReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setTrackCodeInput(r.report_code);
                    handleTrackReport(r.report_code);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#EDF4FC] hover:bg-[#DCEBFA] text-[#2463A6] font-mono text-[11px] font-bold border border-[#CBDCEE] transition"
                >
                  {r.report_code}
                </button>
              ))}
            </div>

            {trackError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}
          </div>

          {/* Tracked Report Results Card */}
          {trackedReport && (
            <div className="bg-white rounded-2xl border border-[#E1EAF2] p-6 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#E1EAF2] gap-3">
                <div>
                  <div className="text-[11px] font-bold text-[#8291A2] uppercase tracking-wider">Report Details</div>
                  <h3 className="text-lg font-bold text-[#172F50]">{trackedReport.category}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-mono font-bold text-[#2463A6] bg-[#DCEBFA] px-2 py-0.5 rounded">
                      {trackedReport.report_code}
                    </span>
                    <span className="text-xs text-[#526477]">{trackedReport.address}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] font-semibold text-[#8291A2]">Current Status</div>
                  <span className={`inline-block mt-0.5 px-3 py-1 rounded-full text-xs font-bold ${
                    trackedReport.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    trackedReport.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    trackedReport.status === 'DISMISSED' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    ● {trackedReport.status}
                  </span>
                </div>
              </div>

              {/* Status Timeline Stepper */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-[#172F50] uppercase tracking-wider">
                  Official Verification & Response Timeline
                </div>

                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#CBDCEE]">
                  {(trackedReport.status_history || [
                    { status: 'SUBMITTED', timestamp: 'Today, 14:30 IST', note: 'Report successfully logged into Chandigarh Smart City Public Safety network.' },
                    { status: 'UNDER_REVIEW', timestamp: 'Today, 14:35 IST', note: 'Assigned to Sector 17 Division Control Room for active CCTV correlation and verification.' }
                  ]).map((step: any, idx: number) => (
                    <div key={idx} className="relative">
                      {/* Stepper Dot */}
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#2463A6] border-2 border-white shadow-sm flex items-center justify-center text-white text-[9px]">
                        ✓
                      </div>
                      <div className="bg-[#F8FAFC] border border-[#E1EAF2] rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#172F50]">{step.status}</span>
                          <span className="text-[10px] text-[#8291A2] font-mono">{step.timestamp}</span>
                        </div>
                        <p className="text-xs text-[#526477]">{step.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-4 rounded-xl bg-[#F0F5FA] border border-[#CBDCEE] flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-[#2463A6] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#172F50]">Strict Citizen Privacy Safeguard</div>
                  <p className="text-[11px] text-[#526477] mt-0.5">
                    {trackedReport.privacy_guarantee || 'Confidential investigation forensics, internal responder radio communications, and live CCTV feeds are strictly restricted to authorized police personnel.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SAFETY & HELPLINES GUIDE */}
      {subTab === 'help' && (
        <div className="bg-white rounded-2xl border border-[#E1EAF2] p-6 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-[#E1EAF2] pb-4">
            <div className="flex items-center space-x-2 text-[#2463A6] mb-1">
              <Phone className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Citizen Safety Directory</span>
            </div>
            <h2 className="text-xl font-bold text-[#172F50]">Chandigarh Emergency Helplines & Police Stations</h2>
            <p className="text-xs text-[#526477] mt-0.5">
              Direct access to emergency response, sub-divisional police stations, and cyber safety resources.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#E1EAF2] bg-[#F8FAFC] space-y-2">
              <div className="text-xs font-bold text-[#172F50]">Sector 17 Central Police Station</div>
              <div className="text-xs text-[#526477]">Address: Sector 17-D, Near District Courts Complex</div>
              <div className="text-xs font-mono font-bold text-[#2463A6]">Direct Phone: 0172-2773951</div>
              <div className="text-[11px] text-gray-500">Jurisdiction: Sector 17, 18, 22 Commercial Areas</div>
            </div>

            <div className="p-4 rounded-xl border border-[#E1EAF2] bg-[#F8FAFC] space-y-2">
              <div className="text-xs font-bold text-[#172F50]">Sector 36 Police Station (South Division)</div>
              <div className="text-xs text-[#526477]">Address: Sector 36-D, Dakshin Marg</div>
              <div className="text-xs font-mono font-bold text-[#2463A6]">Direct Phone: 0172-2601777</div>
              <div className="text-[11px] text-gray-500">Jurisdiction: Sector 35, 36, 42 Commercial Belt</div>
            </div>

            <div className="p-4 rounded-xl border border-[#E1EAF2] bg-[#F8FAFC] space-y-2">
              <div className="text-xs font-bold text-[#172F50]">PGIMER Emergency Medical & Trauma Center</div>
              <div className="text-xs text-[#526477]">Address: Sector 12, Chandigarh</div>
              <div className="text-xs font-mono font-bold text-emerald-700">Trauma ICU: 0172-2746018 / 108</div>
              <div className="text-[11px] text-gray-500">24/7 Level-1 Advanced Trauma Resuscitation</div>
            </div>

            <div className="p-4 rounded-xl border border-[#E1EAF2] bg-[#F8FAFC] space-y-2">
              <div className="text-xs font-bold text-[#172F50]">National Cyber Crime Reporting Helpline</div>
              <div className="text-xs text-[#526477]">Financial fraud, online stalking & harassment</div>
              <div className="text-xs font-mono font-bold text-purple-700">Toll-Free Helpline: 1930</div>
              <div className="text-[11px] text-gray-500">Official Portal: cybercrime.gov.in</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

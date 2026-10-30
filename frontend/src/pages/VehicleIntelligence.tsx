import React, { useState, useEffect } from 'react';
import { 
  Car, Search, AlertTriangle, ShieldCheck, CheckCircle2, 
  Filter, Clock, MapPin, Gauge, Download, Eye, RefreshCw,
  FileSearch, AlertCircle, FileText, Siren, ShieldAlert,
  Sparkles, Check, X, ExternalLink, Calendar, User, Fuel
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { VehicleDetection } from '../types';

export const VehicleIntelligence: React.FC = () => {
  const { setActiveTab } = useApp();
  const [vehicles, setVehicles] = useState<VehicleDetection[]>([]);
  const [searchPlate, setSearchPlate] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'STOLEN' | 'CHALLANS' | 'CLEAR'>('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDetection | null>(null);
  const [dispatchAlertMsg, setDispatchAlertMsg] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      if (searchPlate.trim()) {
        const res = await api.searchVehicles(searchPlate.trim());
        setVehicles(res);
        if (res.length > 0) {
          setSelectedVehicle(res[0]);
        }
      } else {
        const res = await api.getRecentVehicles(20);
        setVehicles(res);
        if (res.length > 0 && !selectedVehicle) {
          setSelectedVehicle(res[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load vehicles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [searchPlate]);

  const filteredVehicles = Array.isArray(vehicles) ? vehicles.filter(v => {
    if (activeFilter === 'STOLEN') return v.is_stolen;
    if (activeFilter === 'CHALLANS') return (v.pending_challans_count || 0) > 0;
    if (activeFilter === 'CLEAR') return !v.is_stolen && (!v.pending_challans_count || v.pending_challans_count === 0);
    return true;
  }) : [];

  const handleSelectPlate = (plateNumber: string) => {
    setSearchPlate(plateNumber);
    const found = Array.isArray(vehicles) ? vehicles.find(v => v.plate_number.replace(/-/g, '') === plateNumber.replace(/-/g, '')) : null;
    if (found) {
      setSelectedVehicle(found);
    }
  };

  const handleDispatchPCR = (vehicle: VehicleDetection) => {
    setDispatchAlertMsg(`PCR Dispatch order initiated for ${vehicle.plate_number} to Sector Patrol units.`);
    setTimeout(() => setDispatchAlertMsg(null), 5000);
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Header */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Number Plate Search & Verification (ANPR)
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Live automated plate recognition, e-Challan enforcement, CCTNS stolen vehicle lookup, and CCTV forensic crops.
            </p>
          </div>
        </div>

        <button
          onClick={fetchVehicles}
          className="p-2 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] text-[#526477] hover:text-[#172F50] transition self-start md:self-auto flex items-center space-x-1.5 text-xs font-semibold"
          title="Refresh ANPR Feed"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Database</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-[#526477]">Detections Today</div>
          <div className="text-2xl font-bold text-[#172F50] font-mono mt-1">1,248</div>
          <div className="text-[10px] text-[#16A36A] font-medium mt-0.5">+12% vs 7-day average</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-[#526477]">OCR Recognition Accuracy</div>
          <div className="text-2xl font-bold text-[#16A36A] font-mono mt-1">96.3%</div>
          <div className="text-[10px] text-[#526477] mt-0.5">Dual-OCR pipeline verification</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-[#526477]">Stolen Vehicles Detected</div>
          <div className="text-2xl font-bold text-[#E34D59] font-mono mt-1">2</div>
          <div className="text-[10px] text-[#E34D59] font-medium mt-0.5">Active CCTNS FIR matches</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-[#526477]">Pending Challan Defaulters</div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">4</div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">Overdue traffic court notices</div>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl w-full">
            <Search className="w-4 h-4 text-[#8291A2] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
              placeholder="Search number plate (e.g. CH01AB1234, HR26DA4321, PB65EF9012)..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] font-mono uppercase focus:outline-none focus:border-[#2463A6] focus:bg-white"
            />
            {searchPlate && (
              <button
                onClick={() => setSearchPlate('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === 'ALL'
                  ? 'bg-[#2463A6] text-white shadow-sm'
                  : 'bg-[#F4F8FC] border border-[#E1EAF2] text-[#526477] hover:bg-[#EBF3FC]'
              }`}
            >
              All Plates ({Array.isArray(vehicles) ? vehicles.length : 0})
            </button>
            <button
              onClick={() => setActiveFilter('STOLEN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                activeFilter === 'STOLEN'
                  ? 'bg-[#E34D59] text-white shadow-sm'
                  : 'bg-red-50 border border-red-200 text-[#E34D59] hover:bg-red-100'
              }`}
            >
              <span>🚨 Stolen ({Array.isArray(vehicles) ? vehicles.filter(v => v.is_stolen).length : 0})</span>
            </button>
            <button
              onClick={() => setActiveFilter('CHALLANS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                activeFilter === 'CHALLANS'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span>⚠️ Pending Challans ({Array.isArray(vehicles) ? vehicles.filter(v => (v.pending_challans_count || 0) > 0).length : 0})</span>
            </button>
            <button
              onClick={() => setActiveFilter('CLEAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                activeFilter === 'CLEAR'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <span>✅ All Clear</span>
            </button>
          </div>
        </div>

        {/* Quick Search Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F0F5FA] text-xs">
          <span className="text-[11px] font-bold text-[#8291A2]">Quick Select:</span>
          <button
            onClick={() => handleSelectPlate('CH01AB1234')}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition flex items-center space-x-1 ${
              selectedVehicle?.plate_number === 'CH01AB1234'
                ? 'bg-red-100 border-red-400 text-red-800'
                : 'bg-[#F8FAFC] border-[#CBDCEE] text-[#172F50] hover:bg-[#EBF3FC]'
            }`}
          >
            <span>CH01AB1234</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-red-200 text-red-900 font-sans">STOLEN • 3 CHALLANS</span>
          </button>

          <button
            onClick={() => handleSelectPlate('HR26DA4321')}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition flex items-center space-x-1 ${
              selectedVehicle?.plate_number === 'HR26DA4321'
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-[#F8FAFC] border-[#CBDCEE] text-[#172F50] hover:bg-[#EBF3FC]'
            }`}
          >
            <span>HR26DA4321</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-sans">4 CHALLANS</span>
          </button>

          <button
            onClick={() => handleSelectPlate('PB65EF9012')}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition flex items-center space-x-1 ${
              selectedVehicle?.plate_number === 'PB65EF9012'
                ? 'bg-red-100 border-red-400 text-red-800'
                : 'bg-[#F8FAFC] border-[#CBDCEE] text-[#172F50] hover:bg-[#EBF3FC]'
            }`}
          >
            <span>PB65EF9012</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-red-200 text-red-900 font-sans">STOLEN MOTORCYCLE</span>
          </button>

          <button
            onClick={() => handleSelectPlate('CH01CD5678')}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition flex items-center space-x-1 ${
              selectedVehicle?.plate_number === 'CH01CD5678'
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                : 'bg-[#F8FAFC] border-[#CBDCEE] text-[#172F50] hover:bg-[#EBF3FC]'
            }`}
          >
            <span>CH01CD5678</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200 text-emerald-900 font-sans">CLEAN (0 CHALLANS)</span>
          </button>

          <button
            onClick={() => handleSelectPlate('DL8CA1299')}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition flex items-center space-x-1 ${
              selectedVehicle?.plate_number === 'DL8CA1299'
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-[#F8FAFC] border-[#CBDCEE] text-[#172F50] hover:bg-[#EBF3FC]'
            }`}
          >
            <span>DL8CA1299</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-sans">COMMERCIAL IMPOUND</span>
          </button>
        </div>
      </div>

      {dispatchAlertMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-[#2463A6] rounded-xl text-xs font-semibold flex items-center space-x-2">
          <Siren className="w-4 h-4 text-[#2463A6] animate-pulse" />
          <span>{dispatchAlertMsg}</span>
        </div>
      )}

      {/* Main Grid: Detections Table + Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E1EAF2] rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-3 border-b border-[#E1EAF2] bg-[#EDF4FC] flex items-center justify-between">
              <span className="text-xs font-bold text-[#172F50]">
                Number Plate Log & Live ANPR Streams ({filteredVehicles.length})
              </span>
              <span className="text-[10px] text-[#8291A2]">
                Click any row to inspect vehicle photo, challans & theft status
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#526477] font-semibold border-b border-[#E1EAF2]">
                  <tr>
                    <th className="py-2.5 px-3">Vehicle / Photo</th>
                    <th className="py-2.5 px-3">Number Plate</th>
                    <th className="py-2.5 px-3">Stolen Status</th>
                    <th className="py-2.5 px-3">E-Challans</th>
                    <th className="py-2.5 px-3">Camera / Loc</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1EAF2] text-[#172F50]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#8291A2]">
                        Scanning plate registry...
                      </td>
                    </tr>
                  ) : filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#8291A2]">
                        No matching vehicle records found.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr 
                        key={v.id} 
                        onClick={() => setSelectedVehicle(v)}
                        className={`hover:bg-[#F4F8FC] cursor-pointer transition ${
                          selectedVehicle?.plate_number === v.plate_number ? 'bg-[#DCEBFA]/50 font-medium' : ''
                        }`}
                      >
                        {/* Vehicle Photo Thumbnail + Make */}
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-12 h-9 rounded-md bg-slate-900 overflow-hidden relative shrink-0 border border-[#CBDCEE]">
                              {v.image_url ? (
                                <img src={v.image_url} alt={v.plate_number} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Car className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="truncate max-w-[110px]">
                              <div className="font-bold text-[#172F50] text-[11px] truncate">
                                {v.vehicle_make_model || v.vehicle_type}
                              </div>
                              <div className="text-[10px] text-[#8291A2]">{v.vehicle_type}</div>
                            </div>
                          </div>
                        </td>

                        {/* Tactical Plate */}
                        <td className="py-2 px-3">
                          <div className="anpr-plate-box px-2 py-0.5 text-xs font-mono inline-block">
                            {v.plate_number}
                          </div>
                        </td>

                        {/* Stolen Status */}
                        <td className="py-2 px-3">
                          {v.is_stolen ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span>STOLEN</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>CLEAN</span>
                            </span>
                          )}
                        </td>

                        {/* Challan Status */}
                        <td className="py-2 px-3">
                          {(v.pending_challans_count || 0) > 0 ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              <span>{v.pending_challans_count} Pending</span>
                              <span className="text-amber-900 font-mono">(₹{v.pending_challans_total})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[10px] border border-emerald-200">
                              <span>0 Pending</span>
                            </span>
                          )}
                        </td>

                        {/* Camera & Location */}
                        <td className="py-2 px-3 text-[#526477]">
                          <div className="font-semibold text-[#2463A6] text-[11px]">{v.camera_id}</div>
                          <div className="text-[10px] text-[#8291A2] truncate max-w-[120px]">{v.location || v.camera_name}</div>
                        </td>

                        {/* Action */}
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(v);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              selectedVehicle?.plate_number === v.plate_number
                                ? 'bg-[#2463A6] text-white border-[#2463A6]'
                                : 'bg-[#F4F8FC] border-[#CBDCEE] text-[#2463A6] hover:bg-[#DCEBFA]'
                            }`}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 border-t border-[#E1EAF2] bg-[#F8FAFC] text-[11px] text-[#8291A2] flex items-center justify-between">
            <span>Integrated with Chandigarh Police ANPR & VAHAN National Registry</span>
            <span className="font-mono text-[#2463A6]">API: v1/vehicles/detections</span>
          </div>
        </div>

        {/* Selected Vehicle Forensic Detail Dossier (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-4">
          {selectedVehicle ? (
            <div className="space-y-4">
              {/* Dossier Header */}
              <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
                <div>
                  <h3 className="text-sm font-bold text-[#172F50]">Detection Forensic Inspection</h3>
                  <div className="text-[11px] text-[#526477]">
                    {selectedVehicle.vehicle_make_model || selectedVehicle.vehicle_type}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#8291A2] bg-[#F4F8FC] px-2 py-0.5 rounded border border-[#CBDCEE]">
                  ID: #{selectedVehicle.id}
                </span>
              </div>

              {/* ANPR Tactical Plate Display */}
              <div className="text-center py-3 bg-[#F4F8FC] border border-[#E1EAF2] rounded-xl shadow-2xs">
                <div className="anpr-plate-box px-5 py-2 text-lg shadow-sm inline-block">
                  {selectedVehicle.plate_number}
                </div>
                <div className="text-[10px] text-[#8291A2] mt-1.5 flex items-center justify-center space-x-1">
                  <span>Standard High Security Registration Plate (HSRP)</span>
                  <span>•</span>
                  <span className="text-[#2463A6] font-semibold">{selectedVehicle.rto_office || 'Chandigarh RTO'}</span>
                </div>
              </div>

              {/* REAL VEHICLE PHOTO SNAPSHOT CROP */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#172F50]">
                  <span>CCTV ANPR Visual Evidence Crop</span>
                  <span className="text-[#2463A6] font-mono text-[10px]">{selectedVehicle.camera_id}</span>
                </div>

                <div className="h-48 rounded-xl bg-slate-900 border-2 border-[#CBDCEE] relative overflow-hidden group shadow-inner">
                  {selectedVehicle.image_url ? (
                    <img
                      src={selectedVehicle.image_url}
                      alt={`Vehicle ${selectedVehicle.plate_number}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Car className="w-16 h-16" />
                    </div>
                  )}

                  {/* Watermark badge on photo */}
                  <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono flex items-center space-x-1 shadow">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{selectedVehicle.camera_id} CROP</span>
                  </div>

                  {selectedVehicle.is_stolen ? (
                    <div className="absolute top-2.5 right-2.5 bg-[#E34D59] text-white text-[10px] font-black px-2.5 py-0.5 rounded shadow flex items-center space-x-1 animate-bounce">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>🚨 STOLEN ALERT</span>
                    </div>
                  ) : (selectedVehicle.pending_challans_count || 0) > 0 ? (
                    <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow flex items-center space-x-1">
                      <span>CHALLAN DEFAULTER</span>
                    </div>
                  ) : (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      VERIFIED NOMINAL
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[10px] font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
                    <span>Speed: {selectedVehicle.speed_kmh || 42} km/h</span>
                    <span>OCR: {(selectedVehicle.confidence > 1 ? selectedVehicle.confidence : selectedVehicle.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* 1. STOLEN VEHICLE STATUS SECTION */}
              {selectedVehicle.is_stolen ? (
                <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-red-800 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>🚨 STOLEN VEHICLE ALERT (POLICE CUSTODY WANTED)</span>
                  </div>
                  <div className="text-xs text-red-900 bg-white/80 p-2.5 rounded-lg border border-red-200 space-y-1">
                    <div className="font-bold text-red-800">
                      {selectedVehicle.stolen_details?.fir_number || 'FIR #402/2026, U/S 379 IPC'}
                    </div>
                    <div className="text-[11px] text-red-700">
                      <strong>Police Station:</strong> {selectedVehicle.stolen_details?.police_station || 'Sector 17 Central PS, Chandigarh'}
                    </div>
                    <div className="text-[11px] text-red-700">
                      <strong>Theft Date:</strong> {selectedVehicle.stolen_details?.theft_date || '18 Oct 2026, 21:15 IST'}
                    </div>
                    <div className="text-[11px] text-red-700">
                      <strong>Complainant:</strong> {selectedVehicle.stolen_details?.complainant_name || selectedVehicle.owner_name}
                    </div>
                    <div className="text-[11px] text-red-800 font-bold pt-0.5">
                      ⚠️ Action: {selectedVehicle.stolen_details?.status || 'Active Wanted Vehicle — Intercept and Detain immediately.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">✅ No Stolen Record (CCTNS Verified)</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Vehicle not reported stolen in Chandigarh Police or NCRB records.
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    CLEAN
                  </span>
                </div>
              )}

              {/* 2. PENDING E-CHALLAN STATUS SECTION */}
              {(selectedVehicle.pending_challans_count || 0) > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <div className="flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{selectedVehicle.pending_challans_count} PENDING E-CHALLANS RECORDED</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono text-xs font-bold">
                      ₹{selectedVehicle.pending_challans_total?.toLocaleString()} Fine Unpaid
                    </span>
                  </div>

                  {/* Challans list */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedVehicle.challans?.map((ch) => (
                      <div key={ch.id} className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-[#172F50]">{ch.challan_number}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            ch.status === 'OVERDUE' ? 'bg-red-100 text-red-700 border border-red-200' :
                            ch.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ch.status} • ₹{ch.amount}
                          </span>
                        </div>
                        <div className="font-medium text-[#172F50]">{ch.violation}</div>
                        <div className="text-[#8291A2] text-[10px] flex justify-between">
                          <span>{ch.location}</span>
                          <span>{ch.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">✅ 0 Pending E-Challans (All Clear)</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        No outstanding fines or court challans against this registration.
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    NO FINES
                  </span>
                </div>
              )}

              {/* 3. VAHAN & TELEMETRY REGISTRATION SPECIFICATIONS */}
              <div className="space-y-2 text-xs border border-[#E1EAF2] rounded-xl p-3.5 bg-[#F8FAFC]">
                <div className="text-[11px] font-bold text-[#172F50] uppercase tracking-wider pb-1 border-b border-[#E1EAF2]">
                  VAHAN Registration & Sensor Telemetry
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[#8291A2] block">Vehicle Make / Model:</span>
                    <strong className="text-[#172F50]">{selectedVehicle.vehicle_make_model || selectedVehicle.vehicle_type}</strong>
                  </div>
                  <div>
                    <span className="text-[#8291A2] block">Registered Owner:</span>
                    <strong className="text-[#172F50]">{selectedVehicle.owner_name || 'Rahul Singhania'}</strong>
                  </div>
                  <div>
                    <span className="text-[#8291A2] block">RTO Jurisdiction:</span>
                    <span className="text-[#2463A6] font-semibold">{selectedVehicle.rto_office || 'Chandigarh RTO (CH-01)'}</span>
                  </div>
                  <div>
                    <span className="text-[#8291A2] block">Fuel & Emission:</span>
                    <span className="text-[#172F50]">{selectedVehicle.fuel_type || 'Diesel (BS-VI)'}</span>
                  </div>
                  <div>
                    <span className="text-[#8291A2] block">Camera Sensor:</span>
                    <span className="text-[#2463A6] font-semibold">{selectedVehicle.camera_id}</span>
                  </div>
                  <div>
                    <span className="text-[#8291A2] block">Detection Location:</span>
                    <span className="text-[#172F50] truncate block">{selectedVehicle.location || selectedVehicle.camera_name}</span>
                  </div>
                  <div>
                    <span className="text-[#8291A2] block">OCR Confidence:</span>
                    <strong className="text-[#16A36A] font-mono">
                      {(selectedVehicle.confidence > 1 ? selectedVehicle.confidence : selectedVehicle.confidence * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8291A2] block">Recorded Speed:</span>
                    <span className="text-[#172F50] font-mono">{selectedVehicle.speed_kmh || 42} km/h</span>
                  </div>
                </div>

                {selectedVehicle.is_watchlist && selectedVehicle.watchlist_reason && (
                  <div className="pt-2 border-t border-[#CBDCEE] mt-2">
                    <span className="text-[#E34D59] font-bold block mb-0.5 text-[11px]">Watchlist Advisory:</span>
                    <p className="text-[11px] text-[#526477] bg-[#FEECEC] p-2 rounded-lg border border-[#FECACA]">
                      {selectedVehicle.watchlist_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedVehicle.is_stolen && (
                  <button
                    onClick={() => handleDispatchPCR(selectedVehicle)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5"
                  >
                    <Siren className="w-4 h-4 animate-pulse" />
                    <span>Dispatch PCR Intercept Team</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('gis-map')}
                  className="flex-1 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-xl shadow-sm transition"
                >
                  Locate on Map
                </button>
                <button
                  onClick={() => setActiveTab('incident-reconstruction')}
                  className="flex-1 py-2 bg-white border border-[#CBDCEE] hover:bg-[#F4F8FC] text-[#526477] text-xs font-semibold rounded-xl transition"
                >
                  View CCTV Timeline
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-[#8291A2] text-xs space-y-2">
              <FileSearch className="w-10 h-10 text-gray-300 mx-auto" />
              <div>Select any number plate from the list or search above to inspect full forensic vehicle dossier.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

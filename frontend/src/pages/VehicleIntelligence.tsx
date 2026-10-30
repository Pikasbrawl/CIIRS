import React, { useState, useEffect } from 'react';
import { 
  Car, Search, AlertTriangle, ShieldCheck, CheckCircle2, 
  Filter, Clock, MapPin, Gauge, Download, Eye, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { VehicleDetection } from '../types';

export const VehicleIntelligence: React.FC = () => {
  const { setActiveTab } = useApp();
  const [vehicles, setVehicles] = useState<VehicleDetection[]>([]);
  const [searchPlate, setSearchPlate] = useState('');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDetection | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      if (searchPlate.trim()) {
        const res = await api.searchVehicles(searchPlate.trim());
        setVehicles(res);
      } else {
        const res = await api.getRecentVehicles(20);
        setVehicles(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [searchPlate]);

  const filteredVehicles = vehicles.filter(v => {
    if (watchlistOnly && !v.is_watchlist) return false;
    return true;
  });

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Header */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Vehicle Intelligence & ANPR Operations
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Automated Number Plate Recognition, high-speed telemetry, and city watchlist surveillance.
            </p>
          </div>
        </div>

        <button
          onClick={fetchVehicles}
          className="p-2 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] text-[#526477] hover:text-[#172F50] transition self-start md:self-auto"
          title="Refresh ANPR Feed"
        >
          <RefreshCw className="w-4 h-4" />
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
          <div className="text-xs font-medium text-[#526477]">Recognition Accuracy</div>
          <div className="text-2xl font-bold text-[#16A36A] font-mono mt-1">96.4%</div>
          <div className="text-[10px] text-[#526477] mt-0.5">Dual-OCR pipeline verification</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-[#526477]">Watchlist Matches</div>
          <div className="text-2xl font-bold text-[#E34D59] font-mono mt-1">3</div>
          <div className="text-[10px] text-[#E34D59] font-medium mt-0.5">Rapid dispatch notified</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-[#526477]">Avg Flow Speed</div>
          <div className="text-2xl font-bold text-[#172F50] font-mono mt-1">42.5 km/h</div>
          <div className="text-[10px] text-[#2463A6] font-medium mt-0.5">Normal urban flow</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-lg w-full">
          <Search className="w-4 h-4 text-[#8291A2] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
            placeholder="Search number plate (e.g. CH01AB1234 or PB65)..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] font-mono uppercase focus:outline-none focus:border-[#2463A6]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="flex items-center space-x-2 text-xs font-medium text-[#526477] cursor-pointer">
            <input
              type="checkbox"
              checked={watchlistOnly}
              onChange={(e) => setWatchlistOnly(e.target.checked)}
              className="rounded border-[#CBDCEE] text-[#2463A6] focus:ring-0"
            />
            <span>Watchlist Plates Only</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Detections Table + Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E1EAF2] rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 border-b border-[#E1EAF2] bg-[#EDF4FC] flex items-center justify-between">
            <span className="text-xs font-bold text-[#172F50]">
              Plate Detections ({filteredVehicles.length})
            </span>
            <span className="text-[10px] text-[#8291A2]">
              Real-time Indian standard license plates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#526477] font-semibold border-b border-[#E1EAF2]">
                <tr>
                  <th className="py-2.5 px-3">License Plate</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Camera ID</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Watchlist</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1EAF2] text-[#172F50]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#8291A2]">
                      Scanning plate logs...
                    </td>
                  </tr>
                ) : filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#8291A2]">
                      No vehicle detections found.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => (
                    <tr 
                      key={v.id} 
                      onClick={() => setSelectedVehicle(v)}
                      className={`hover:bg-[#F4F8FC] cursor-pointer transition ${
                        selectedVehicle?.id === v.id ? 'bg-[#DCEBFA]/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="anpr-plate-box px-2 py-0.5 text-xs">
                          {v.plate_number}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#8291A2] font-mono text-[11px]">
                        {v.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#2463A6]">
                        {v.camera_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#526477] max-w-[140px] truncate">
                        {v.location}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {v.vehicle_type}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#16A36A]">
                        {v.confidence.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3">
                        {v.is_watchlist ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#E34D59] font-bold text-[10px]">
                            WATCHLIST
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-[#E8F8F0] text-[#16A36A] font-medium text-[10px]">
                            Nominal
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVehicle(v);
                          }}
                          className="px-2 py-1 rounded bg-[#F4F8FC] border border-[#CBDCEE] hover:bg-[#DCEBFA] text-[#2463A6] text-[11px] font-semibold"
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

        {/* Selected Vehicle Detail Card (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          {selectedVehicle ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
                <h3 className="text-sm font-bold text-[#172F50]">Detection Forensic Inspection</h3>
                <span className="text-[10px] text-[#8291A2]">ID: #{selectedVehicle.id}</span>
              </div>

              {/* ANPR Tactical Plate Display */}
              <div className="text-center py-3 bg-[#F4F8FC] border border-[#E1EAF2] rounded-xl">
                <div className="anpr-plate-box px-4 py-1.5 text-base shadow-sm">
                  {selectedVehicle.plate_number}
                </div>
                <div className="text-[10px] text-[#8291A2] mt-1.5">
                  Standard HSRP Registration Plate
                </div>
              </div>

              {/* Vehicle Snapshot Placeholder */}
              <div className="h-36 rounded-lg bg-slate-900 border border-[#CBDCEE] flex items-center justify-center relative overflow-hidden">
                <Car className="w-16 h-16 text-slate-100" />
                <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                  {selectedVehicle.camera_id} CROP
                </div>
                {selectedVehicle.is_watchlist && (
                  <div className="absolute top-2 right-2 bg-[#E34D59] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                    ALERT
                  </div>
                )}
              </div>

              {/* Attributes List */}
              <div className="space-y-2 text-xs border border-[#E1EAF2] rounded-lg p-3 bg-[#F8FAFC]">
                <div className="flex justify-between">
                  <span className="text-[#8291A2]">Vehicle Classification:</span>
                  <strong className="text-[#172F50]">{selectedVehicle.vehicle_type}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8291A2]">OCR Confidence:</span>
                  <strong className="text-[#16A36A] font-mono">{selectedVehicle.confidence.toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8291A2]">Camera Sensor:</span>
                  <span className="text-[#2463A6] font-semibold">{selectedVehicle.camera_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8291A2]">Location:</span>
                  <span className="text-[#172F50]">{selectedVehicle.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8291A2]">Timestamp:</span>
                  <span className="text-[#172F50] font-mono">{selectedVehicle.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8291A2]">Estimated Speed:</span>
                  <span className="text-[#172F50] font-mono">{selectedVehicle.speed_kmh || 38.5} km/h</span>
                </div>

                {selectedVehicle.is_watchlist && (
                  <div className="pt-2 border-t border-[#FEE2E2] mt-2">
                    <span className="text-[#E34D59] font-bold block mb-0.5">Watchlist Reason:</span>
                    <p className="text-[11px] text-[#526477] bg-[#FEECEC] p-2 rounded border border-[#FECACA]">
                      {selectedVehicle.watchlist_reason || 'Vehicle flagged by Law Enforcement Bureau.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('gis-map')}
                  className="flex-1 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Locate on Map
                </button>
                <button
                  onClick={() => setActiveTab('incident-reconstruction')}
                  className="flex-1 py-2 bg-white border border-[#CBDCEE] hover:bg-[#F4F8FC] text-[#526477] text-xs font-semibold rounded-lg transition"
                >
                  View Timeline
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-[#8291A2] text-xs">
              Select any license plate from the table to inspect forensic telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

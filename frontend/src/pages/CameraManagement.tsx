import React, { useState, useEffect } from 'react';
import { 
  Camera, Plus, Search, Filter, ShieldCheck, AlertTriangle, 
  Trash2, Edit, RefreshCw, Video, Crosshair, Check, X
} from 'lucide-react';
import { api } from '../services/api';
import { Camera as CameraType } from '../types';

export const CameraManagement: React.FC = () => {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    camera_id: '',
    name: '',
    latitude: 30.7333,
    longitude: 76.7794,
    address: '',
    area_zone: 'Sector 17',
    resolution: '1080p',
    fps: 30,
    stream_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const data = await api.getCameras();
      setCameras(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6))
        }));
      },
      (err) => alert(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.camera_id || !formData.name) {
      alert('Please fill Camera ID and Name');
      return;
    }

    try {
      setSaving(true);
      await api.registerCamera({
        ...formData,
        status: 'ONLINE',
        trust_score: 95,
        is_tampered: false,
        is_obstructed: false
      });
      setMessage(`Camera ${formData.camera_id} registered successfully.`);
      setShowAddModal(false);
      setFormData({
        camera_id: '',
        name: '',
        latitude: 30.7333,
        longitude: 76.7794,
        address: '',
        area_zone: 'Sector 17',
        resolution: '1080p',
        fps: 30,
        stream_url: ''
      });
      fetchCameras();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, camId: string) => {
    if (!confirm(`Are you sure you want to deactivate camera ${camId}?`)) return;
    try {
      await api.deleteCamera(id);
      setMessage(`Camera ${camId} deactivated.`);
      fetchCameras();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const filteredCameras = cameras.filter(cam => {
    const matchesSearch = cam.camera_id.toLowerCase().includes(search.toLowerCase()) ||
                          cam.name.toLowerCase().includes(search.toLowerCase()) ||
                          cam.address.toLowerCase().includes(search.toLowerCase());
    const matchesZone = zoneFilter === 'ALL' || cam.area_zone === zoneFilter;
    const matchesStatus = statusFilter === 'ALL' || cam.status === statusFilter;
    return matchesSearch && matchesZone && matchesStatus;
  });

  const zones = Array.from(new Set(cameras.map(c => c.area_zone))).sort();

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto">
      {/* Header Bar */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#172F50] leading-none">
                Camera Management & Hardware Registry
              </h1>
              <p className="text-xs text-[#526477] mt-0.5">
                Centralized registry of all {cameras.length} connected city cameras, coordinates, and health status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchCameras}
            className="p-2 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] text-[#526477] hover:text-[#172F50] transition"
            title="Refresh Registry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Camera</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-[#E8F8F0] border border-[#A7F3D0] text-[#16A36A] text-xs font-medium rounded-lg flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-[#16A36A] hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-[#8291A2] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, or street location..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:border-[#2463A6]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg px-2.5 py-1.5 text-[#172F50] focus:outline-none"
          >
            <option value="ALL">All Sectors ({zones.length})</option>
            {zones.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg px-2.5 py-1.5 text-[#172F50] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ONLINE">Online ({cameras.filter(c => c.status === 'ONLINE').length})</option>
            <option value="DEGRADED">Degraded ({cameras.filter(c => c.status === 'DEGRADED').length})</option>
            <option value="OFFLINE">Offline ({cameras.filter(c => c.status === 'OFFLINE').length})</option>
          </select>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDF4FC] text-[#526477] font-semibold border-b border-[#E1EAF2]">
              <tr>
                <th className="py-2.5 px-3">Camera ID</th>
                <th className="py-2.5 px-3">Name & Address</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3">Resolution & FPS</th>
                <th className="py-2.5 px-3">Hardware Trust</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1EAF2] text-[#172F50]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#8291A2]">
                    Loading camera registry...
                  </td>
                </tr>
              ) : filteredCameras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#8291A2]">
                    No cameras match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredCameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-[#F4F8FC] transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#2463A6]">
                      {cam.camera_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#172F50]">{cam.name}</div>
                      <div className="text-[11px] text-[#8291A2] truncate max-w-xs">{cam.address}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#526477]">
                      {cam.area_zone}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#8291A2]">
                      {cam.latitude.toFixed(4)}, {cam.longitude.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 text-[#526477]">
                      {cam.resolution} @ {cam.fps}fps
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-16 bg-[#EDF4FC] h-2 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${cam.trust_score}%` }} 
                            className={`h-full ${cam.trust_score >= 80 ? 'bg-[#16A36A]' : cam.trust_score >= 50 ? 'bg-[#E5A12B]' : 'bg-[#E34D59]'}`}
                          ></div>
                        </div>
                        <span className="font-mono text-[11px] text-[#526477]">{cam.trust_score}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cam.status === 'ONLINE' ? 'bg-[#E8F8F0] text-[#16A36A]' :
                        cam.status === 'DEGRADED' ? 'bg-[#FEF3C7] text-[#E5A12B]' :
                        'bg-[#F1F4F8] text-[#8795A5]'
                      }`}>
                        {cam.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleDelete(cam.id, cam.camera_id)}
                          className="p-1 rounded text-[#E34D59] hover:bg-[#FEECEC] transition"
                          title="Deactivate Camera"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E1EAF2] rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E1EAF2] bg-[#EDF4FC] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-[#2463A6]" />
                <h3 className="text-sm font-bold text-[#172F50]">Register New Camera</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#8291A2] hover:text-[#172F50]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Camera ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="CAM-19-001"
                    value={formData.camera_id}
                    onChange={(e) => setFormData({ ...formData, camera_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Sector Zone *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sector 19"
                    value={formData.area_zone}
                    onChange={(e) => setFormData({ ...formData, area_zone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Camera Name / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="Sector 19 Commercial Market Entrance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="SCO 45-48, Sector 19-C, Chandigarh"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] focus:outline-none focus:border-[#2463A6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#526477]">Latitude</label>
                    <button
                      type="button"
                      onClick={handleUseGps}
                      className="text-[10px] text-[#2463A6] hover:underline flex items-center space-x-1"
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                      <span>Use GPS</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] font-mono focus:outline-none focus:border-[#2463A6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] font-mono focus:outline-none focus:border-[#2463A6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Resolution</label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50]"
                  >
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="4K">4K (Ultra HD)</option>
                    <option value="720p">720p (HD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#526477] mb-1">Stream FPS</label>
                  <input
                    type="number"
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Stream RTSP / WebRTC URL</label>
                <input
                  type="text"
                  placeholder="rtsp://admin:pass@192.168.1.101:554/live"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E1EAF2]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#CBDCEE] text-xs font-semibold text-[#526477] hover:bg-[#F4F8FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'Registering...' : 'Register Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

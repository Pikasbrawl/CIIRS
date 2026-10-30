import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Wifi, AlertTriangle, Video, Briefcase, Car, 
  MapPin, Maximize2, Crosshair, ChevronRight, Play, Eye, 
  Search, ExternalLink, Shield, Check, Clock, TrendingUp
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Camera as CameraType, VehicleDetection, AlertItem } from '../types';

export const Dashboard: React.FC = () => {
  const { setActiveTab } = useApp();

  // State
  const [kpiData, setKpiData] = useState<any>({
    registered_cameras: 100,
    connected_cameras: 86,
    alert_cameras: 5,
    offline_cameras: 9,
    active_investigations: 12,
    vehicles_detected_today: 1248
  });

  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDetection[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-17-001');
  const [cameraFilter, setCameraFilter] = useState<string>('ALL');
  const [mapViewType, setMapViewType] = useState<string>('STANDARD');
  const [activeVehicleTab, setActiveVehicleTab] = useState<'LIVE' | 'SEARCH'>('LIVE');
  const [searchPlateInput, setSearchPlateInput] = useState<string>('');
  const [scrubberPosition, setScrubberPosition] = useState<number>(45); // percentage along timeline
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Canvas animations for the 4 live feeds
  const canvasRefs = [
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null)
  ];

  // Fetch initial telemetry
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [kpiRes, camRes, alertRes, vehRes] = await Promise.all([
          api.getDashboardKPI().catch(() => null),
          api.getCameras().catch(() => []),
          api.getAlerts(5).catch(() => []),
          api.getRecentVehicles(5).catch(() => [])
        ]);

        if (kpiRes) setKpiData(kpiRes);
        if (camRes && camRes.length > 0) setCameras(camRes);
        if (alertRes && alertRes.length > 0) setAlerts(alertRes);
        if (vehRes && vehRes.length > 0) setVehicles(vehRes);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Chandigarh: 30.7333, 76.7794
    const map = L.map(mapContainerRef.current, {
      center: [30.7333, 76.7794],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    // Light, crisp OpenStreetMap basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map markers when cameras or filter change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    const filtered = cameras.filter(cam => {
      if (cameraFilter === 'CONNECTED') return cam.status === 'ONLINE';
      if (cameraFilter === 'ALERT') return cam.is_tampered || cam.is_obstructed || cam.trust_score < 70;
      if (cameraFilter === 'OFFLINE') return cam.status === 'OFFLINE';
      return true;
    });

    filtered.forEach(cam => {
      let statusKey = 'CONNECTED';
      if (cam.status === 'OFFLINE') statusKey = 'OFFLINE';
      else if (cam.is_tampered || cam.is_obstructed || cam.trust_score < 70) statusKey = 'ALERT';
      
      const isSelected = cam.camera_id === selectedCameraId;

      let color = '#16A36A'; // connected
      if (statusKey === 'ALERT') color = '#E34D59';
      if (statusKey === 'OFFLINE') color = '#8795A5';
      if (isSelected) color = '#2463A6';

      const icon = L.divIcon({
        className: 'cctv-marker',
        html: `<div style="background-color: ${color}; width: ${isSelected ? 16 : 12}px; height: ${isSelected ? 16 : 12}px; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.35); transition: all 0.2s;"></div>`,
        iconSize: [isSelected ? 16 : 12, isSelected ? 16 : 12],
        iconAnchor: [isSelected ? 8 : 6, isSelected ? 8 : 6]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon })
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <div style="font-weight: 700; color: #172F50;">${cam.camera_id}</div>
            <div style="color: #526477; font-size: 11px;">${cam.name}</div>
            <div style="margin-top: 4px; display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${color}20; color: ${color};">
              ${statusKey}
            </div>
          </div>
        `);

      marker.on('click', () => {
        setSelectedCameraId(cam.camera_id);
      });

      marker.addTo(markersGroupRef.current!);
    });
  }, [cameras, cameraFilter, selectedCameraId]);

  // Real Browser GPS "Locate Me"
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
          
          const gpsIcon = L.divIcon({
            className: 'gps-marker',
            html: `
              <div style="position: relative; width: 20px; height: 20px;">
                <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: #2677D9; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; top: 4px; left: 4px; width: 12px; height: 12px; border-radius: 50%; background: #2677D9; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker([latitude, longitude], { icon: gpsIcon })
            .bindPopup('<b style="color: #172F50; font-size: 12px;">Your Live Location</b>')
            .addTo(mapInstanceRef.current)
            .openPopup();
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        // Default graceful center to Sector 17
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([30.7398, 76.7827], 14);
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Canvas CCTV feeds simulation animation
  useEffect(() => {
    let animId: number;
    let t = 0;

    const renderFeeds = () => {
      t += 0.04;
      canvasRefs.forEach((ref, index) => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        // Street/scene background tone
        ctx.fillStyle = index % 2 === 0 ? '#334155' : '#2b394d';
        ctx.fillRect(0, 0, w, h);

        // Road / pedestrian walkways
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, h * 0.45, w, h * 0.55);

        // Center line
        ctx.strokeStyle = '#475569';
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.72);
        ctx.lineTo(w, h * 0.72);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated people/vehicles with bounding boxes
        const xPos1 = (Math.sin(t + index) * 0.35 + 0.45) * w;
        const yPos1 = h * 0.58;

        // Bounding box 1 (Pedestrian)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(xPos1 - 10, yPos1 - 22, 20, 36);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(xPos1 - 10, yPos1 - 22, 20, 36);
        ctx.fillStyle = '#06b6d4';
        ctx.font = '8px monospace';
        ctx.fillText('Person 98%', xPos1 - 10, yPos1 - 24);

        // Bounding box 2 (Vehicle)
        const xPos2 = ((t * 40 + index * 60) % (w + 60)) - 30;
        const yPos2 = h * 0.7;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(xPos2 - 20, yPos2 - 12, 40, 24);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fillRect(xPos2 - 20, yPos2 - 12, 40, 24);
        ctx.fillStyle = '#10b981';
        ctx.font = '8px monospace';
        ctx.fillText('Vehicle 96%', xPos2 - 20, yPos2 - 14);

        // Timestamp overlay
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(6, h - 20, 68, 14);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px monospace';
        ctx.fillText(timeStr, 10, h - 9);
      });

      animId = requestAnimationFrame(renderFeeds);
    };

    renderFeeds();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* =========================================================================
          TOP STATS ROW (6 KPI CARDS MATCHING REFERENCE)
      ========================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Registered Cameras */}
        <div 
          onClick={() => setActiveTab('camera-management')}
          className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#172F50] leading-tight">
              {kpiData.registered_cameras || 100}
            </div>
            <div className="text-xs font-medium text-[#526477] truncate">
              Registered Cameras
            </div>
            <div className="text-[10px] text-[#2463A6] font-medium mt-0.5">
              +2 new this week
            </div>
          </div>
        </div>

        {/* Card 2: Connected */}
        <div 
          onClick={() => { setCameraFilter('CONNECTED'); }}
          className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full bg-[#E8F8F0] text-[#16A36A] flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#172F50] leading-tight">
              {kpiData.connected_cameras || 86}
            </div>
            <div className="text-xs font-medium text-[#526477] truncate">
              Connected
            </div>
            <div className="text-[10px] text-[#16A36A] font-medium mt-0.5">
              86% online
            </div>
          </div>
        </div>

        {/* Card 3: Cameras with Alerts */}
        <div 
          onClick={() => setActiveTab('alerts-events')}
          className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full bg-[#FEECEC] text-[#E34D59] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#172F50] leading-tight">
              {kpiData.alert_cameras || 5}
            </div>
            <div className="text-xs font-medium text-[#526477] truncate">
              Cameras with Alerts
            </div>
            <div className="text-[10px] text-[#E34D59] font-medium mt-0.5">
              Requires attention
            </div>
          </div>
        </div>

        {/* Card 4: Offline */}
        <div 
          onClick={() => { setCameraFilter('OFFLINE'); }}
          className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full bg-[#F1F4F8] text-[#8795A5] flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#172F50] leading-tight">
              {kpiData.offline_cameras || 9}
            </div>
            <div className="text-xs font-medium text-[#526477] truncate">
              Offline
            </div>
            <div className="text-[10px] text-[#8795A5] font-medium mt-0.5">
              9% offline
            </div>
          </div>
        </div>

        {/* Card 5: Active Investigations */}
        <div 
          onClick={() => setActiveTab('investigation')}
          className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full bg-[#F3ECFB] text-[#7E3AF2] flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#172F50] leading-tight">
              {kpiData.active_investigations || 12}
            </div>
            <div className="text-xs font-medium text-[#526477] truncate">
              Active Investigations
            </div>
            <div className="text-[10px] text-[#7E3AF2] font-medium mt-0.5">
              3 high priority
            </div>
          </div>
        </div>

        {/* Card 6: Vehicles Detected Today */}
        <div 
          onClick={() => setActiveTab('vehicle-intelligence')}
          className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#172F50] leading-tight">
              {kpiData.vehicles_detected_today?.toLocaleString() || '1,248'}
            </div>
            <div className="text-xs font-medium text-[#526477] truncate">
              Vehicles Detected Today
            </div>
            <div className="text-[10px] text-[#16A36A] font-medium mt-0.5">
              +12% from yesterday
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MIDDLE ROW (3 COLUMNS: MAP | 2X2 LIVE FEEDS | RECENT ALERTS)
      ========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Col 1: City Camera Network Map (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col h-[410px]">
          {/* Map Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#2463A6]" />
              <h2 className="text-sm font-bold text-[#172F50]">
                Chandigarh City - Camera Network
              </h2>
            </div>

            <div className="flex items-center space-x-1.5">
              <select
                value={cameraFilter}
                onChange={(e) => setCameraFilter(e.target.value)}
                className="text-[11px] font-medium bg-[#F4F8FC] border border-[#E1EAF2] rounded px-2 py-1 text-[#172F50] focus:outline-none"
              >
                <option value="ALL">All Cameras</option>
                <option value="CONNECTED">Connected Only</option>
                <option value="ALERT">Alerts Only</option>
                <option value="OFFLINE">Offline Only</option>
              </select>

              <button 
                onClick={handleLocateMe}
                title="Locate Me (Browser GPS)"
                className="p-1 rounded bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={() => setActiveTab('gis-map')}
                title="Full-Screen GIS View"
                className="p-1 rounded bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Leaflet Map Frame with Floating Status Legend */}
          <div className="relative flex-1 rounded-lg overflow-hidden border border-[#E1EAF2]">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Legend Top-Left (Matches Screenshot) */}
            <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-sm border border-[#E1EAF2] rounded-lg p-2 shadow-sm text-[10px] font-medium space-y-1">
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#16A36A]"></span>
                <span>Connected (86)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#E34D59]"></span>
                <span>Alert (5)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#8795A5]"></span>
                <span>Offline (9)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#E5A12B]"></span>
                <span>Maintenance (0)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#2463A6]"></span>
                <span>Selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Live Camera Feeds (Selected Cameras) - 2x2 Grid (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col h-[410px]">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4 text-[#2463A6]" />
              <h2 className="text-sm font-bold text-[#172F50]">
                Live Camera Feeds <span className="text-xs font-normal text-[#8291A2]">(Selected Cameras)</span>
              </h2>
            </div>
            <button 
              onClick={() => setActiveTab('camera-management')}
              className="text-xs font-semibold text-[#2463A6] hover:underline"
            >
              View All
            </button>
          </div>

          {/* 2x2 Video Tile Grid */}
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {/* Tile 1: CAM-17-001 */}
            <div className="relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-slate-900 flex flex-col group">
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 text-[10px]">
                <span className="font-bold text-white drop-shadow">CAM-17-001 <span className="font-normal text-slate-300">Sector 17 - Plaza</span></span>
                <span className="bg-[#16A36A] text-white px-1.5 py-0.2 rounded font-semibold text-[9px]">Live</span>
              </div>
              <canvas ref={canvasRefs[0]} width={220} height={135} className="w-full h-full object-cover" />
              <button className="absolute bottom-1.5 right-1.5 p-1 bg-black/40 hover:bg-black/70 text-white rounded transition">
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            {/* Tile 2: CAM-22-003 */}
            <div className="relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-slate-900 flex flex-col group">
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 text-[10px]">
                <span className="font-bold text-white drop-shadow">CAM-22-003 <span className="font-normal text-slate-300">Sector 22 - Market</span></span>
                <span className="bg-[#16A36A] text-white px-1.5 py-0.2 rounded font-semibold text-[9px]">Live</span>
              </div>
              <canvas ref={canvasRefs[1]} width={220} height={135} className="w-full h-full object-cover" />
              <button className="absolute bottom-1.5 right-1.5 p-1 bg-black/40 hover:bg-black/70 text-white rounded transition">
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            {/* Tile 3: CAM-35-002 */}
            <div className="relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-slate-900 flex flex-col group">
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 text-[10px]">
                <span className="font-bold text-white drop-shadow">CAM-35-002 <span className="font-normal text-slate-300">Sector 35 - Roundabout</span></span>
                <span className="bg-[#16A36A] text-white px-1.5 py-0.2 rounded font-semibold text-[9px]">Live</span>
              </div>
              <canvas ref={canvasRefs[2]} width={220} height={135} className="w-full h-full object-cover" />
              <button className="absolute bottom-1.5 right-1.5 p-1 bg-black/40 hover:bg-black/70 text-white rounded transition">
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            {/* Tile 4: CAM-43-001 */}
            <div className="relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-slate-900 flex flex-col group">
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 text-[10px]">
                <span className="font-bold text-white drop-shadow">CAM-43-001 <span className="font-normal text-slate-300">Sector 43 - Residential</span></span>
                <span className="bg-[#16A36A] text-white px-1.5 py-0.2 rounded font-semibold text-[9px]">Live</span>
              </div>
              <canvas ref={canvasRefs[3]} width={220} height={135} className="w-full h-full object-cover" />
              <button className="absolute bottom-1.5 right-1.5 p-1 bg-black/40 hover:bg-black/70 text-white rounded transition">
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Col 3: Recent Alerts (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col h-[410px]">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-sm font-bold text-[#172F50]">
              Recent Alerts
            </h2>
            <button 
              onClick={() => setActiveTab('alerts-events')}
              className="text-xs font-semibold text-[#2463A6] hover:underline"
            >
              View All
            </button>
          </div>

          {/* Alert Cards Stack */}
          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
            {/* Alert 1: Unattended Object */}
            <div 
              onClick={() => setActiveTab('alerts-events')}
              className="p-2.5 rounded-lg border border-[#FEE2E2] bg-[#FFF8F8] hover:bg-[#FEECEC] transition cursor-pointer flex items-center space-x-2.5"
            >
              <div className="w-10 h-10 rounded bg-slate-800 shrink-0 overflow-hidden relative flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-slate-600"></div>
                <div className="w-2.5 h-3 bg-slate-400 absolute bottom-1"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E34D59] shrink-0" />
                  <span className="text-xs font-bold text-[#172F50] truncate">Unattended Object</span>
                </div>
                <div className="text-[10px] text-[#526477] mt-0.5">
                  CAM-22-003 • Sector 22
                </div>
                <div className="text-[9px] text-[#8291A2]">
                  Today, 14:28:15
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#E34D59]/40 text-[#E34D59] bg-white">
                High
              </span>
            </div>

            {/* Alert 2: Watchlist Vehicle (ANPR) */}
            <div 
              onClick={() => setActiveTab('vehicle-intelligence')}
              className="p-2.5 rounded-lg border border-[#FEF3C7] bg-[#FFFDF5] hover:bg-[#FEF9C3] transition cursor-pointer flex items-center space-x-2.5"
            >
              <div className="w-10 h-10 rounded bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center text-white">
                <Car className="w-5 h-5 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E34D59] shrink-0" />
                  <span className="text-xs font-bold text-[#172F50] truncate">Watchlist Vehicle (ANPR)</span>
                </div>
                <div className="text-[10px] text-[#526477] mt-0.5">
                  CAM-17-001 • Sector 17
                </div>
                <div className="text-[9px] text-[#8291A2]">
                  Today, 14:25:40
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#E5A12B]/40 text-[#E5A12B] bg-white">
                Medium
              </span>
            </div>

            {/* Alert 3: Suspicious Movement */}
            <div 
              onClick={() => setActiveTab('alerts-events')}
              className="p-2.5 rounded-lg border border-[#FEF3C7] bg-[#FFFDF5] hover:bg-[#FEF9C3] transition cursor-pointer flex items-center space-x-2.5"
            >
              <div className="w-10 h-10 rounded bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                <Eye className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E5A12B] shrink-0" />
                  <span className="text-xs font-bold text-[#172F50] truncate">Suspicious Movement</span>
                </div>
                <div className="text-[10px] text-[#526477] mt-0.5">
                  CAM-35-002 • Sector 35
                </div>
                <div className="text-[9px] text-[#8291A2]">
                  Today, 14:20:12
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#E5A12B]/40 text-[#E5A12B] bg-white">
                Medium
              </span>
            </div>

            {/* Alert 4: Camera Offline */}
            <div 
              onClick={() => setActiveTab('camera-management')}
              className="p-2.5 rounded-lg border border-[#E1EAF2] bg-[#F8FAFC] hover:bg-[#F1F5F9] transition cursor-pointer flex items-center space-x-2.5"
            >
              <div className="w-10 h-10 rounded bg-slate-200 shrink-0 flex items-center justify-center text-[#8795A5]">
                <Video className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <Video className="w-3.5 h-3.5 text-[#8795A5] shrink-0" />
                  <span className="text-xs font-bold text-[#172F50] truncate">Camera Offline</span>
                </div>
                <div className="text-[10px] text-[#526477] mt-0.5">
                  CAM-08-001 • Sector 8
                </div>
                <div className="text-[9px] text-[#8291A2]">
                  Today, 13:45:00
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#16A36A]/40 text-[#16A36A] bg-white">
                Low
              </span>
            </div>

            {/* Alert 5: Vehicle in Restricted Zone */}
            <div 
              onClick={() => setActiveTab('alerts-events')}
              className="p-2.5 rounded-lg border border-[#FEF3C7] bg-[#FFFDF5] hover:bg-[#FEF9C3] transition cursor-pointer flex items-center space-x-2.5"
            >
              <div className="w-10 h-10 rounded bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center text-white">
                <Car className="w-5 h-5 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E34D59] shrink-0" />
                  <span className="text-xs font-bold text-[#172F50] truncate">Vehicle in Restricted Zone</span>
                </div>
                <div className="text-[10px] text-[#526477] mt-0.5">
                  CAM-43-001 • Sector 43
                </div>
                <div className="text-[9px] text-[#8291A2]">
                  Today, 13:32:10
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#E5A12B]/40 text-[#E5A12B] bg-white">
                Medium
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM ROW (3 PANELS: INCIDENT RECONSTRUCTION | VEHICLE ANPR | PREDICTIVE ANALYTICS)
      ========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Panel 1: Incident Reconstruction (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#172F50] leading-none">
                    Incident Reconstruction
                  </h2>
                  <p className="text-[10px] text-[#8291A2] mt-0.5">
                    Synchronized multi-camera analysis and timeline
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('investigation')}
                className="px-2.5 py-1 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                New Investigation
              </button>
            </div>

            {/* Time Selector Controls */}
            <div className="flex items-center space-x-2 text-[11px] mb-3">
              <div className="bg-[#F4F8FC] border border-[#E1EAF2] rounded px-2 py-1 text-[#172F50] font-mono">
                2026-05-18 10:15:00
              </div>
              <span className="text-[#8291A2]">→</span>
              <div className="bg-[#F4F8FC] border border-[#E1EAF2] rounded px-2 py-1 text-[#172F50] font-mono">
                2026-05-18 10:45:00
              </div>
              <select className="bg-[#F4F8FC] border border-[#E1EAF2] rounded px-2 py-1 text-[#172F50]">
                <option>30 min</option>
                <option>1 hour</option>
                <option>2 hours</option>
              </select>
            </div>

            {/* 6-Track Synchronized Timeline Scrubber */}
            <div 
              className="relative bg-[#F8FAFC] border border-[#E1EAF2] rounded-lg p-2.5 select-none cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(10, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
                setScrubberPosition(pos);
              }}
            >
              {/* Timeline Header Minutes */}
              <div className="flex justify-between text-[9px] font-mono text-[#8291A2] mb-1.5 border-b border-[#E1EAF2] pb-0.5">
                <span>10:15</span>
                <span>10:20</span>
                <span>10:25</span>
                <span>10:30</span>
                <span>10:35</span>
                <span>10:40</span>
                <span>10:45</span>
              </div>

              {/* Red Vertical Playhead Scrubber */}
              <div 
                style={{ left: `${scrubberPosition}%` }}
                className="absolute top-0 bottom-0 w-[2px] bg-[#E34D59] z-20 pointer-events-none transition-all duration-75"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#E34D59] -ml-[4px] -mt-1 shadow-sm"></div>
              </div>

              {/* Track 1: Video Clips (CAM-1,2,3,4) Thumbnails */}
              <div className="flex items-center space-x-2 py-1 text-[10px]">
                <span className="w-28 truncate text-[#526477] font-medium">Video Clips (CAM-1..4)</span>
                <div className="flex-1 flex space-x-1 h-6">
                  <div className="flex-1 bg-slate-700 rounded border border-slate-600"></div>
                  <div className="flex-1 bg-slate-800 rounded border border-slate-600"></div>
                  <div className="flex-1 bg-slate-700 rounded border border-slate-600"></div>
                  <div className="flex-1 bg-slate-800 rounded border border-slate-600"></div>
                  <div className="flex-1 bg-slate-700 rounded border border-slate-600"></div>
                  <div className="flex-1 bg-slate-800 rounded border border-slate-600"></div>
                </div>
              </div>

              {/* Track 2: Person Detection */}
              <div className="flex items-center space-x-2 py-1 text-[10px]">
                <span className="w-28 truncate text-[#526477] font-medium">Person Detection</span>
                <div className="flex-1 relative h-4 bg-slate-100 rounded">
                  <span className="absolute left-[15%] w-[12%] h-full bg-[#2463A6] rounded"></span>
                  <span className="absolute left-[40%] w-[25%] h-full bg-[#2463A6] rounded"></span>
                  <span className="absolute left-[75%] w-[15%] h-full bg-[#2463A6] rounded"></span>
                </div>
              </div>

              {/* Track 3: Vehicle (ANPR) */}
              <div className="flex items-center space-x-2 py-1 text-[10px]">
                <span className="w-28 truncate text-[#526477] font-medium">Vehicle (ANPR)</span>
                <div className="flex-1 relative h-4 bg-slate-100 rounded">
                  <span className="absolute left-[20%] w-[8%] h-full bg-[#16A36A] rounded"></span>
                  <span className="absolute left-[45%] w-[18%] h-full bg-[#16A36A] rounded"></span>
                  <span className="absolute left-[80%] w-[12%] h-full bg-[#16A36A] rounded"></span>
                </div>
              </div>

              {/* Track 4: Suspicious Events */}
              <div className="flex items-center space-x-2 py-1 text-[10px]">
                <span className="w-28 truncate text-[#526477] font-medium">Suspicious Events</span>
                <div className="flex-1 relative h-4 bg-slate-100 rounded flex items-center">
                  <span className="absolute left-[28%] text-[#E34D59] font-bold text-xs">▲</span>
                  <span className="absolute left-[48%] text-[#E34D59] font-bold text-xs">▲</span>
                  <span className="absolute left-[82%] text-[#E34D59] font-bold text-xs">▲</span>
                </div>
              </div>

              {/* Track 5: Alarm Logs */}
              <div className="flex items-center space-x-2 py-1 text-[10px]">
                <span className="w-28 truncate text-[#526477] font-medium">Alarm Logs</span>
                <div className="flex-1 relative h-4 bg-slate-100 rounded flex items-center">
                  <span className="absolute left-[32%] text-[#E5A12B] text-xs">🔔</span>
                  <span className="absolute left-[78%] text-[#E5A12B] text-xs">🔔</span>
                </div>
              </div>

              {/* Track 6: Dispatch Records */}
              <div className="flex items-center space-x-2 py-1 text-[10px]">
                <span className="w-28 truncate text-[#526477] font-medium">Dispatch Records</span>
                <div className="flex-1 relative h-4 bg-slate-100 rounded flex items-center">
                  <span className="absolute left-[52%] px-1 text-[8px] bg-[#7E3AF2] text-white rounded font-bold">102</span>
                  <span className="absolute left-[85%] px-1 text-[8px] bg-[#7E3AF2] text-white rounded font-bold">112</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Incident Snapshot Preview */}
          <div className="mt-3 p-2.5 rounded-lg border border-[#E1EAF2] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-12 h-10 rounded bg-slate-800 overflow-hidden flex items-center justify-center text-slate-400">
                <Camera className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">
                  Suspicious Person Waiting
                </div>
                <div className="text-[10px] text-[#526477]">
                  CAM-22-003 • Sector 22 Market <span className="text-[#E34D59] font-bold ml-1">High</span>
                </div>
                <div className="text-[9px] text-[#8291A2]">
                  2026-05-18 10:28:15
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button 
                onClick={() => setActiveTab('incident-reconstruction')}
                className="px-2.5 py-1 rounded border border-[#2463A6] text-[#2463A6] hover:bg-[#DCEBFA] text-xs font-semibold flex items-center space-x-1 transition"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play Video</span>
              </button>
              <button 
                onClick={() => setActiveTab('investigation')}
                className="px-2.5 py-1 rounded bg-white border border-[#CBDCEE] hover:bg-[#F4F8FC] text-[#526477] text-xs font-semibold transition"
              >
                View Details
              </button>
            </div>
          </div>
        </div>

        {/* Panel 2: Vehicle Intelligence (ANPR) (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#172F50] leading-none">
                    Vehicle Intelligence (ANPR)
                  </h2>
                  <p className="text-[10px] text-[#8291A2] mt-0.5">
                    Real-time number plate detection and search
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E1EAF2] mb-3 text-xs">
              <button
                onClick={() => setActiveVehicleTab('LIVE')}
                className={`pb-1.5 px-3 font-semibold transition ${
                  activeVehicleTab === 'LIVE'
                    ? 'border-b-2 border-[#2463A6] text-[#2463A6]'
                    : 'text-[#8291A2] hover:text-[#172F50]'
                }`}
              >
                Live Monitoring
              </button>
              <button
                onClick={() => setActiveVehicleTab('SEARCH')}
                className={`pb-1.5 px-3 font-semibold transition ${
                  activeVehicleTab === 'SEARCH'
                    ? 'border-b-2 border-[#2463A6] text-[#2463A6]'
                    : 'text-[#8291A2] hover:text-[#172F50]'
                }`}
              >
                Search Number Plate
              </button>
            </div>

            {/* Vehicle Detection Card */}
            <div className="p-2.5 rounded-lg border border-[#E1EAF2] bg-[#F8FAFC] flex items-center space-x-3 mb-3">
              {/* White SUV Car Render */}
              <div className="w-28 h-20 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                <Car className="w-12 h-12 text-slate-100" />
                <div className="absolute bottom-1 bg-black/60 text-[8px] text-white px-1 rounded font-mono">
                  ANPR CROP
                </div>
              </div>

              {/* ANPR Details */}
              <div className="flex-1 min-w-0">
                {/* Tactical Indian Plate Box */}
                <div className="anpr-plate-box px-2 py-0.5 text-xs text-[#172F50] mb-1">
                  <span>CH01AB1234</span>
                </div>

                <div className="text-[11px] space-y-0.5 text-[#526477]">
                  <div><span className="text-[#8291A2]">Detected Number Plate:</span> <strong className="text-[#172F50]">CH01AB1234</strong></div>
                  <div><span className="text-[#8291A2]">Confidence:</span> <strong className="text-[#16A36A]">96.3%</strong></div>
                  <div><span className="text-[#8291A2]">Vehicle Type:</span> <span>Car (SUV)</span></div>
                  <div><span className="text-[#8291A2]">Camera:</span> <span>CAM-17-001</span></div>
                  <div><span className="text-[#8291A2]">Location:</span> <span>Sector 17 - Plaza</span></div>
                  <div><span className="text-[#8291A2]">Time:</span> <span>2026-05-18 14:25:40</span></div>
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <button 
                    onClick={() => setActiveTab('vehicle-intelligence')}
                    className="px-2.5 py-1 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-[11px] font-semibold rounded shadow-sm transition"
                  >
                    Check Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('incident-reconstruction')}
                    className="px-2.5 py-1 bg-white border border-[#CBDCEE] hover:bg-[#F4F8FC] text-[#526477] text-[11px] font-semibold rounded transition"
                  >
                    View in Timeline
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Detections Mini Table */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#172F50] mb-1">
              <span>Recent Detections</span>
              <button 
                onClick={() => setActiveTab('vehicle-intelligence')}
                className="text-[11px] font-semibold text-[#2463A6] hover:underline"
              >
                View All
              </button>
            </div>
            <div className="border border-[#E1EAF2] rounded-lg overflow-hidden text-[10px]">
              <table className="w-full text-left">
                <thead className="bg-[#EDF4FC] text-[#526477] font-semibold border-b border-[#E1EAF2]">
                  <tr>
                    <th className="py-1 px-2">Number Plate</th>
                    <th className="py-1 px-2">Time</th>
                    <th className="py-1 px-2">Camera</th>
                    <th className="py-1 px-2">Vehicle Type</th>
                    <th className="py-1 px-2 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1EAF2] text-[#172F50]">
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1 px-2 font-mono font-bold">CH01AB1234</td>
                    <td className="py-1 px-2 text-[#8291A2]">14:25:40</td>
                    <td className="py-1 px-2">CAM-17-001</td>
                    <td className="py-1 px-2">Car</td>
                    <td className="py-1 px-2 text-right font-semibold text-[#16A36A]">96.3%</td>
                  </tr>
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1 px-2 font-mono font-bold">CH01CD5678</td>
                    <td className="py-1 px-2 text-[#8291A2]">14:22:18</td>
                    <td className="py-1 px-2">CAM-22-003</td>
                    <td className="py-1 px-2">SUV</td>
                    <td className="py-1 px-2 text-right font-semibold text-[#16A36A]">94.1%</td>
                  </tr>
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1 px-2 font-mono font-bold">PB65EF9012</td>
                    <td className="py-1 px-2 text-[#8291A2]">14:20:55</td>
                    <td className="py-1 px-2">CAM-35-002</td>
                    <td className="py-1 px-2">Bike</td>
                    <td className="py-1 px-2 text-right font-semibold text-[#16A36A]">91.7%</td>
                  </tr>
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1 px-2 font-mono font-bold">CH01GH3456</td>
                    <td className="py-1 px-2 text-[#8291A2]">14:18:30</td>
                    <td className="py-1 px-2">CAM-43-001</td>
                    <td className="py-1 px-2">Car</td>
                    <td className="py-1 px-2 text-right font-semibold text-[#16A36A]">95.2%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel 3: Predictive Analytics (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#172F50] leading-none">
                    Predictive Analytics
                  </h2>
                  <p className="text-[10px] text-[#8291A2] mt-0.5">
                    AI-based incident risk forecasting
                  </p>
                </div>
              </div>

              <select className="text-[11px] font-medium bg-[#F4F8FC] border border-[#E1EAF2] rounded px-2 py-0.5 text-[#172F50]">
                <option>Next 24 Hours</option>
                <option>Next 48 Hours</option>
                <option>Next 7 Days</option>
              </select>
            </div>

            {/* Geographical Risk Heatmap Graphic */}
            <div className="relative rounded-lg overflow-hidden border border-[#CBDCEE] bg-[#EBF3FA] p-2 mb-3">
              {/* SVG Contour Heatmap Map Illustration */}
              <svg viewBox="0 0 300 160" className="w-full h-32 rounded">
                <defs>
                  <radialGradient id="heat17" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#E34D59" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#E5A12B" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#16A36A" stopOpacity="0.05" />
                  </radialGradient>
                  <radialGradient id="heat22" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#E5A12B" stopOpacity="0.8" />
                    <stop offset="60%" stopColor="#16A36A" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#16A36A" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Base Greenish Safe Zone */}
                <rect x="0" y="0" width="300" height="160" fill="#E2F0D9" />

                {/* Lake Sukhna */}
                <path d="M 220 15 Q 260 20 280 40 Q 290 60 260 70 Q 230 65 220 40 Z" fill="#99C0F0" opacity="0.8" />
                <text x="235" y="45" fontSize="8" fill="#172F50" fontWeight="600">Sukhna Lake</text>

                {/* Risk Heat Contours */}
                <circle cx="150" cy="80" r="55" fill="url(#heat17)" />
                <circle cx="215" cy="95" r="40" fill="url(#heat22)" />
                <circle cx="95" cy="115" r="35" fill="url(#heat22)" opacity="0.6" />

                {/* Sector Labels */}
                <g fontSize="9" fontWeight="700" fill="#172F50">
                  <rect x="130" y="70" width="46" height="15" rx="3" fill="#FFFFFF" opacity="0.85" />
                  <text x="134" y="81">Sector 17</text>

                  <rect x="200" y="85" width="46" height="15" rx="3" fill="#FFFFFF" opacity="0.85" />
                  <text x="204" y="96">Sector 22</text>

                  <rect x="75" y="105" width="46" height="15" rx="3" fill="#FFFFFF" opacity="0.85" />
                  <text x="79" y="116">Sector 35</text>

                  <rect x="160" y="115" width="46" height="15" rx="3" fill="#FFFFFF" opacity="0.85" />
                  <text x="164" y="126">Sector 43</text>
                </g>
              </svg>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-between text-[9px] font-medium text-[#526477] mt-1 pt-1 border-t border-[#CBDCEE]">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#16A36A]"></span>
                  <span>Low Risk</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#E5A12B]"></span>
                  <span>Medium Risk</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#FA7035]"></span>
                  <span>High Risk</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#E34D59]"></span>
                  <span>Very High</span>
                </div>
              </div>
            </div>
          </div>

          {/* High Risk Areas Table */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#172F50] mb-1">
              <span>High Risk Areas (Next 24 Hours)</span>
              <button 
                onClick={() => setActiveTab('analytics')}
                className="text-[11px] font-semibold text-[#2463A6] hover:underline"
              >
                View All
              </button>
            </div>
            <div className="border border-[#E1EAF2] rounded-lg overflow-hidden text-[10px]">
              <table className="w-full text-left">
                <thead className="bg-[#EDF4FC] text-[#526477] font-semibold border-b border-[#E1EAF2]">
                  <tr>
                    <th className="py-1 px-2">Area</th>
                    <th className="py-1 px-2">Predicted Risk</th>
                    <th className="py-1 px-2">Key Factors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1EAF2] text-[#172F50]">
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1.5 px-2 font-medium">Sector 17</td>
                    <td className="py-1.5 px-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#E34D59] font-bold">High</span>
                    </td>
                    <td className="py-1.5 px-2 text-[#526477]">Historical pattern, high footfall</td>
                  </tr>
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1.5 px-2 font-medium">Sector 22</td>
                    <td className="py-1.5 px-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#E5A12B] font-bold">Medium</span>
                    </td>
                    <td className="py-1.5 px-2 text-[#526477]">Recent vehicle incidents</td>
                  </tr>
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1.5 px-2 font-medium">Sector 35</td>
                    <td className="py-1.5 px-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#E5A12B] font-bold">Medium</span>
                    </td>
                    <td className="py-1.5 px-2 text-[#526477]">Evening activity, past trend</td>
                  </tr>
                  <tr className="hover:bg-[#F4F8FC]">
                    <td className="py-1.5 px-2 font-medium">Sector 43</td>
                    <td className="py-1.5 px-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#E8F8F0] text-[#16A36A] font-bold">Low</span>
                    </td>
                    <td className="py-1.5 px-2 text-[#526477]">Lower historical activity</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

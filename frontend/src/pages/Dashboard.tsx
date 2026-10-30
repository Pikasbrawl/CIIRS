import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Wifi, AlertTriangle, Video, Briefcase, Car, 
  MapPin, Maximize2, Crosshair, ChevronRight, Play, Eye, 
  Search, ExternalLink, Shield, Check, Clock, TrendingUp,
  Compass, Siren, Layers, Radio, ShieldAlert, X, RefreshCw
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
  const [gisData, setGisData] = useState<any>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-17-001');
  const [cameraFilter, setCameraFilter] = useState<string>('ALL');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [mapViewType, setMapViewType] = useState<string>('STANDARD');
  const [activeVehicleTab, setActiveVehicleTab] = useState<'LIVE' | 'SEARCH'>('LIVE');
  const [searchPlateInput, setSearchPlateInput] = useState<string>('');
  const [scrubberPosition, setScrubberPosition] = useState<number>(45); // percentage along timeline
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState<boolean>(false);
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [isSearchingMap, setIsSearchingMap] = useState<boolean>(false);
  const [showMapSearchBox, setShowMapSearchBox] = useState<boolean>(false);
  const [mapSearchError, setMapSearchError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  // Canvas animations for the 4 live feeds
  const canvasRefs = [
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null)
  ];

  // Fetch initial telemetry & GIS layers
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [kpiRes, camRes, alertRes, vehRes, gisRes] = await Promise.all([
          api.getDashboardKPI().catch(() => null),
          api.getCameras().catch(() => []),
          api.getAlerts(10).catch(() => []),
          api.getRecentVehicles(5).catch(() => []),
          api.getGISLayers().catch(() => null)
        ]);

        if (kpiRes) setKpiData(kpiRes);
        if (camRes && camRes.length > 0) setCameras(camRes);
        if (alertRes && alertRes.length > 0) setAlerts(alertRes);
        if (vehRes && vehRes.length > 0) setVehicles(vehRes);
        if (gisRes) setGisData(gisRes);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet Map with OpenStreetMap Standard Street Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Chandigarh: 30.7333, 76.7794
    const map = L.map(mapContainerRef.current, {
      center: [30.7333, 76.7794],
      zoom: 12.5,
      zoomControl: true,
      attributionControl: true
    });

    // Real OpenStreetMap Standard Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Helper for strict coordinate validation
  const isValidCoord = (lat: any, lon: any) => {
    return typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon) && lat > 30.4 && lat < 31.1 && lon > 76.4 && lon < 77.2;
  };

  // Update map markers when gisData, cameras, or activityFilter change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const group = markersGroupRef.current;
    group.clearLayers();

    const data = gisData || { cameras, incidents: [], alerts, reports: [], units: [] };

    // 1. CCTV Cameras
    if (activityFilter === 'ALL' || activityFilter === 'CAMERAS' || activityFilter === 'CONNECTED' || activityFilter === 'OFFLINE') {
      const camsToRender = (data.cameras || cameras).filter((cam: any) => {
        if (!isValidCoord(cam.latitude, cam.longitude)) return false;
        if (activityFilter === 'CONNECTED') return cam.status === 'ONLINE';
        if (activityFilter === 'OFFLINE') return cam.status === 'OFFLINE';
        return true;
      });

      camsToRender.forEach((cam: any) => {
        let statusKey = 'ONLINE';
        let color = '#16A36A'; // Connected: Green
        if (cam.status === 'OFFLINE') {
          statusKey = 'OFFLINE';
          color = '#8795A5'; // Offline: Grey
        } else if (cam.is_tampered || cam.is_obstructed || cam.trust_score < 70 || cam.status === 'DEGRADED') {
          statusKey = 'ALERT';
          color = '#E5A12B'; // Warning / Degraded: Amber
        }

        const isSelected = cam.camera_id === selectedCameraId;

        const icon = L.divIcon({
          className: 'cctv-situational-marker',
          html: `
            <div style="
              background-color: ${isSelected ? '#2463A6' : '#FFFFFF'}; 
              border: 2px solid ${color}; 
              width: ${isSelected ? 18 : 13}px; 
              height: ${isSelected ? 18 : 13}px; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              <div style="background-color: ${color}; width: ${isSelected ? 8 : 5}px; height: ${isSelected ? 8 : 5}px; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [isSelected ? 18 : 13, isSelected ? 18 : 13],
          iconAnchor: [isSelected ? 9 : 6.5, isSelected ? 9 : 6.5]
        });

        const marker = L.marker([cam.latitude, cam.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; min-width: 175px;">
            <div style="font-weight: 700; color: #172F50; font-size: 12px;">📹 ${cam.camera_id}</div>
            <div style="color: #526477; font-size: 11px; font-weight: 500;">${cam.name}</div>
            <div style="color: #8291A2; font-size: 10px; margin-top: 1px;">${cam.address || cam.area_zone || 'Chandigarh City'}</div>
            <div style="font-family: monospace; font-size: 9px; color: #526477; margin-top: 2px;">
              ${cam.latitude.toFixed(5)}° N, ${cam.longitude.toFixed(5)}° E
            </div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #E1EAF2; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 10px; font-weight: 700; color: ${color};">${cam.status || statusKey}</span>
              <span style="font-size: 10px; color: #526477;">Trust: <b>${cam.trust_score || 98}%</b></span>
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedCameraId(cam.camera_id);
        });

        marker.addTo(group);
      });
    }

    // 2. AI Warnings (Predicted Early Warning Signals)
    if (activityFilter === 'ALL' || activityFilter === 'WARNINGS') {
      const alertsToRender = (data.alerts || []).filter((a: any) => isValidCoord(a.latitude, a.longitude));
      alertsToRender.forEach((alt: any) => {
        const icon = L.divIcon({
          className: 'warning-marker',
          html: `
            <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="background-color: #D97706; color: white; width: 17px; height: 17px; border-radius: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.35); border: 1.5px solid white;">
                <span style="font-size: 9px; font-weight: 900;">▲</span>
              </div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([alt.latitude, alt.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; min-width: 185px;">
            <div style="font-size: 9px; font-weight: 800; color: #D97706; text-transform: uppercase;">⚠️ AI Early Warning (Predicted)</div>
            <div style="font-weight: 700; color: #172F50; font-size: 12px; margin-top: 1px;">${alt.title || alt.alert_type}</div>
            <div style="color: #526477; font-size: 10px;">${alt.location || alt.camera_name || 'Surveillance Node'}</div>
            <div style="font-family: monospace; font-size: 9px; color: #8291A2; margin-top: 2px;">
              ${alt.latitude.toFixed(5)}° N, ${alt.longitude.toFixed(5)}° E
            </div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #E1EAF2; font-size: 9px; color: #8291A2;">
              Confidence: <b>${alt.confidence || '94.2%'}</b> • Requires verification
            </div>
          </div>
        `);
        marker.addTo(group);
      });
    }

    // 3. Verified Incidents
    if (activityFilter === 'ALL' || activityFilter === 'INCIDENTS') {
      const incToRender = (data.incidents || []).filter((inc: any) => isValidCoord(inc.latitude, inc.longitude));
      incToRender.forEach((inc: any) => {
        const isCritical = inc.severity === 'CRITICAL' || inc.severity === 'HIGH';
        const color = isCritical ? '#E34D59' : '#E5A12B';

        const icon = L.divIcon({
          className: 'incident-marker',
          html: `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 1.5s infinite;"></div>
              <div style="position: relative; background-color: ${color}; color: #ffffff; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 2px solid white;">
                <span style="font-size: 10px; font-weight: 900;">!</span>
              </div>
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([inc.latitude, inc.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; min-width: 185px;">
            <div style="font-size: 9px; font-weight: 800; color: ${color}; text-transform: uppercase;">🚨 Verified Incident: ${inc.incident_number}</div>
            <div style="font-weight: 700; color: #172F50; font-size: 12px; margin-top: 1px;">${inc.category}</div>
            <div style="color: #526477; font-size: 10px;">${inc.address || 'Chandigarh Incident Area'}</div>
            <div style="font-family: monospace; font-size: 9px; color: #8291A2; margin-top: 2px;">
              ${inc.latitude.toFixed(5)}° N, ${inc.longitude.toFixed(5)}° E
            </div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #E1EAF2; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 10px; font-weight: 700; color: ${color};">${inc.severity} SEVERITY</span>
              <span style="font-size: 9px; color: #16A36A; font-weight: 600;">Human Verified</span>
            </div>
          </div>
        `);
        marker.addTo(group);
      });
    }

    // 4. Public Reports (Unverified Citizen Reports)
    if (activityFilter === 'ALL' || activityFilter === 'REPORTS') {
      const repToRender = (data.reports || []).filter((r: any) => isValidCoord(r.latitude, r.longitude));
      repToRender.forEach((rep: any) => {
        const icon = L.divIcon({
          className: 'report-marker',
          html: `
            <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="background-color: #EA580C; color: white; width: 17px; height: 17px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1.5px solid white;">
                <span style="font-size: 9px; font-weight: 800;">i</span>
              </div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; min-width: 180px;">
            <div style="font-size: 9px; font-weight: 800; color: #EA580C; text-transform: uppercase;">📢 Unverified Citizen Report</div>
            <div style="font-weight: 700; color: #172F50; font-size: 12px; margin-top: 1px;">${rep.report_code}: ${rep.category}</div>
            <div style="color: #526477; font-size: 10px;">${rep.address || rep.description || 'Public Report Location'}</div>
            <div style="font-family: monospace; font-size: 9px; color: #8291A2; margin-top: 2px;">
              ${rep.latitude.toFixed(5)}° N, ${rep.longitude.toFixed(5)}° E
            </div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #E1EAF2; font-size: 9px; color: #EA580C;">
              Status: <b>${rep.status || 'Pending Review'}</b>
            </div>
          </div>
        `);
        marker.addTo(group);
      });
    }

    // 5. Emergency Response Units (Simulated)
    if (activityFilter === 'ALL' || activityFilter === 'UNITS') {
      const unitsToRender = (data.units || data.responders || []).filter((u: any) => isValidCoord(u.latitude, u.longitude));
      unitsToRender.forEach((u: any) => {
        const icon = L.divIcon({
          className: 'unit-marker',
          html: `
            <div style="background-color: #2563EB; color: white; padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; border: 1.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
              <span>🚓</span>
              <span>${u.unit_callsign || 'UNIT'}</span>
            </div>
          `,
          iconSize: [60, 18],
          iconAnchor: [30, 9]
        });

        const marker = L.marker([u.latitude, u.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; min-width: 180px;">
            <div style="font-size: 9px; font-weight: 800; color: #2563EB; text-transform: uppercase;">🚓 Emergency Unit (Simulation)</div>
            <div style="font-weight: 700; color: #172F50; font-size: 12px; margin-top: 1px;">${u.unit_callsign} • ${u.agency_type || 'Police'}</div>
            <div style="color: #526477; font-size: 10px;">Status: <b>${u.status}</b> • ${u.speed_kmh || 35} km/h</div>
            <div style="font-family: monospace; font-size: 9px; color: #8291A2; margin-top: 2px;">
              ${u.latitude.toFixed(5)}° N, ${u.longitude.toFixed(5)}° E
            </div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #E1EAF2; font-size: 9px; color: #2563EB; font-weight: 600;">
              SIMULATED UNIT TELEMETRY
            </div>
          </div>
        `);
        marker.addTo(group);
      });
    }
  }, [gisData, cameras, alerts, activityFilter, selectedCameraId]);

  // Reset to Chandigarh Center
  const handleResetToChandigarh = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([30.7333, 76.7794], 12.5, { duration: 0.8 });
    }
  };

  // Location Search Handler for Dashboard Map
  const handleDashboardMapSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mapSearchQuery.trim()) return;

    setIsSearchingMap(true);
    setMapSearchError(null);

    const q = mapSearchQuery.trim().toLowerCase();
    const landmarks: { [key: string]: [number, number] } = {
      'sector 17': [30.740065, 76.782589],
      'sector 22': [30.729000, 76.772500],
      'sector 35': [30.721000, 76.762000],
      'sector 43': [30.718000, 76.746000],
      'sukhna lake': [30.741978, 76.817675],
      'rock garden': [30.753196, 76.806630],
      'panjab university': [30.760000, 76.768000],
      'capitol complex': [30.758900, 76.805500],
      'elante mall': [30.705500, 76.801300],
      'isbt 17': [30.742200, 76.776600],
      'isbt 43': [30.717600, 76.745400]
    };

    let targetCoords: [number, number] | null = null;
    for (const [key, coords] of Object.entries(landmarks)) {
      if (q.includes(key) || key.includes(q)) {
        targetCoords = coords;
        break;
      }
    }

    if (targetCoords) {
      applyMapSearchPin(targetCoords[0], targetCoords[1], mapSearchQuery);
      setIsSearchingMap(false);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery + ', Chandigarh')}&limit=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (data && data.length > 0) {
        applyMapSearchPin(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
      } else {
        setMapSearchError('Location not found in Chandigarh.');
      }
    } catch {
      setMapSearchError('Search failed.');
    } finally {
      setIsSearchingMap(false);
    }
  };

  const applyMapSearchPin = (lat: number, lon: number, label: string) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([lat, lon], 15, { duration: 0.8 });

    if (searchMarkerRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
    }

    const pinIcon = L.divIcon({
      className: 'dashboard-search-pin',
      html: `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
          <div style="background-color: #2463A6; border: 2px solid white; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([lat, lon], { icon: pinIcon })
      .bindPopup(`<b style="font-size: 11px; color: #172F50;">${label}</b>`)
      .addTo(mapInstanceRef.current)
      .openPopup();
    searchMarkerRef.current = marker;
  };

  // Real Browser GPS "Locate Me"
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation([latitude, longitude]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 0.8 });
          
          const gpsIcon = L.divIcon({
            className: 'gps-marker',
            html: `
              <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: #2563EB; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="width: 14px; height: 14px; border-radius: 50%; background: #1D4ED8; border: 2.5px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          L.marker([latitude, longitude], { icon: gpsIcon })
            .bindPopup(`<b style="color: #172F50; font-size: 12px;">Your Live Location</b><br/><span style="font-size: 10px; color: #64748B;">Accuracy: ±${Math.round(accuracy)}m</span>`)
            .addTo(mapInstanceRef.current)
            .openPopup();
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([30.7398, 76.7827], 13);
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
        {/* Col 1: Chandigarh Situational Awareness Map (5 cols) */}
        <div className={`lg:col-span-5 bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm flex flex-col ${
          isMapFullscreen ? 'fixed inset-4 z-50 rounded-xl shadow-2xl h-[calc(100vh-32px)]' : 'h-[440px]'
        }`}>
          {/* Header Row: Title, Filters & Controls */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#2463A6]" />
              <div>
                <h2 className="text-sm font-bold text-[#172F50] leading-tight">
                  Chandigarh Situational Awareness Map
                </h2>
                <p className="text-[10px] text-[#8291A2]">Real-time public safety GIS</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Activity Filter Dropdown */}
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="text-[11px] font-semibold bg-[#F4F8FC] border border-[#E1EAF2] rounded px-2 py-1 text-[#172F50] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Activity</option>
                <option value="CAMERAS">Cameras (100)</option>
                <option value="CONNECTED">Connected Only (86)</option>
                <option value="OFFLINE">Offline Only (9)</option>
                <option value="WARNINGS">AI Warnings ({gisData?.alerts?.length || 22})</option>
                <option value="INCIDENTS">Verified Incidents ({gisData?.incidents?.length || 17})</option>
                <option value="REPORTS">Public Reports ({gisData?.reports?.length || 2})</option>
                <option value="UNITS">Response Units ({gisData?.units?.length || 9})</option>
              </select>

              {/* Toggle Search Input */}
              <button
                onClick={() => setShowMapSearchBox(!showMapSearchBox)}
                title="Search Chandigarh Location"
                className={`p-1 rounded border transition ${
                  showMapSearchBox ? 'bg-[#2463A6] text-white border-[#2463A6]' : 'bg-[#F4F8FC] border-[#E1EAF2] text-[#2463A6] hover:bg-[#DCEBFA]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* Reset to Chandigarh Button */}
              <button
                onClick={handleResetToChandigarh}
                title="Reset to Chandigarh"
                className="p-1 rounded bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>

              {/* Browser GPS Locate Me */}
              <button 
                onClick={handleLocateMe}
                title="Locate Me (Device GPS)"
                className="p-1 rounded bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen Map Toggle */}
              <button 
                onClick={() => {
                  setIsMapFullscreen(!isMapFullscreen);
                  setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
                }}
                title={isMapFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
                className="p-1 rounded bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Open in City Map Page */}
              <button
                onClick={() => setActiveTab('gis-map')}
                title="Open Dedicated City Map Page"
                className="p-1 rounded bg-[#EBF3FC] border border-[#DCEBFA] hover:bg-[#D0E4FA] text-[#2463A6] transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Box Drawer (if toggled) */}
          {showMapSearchBox && (
            <div className="mb-2 shrink-0">
              <form onSubmit={handleDashboardMapSearch} className="flex items-center space-x-1.5">
                <div className="relative flex-1">
                  <Search className="w-3 h-3 text-[#8291A2] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    placeholder="Search Sector 17, 22, 35, Sukhna Lake, PU..."
                    className="w-full pl-7 pr-6 py-1 text-[11px] bg-[#F4F8FC] border border-[#E1EAF2] rounded text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:border-[#2463A6]"
                  />
                  {mapSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setMapSearchQuery('');
                        if (searchMarkerRef.current && mapInstanceRef.current) {
                          mapInstanceRef.current.removeLayer(searchMarkerRef.current);
                          searchMarkerRef.current = null;
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8291A2] hover:text-[#172F50]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearchingMap}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#2463A6] hover:bg-[#1E528B] text-white rounded transition"
                >
                  {isSearchingMap ? '...' : 'Find'}
                </button>
              </form>
              {mapSearchError && (
                <div className="text-[10px] text-[#E34D59] mt-1">{mapSearchError}</div>
              )}
            </div>
          )}

          {/* Compact Live Status Strip */}
          <div className="flex items-center space-x-1.5 mb-2 overflow-x-auto pb-0.5 shrink-0 scrollbar-none text-[10px]">
            <button
              onClick={() => setActivityFilter('CAMERAS')}
              className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap flex items-center space-x-1 ${
                activityFilter === 'CAMERAS' ? 'bg-[#16A36A] text-white border-[#16A36A]' : 'bg-[#F4F8FC] text-[#526477] border-[#E1EAF2] hover:bg-[#EBF3FC]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activityFilter === 'CAMERAS' ? 'bg-white' : 'bg-[#16A36A]'}`}></span>
              <span>100 Cams (86 Online)</span>
            </button>

            <button
              onClick={() => setActivityFilter('WARNINGS')}
              className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap flex items-center space-x-1 ${
                activityFilter === 'WARNINGS' ? 'bg-[#D97706] text-white border-[#D97706]' : 'bg-[#F4F8FC] text-[#526477] border-[#E1EAF2] hover:bg-[#EBF3FC]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activityFilter === 'WARNINGS' ? 'bg-white' : 'bg-[#D97706]'}`}></span>
              <span>{gisData?.alerts?.length || 22} AI Warnings</span>
            </button>

            <button
              onClick={() => setActivityFilter('INCIDENTS')}
              className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap flex items-center space-x-1 ${
                activityFilter === 'INCIDENTS' ? 'bg-[#E34D59] text-white border-[#E34D59]' : 'bg-[#F4F8FC] text-[#526477] border-[#E1EAF2] hover:bg-[#EBF3FC]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activityFilter === 'INCIDENTS' ? 'bg-white' : 'bg-[#E34D59]'}`}></span>
              <span>{gisData?.incidents?.length || 17} Incidents</span>
            </button>

            <button
              onClick={() => setActivityFilter('REPORTS')}
              className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap flex items-center space-x-1 ${
                activityFilter === 'REPORTS' ? 'bg-[#EA580C] text-white border-[#EA580C]' : 'bg-[#F4F8FC] text-[#526477] border-[#E1EAF2] hover:bg-[#EBF3FC]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activityFilter === 'REPORTS' ? 'bg-white' : 'bg-[#EA580C]'}`}></span>
              <span>{gisData?.reports?.length || 2} Reports</span>
            </button>

            <button
              onClick={() => setActivityFilter('UNITS')}
              className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap flex items-center space-x-1 ${
                activityFilter === 'UNITS' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[#F4F8FC] text-[#526477] border-[#E1EAF2] hover:bg-[#EBF3FC]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activityFilter === 'UNITS' ? 'bg-white' : 'bg-[#2563EB]'}`}></span>
              <span>{gisData?.units?.length || 9} Units (Sim)</span>
            </button>
          </div>

          {/* Leaflet Map Frame with Floating Status Legend */}
          <div className="relative flex-1 rounded-lg overflow-hidden border border-[#E1EAF2]">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Legend Top-Left */}
            <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-sm border border-[#E1EAF2] rounded-lg px-2 py-1.5 shadow-md text-[9px] font-medium space-y-1">
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#16A36A]"></span>
                <span>Connected Cam ({gisData?.cameras?.filter((c: any) => c.status === 'ONLINE').length || 86})</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-sm bg-[#D97706] text-white flex items-center justify-center text-[7px] font-bold">▲</span>
                <span>AI Warning ({gisData?.alerts?.length || 22})</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#E34D59] animate-ping"></span>
                <span>Verified Incident ({gisData?.incidents?.length || 17})</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span>
                <span>Public Report ({gisData?.reports?.length || 2})</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded bg-[#2563EB]"></span>
                <span>Unit (9 Sim)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[#526477]">
                <span className="w-2 h-2 rounded-full bg-[#8795A5]"></span>
                <span>Offline (9)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Live Camera Feeds (Selected Cameras) - 2x2 Grid (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col h-[440px]">
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
        <div className="lg:col-span-3 bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col h-[440px]">
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

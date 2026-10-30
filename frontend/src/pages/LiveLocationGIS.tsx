import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Camera, Siren, Shield, Navigation, RefreshCw, Layers, 
  CheckCircle2, AlertTriangle, Crosshair, Search, X, 
  Maximize2, Minimize2, Compass, Play, Pause, Volume2, 
  VolumeX, ExternalLink, Wifi, Eye, Radio, SlidersHorizontal,
  ChevronRight, Info, ShieldCheck, MapPinned, FileVideo
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

// Pre-indexed Chandigarh Key Landmarks for instant search & autocomplete
const CHANDIGARH_LANDMARKS = [
  { name: 'Sector 17 (City Centre / Commercial Plaza)', lat: 30.740065, lon: 76.782589, type: 'Commercial Sector' },
  { name: 'Sector 22 (Shastri Market & Civil Hospital)', lat: 30.729000, lon: 76.772500, type: 'Commercial / Market' },
  { name: 'Sector 35 (Commercial Hub & Hotels)', lat: 30.721000, lon: 76.762000, type: 'Commercial Sector' },
  { name: 'Sector 43 (ISBT Bus Terminal & District Courts)', lat: 30.718000, lon: 76.746000, type: 'Transit / Judicial' },
  { name: 'Sukhna Lake (Promenade & Water Reserve)', lat: 30.741978, lon: 76.817675, type: 'Waterfront Promenade' },
  { name: 'Rock Garden (Nek Chand Sculpture Park)', lat: 30.753196, lon: 76.806630, type: 'Heritage / Tourist' },
  { name: 'Capitol Complex (Secretariat & High Court)', lat: 30.758900, lon: 76.805500, type: 'Administrative Hub' },
  { name: 'Panjab University (Sector 14 Campus)', lat: 30.760000, lon: 76.768000, type: 'University Campus' },
  { name: 'Chandigarh University (Gharuan NH-95, Mohali)', lat: 30.768640, lon: 76.575048, type: 'Higher Education (Regional)' },
  { name: 'Elante Mall (Industrial Area Phase 1)', lat: 30.705500, lon: 76.801300, type: 'Shopping Centre' },
  { name: 'ISBT Sector 17 (Central Bus Stand)', lat: 30.742200, lon: 76.776600, type: 'Transit Hub' },
  { name: 'ISBT Sector 43 (Interstate Bus Terminus)', lat: 30.717600, lon: 76.745400, type: 'Transit Hub' },
  { name: 'PGIMER (Post Graduate Medical Institute)', lat: 30.764500, lon: 76.778800, type: 'Medical Centre' },
  { name: 'Sector 8 (Residential & Outer Market)', lat: 30.748000, lon: 76.793000, type: 'Residential Sector' },
  { name: 'Sector 10 (Museum & Art Gallery)', lat: 30.752000, lon: 76.787000, type: 'Cultural Sector' },
  { name: 'IT Park (Rajiv Gandhi Chandigarh Tech Park)', lat: 30.724500, lon: 76.837500, type: 'Technology Corridor' }
];

// Demo CCTV Feeds Configuration
const DEMO_FEEDS = [
  {
    id: 'CAM-17-001',
    name: 'Sector 17 - Plaza',
    location: 'Sector 17 Central Plaza, Commercial Promenade',
    videoUrl: '/static/demo_cam_17_001.mp4',
    status: 'ONLINE',
    type: 'DEMO FEED',
    fps: 30.0,
    lat: 30.7398,
    lon: 76.7827
  },
  {
    id: 'CAM-22-003',
    name: 'Sector 22 - Market',
    location: 'Sector 22 Shastri Market Pedestrian Walkway',
    videoUrl: '/static/demo_cam_22_003.mp4',
    status: 'ONLINE',
    type: 'DEMO FEED',
    fps: 29.8,
    lat: 30.7290,
    lon: 76.7725
  },
  {
    id: 'CAM-35-002',
    name: 'Sector 35 - Roundabout',
    location: 'Sector 35 Rotary Intersection & Avenue 3',
    videoUrl: '/static/demo_cam_35_002.mp4',
    status: 'ONLINE',
    type: 'DEMO FEED',
    fps: 30.0,
    lat: 30.7210,
    lon: 76.7620
  },
  {
    id: 'CAM-43-001',
    name: 'Sector 43 - Residential',
    location: 'Sector 43 Residential Avenue & ISBT Link',
    videoUrl: '/static/demo_cam_43_001.mp4',
    status: 'ONLINE',
    type: 'DEMO FEED',
    fps: 29.4,
    lat: 30.7180,
    lon: 76.7460
  }
];

export const LiveLocationGIS: React.FC = () => {
  const { setActiveTab } = useApp();

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const cameraLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const reportLayerRef = useRef<L.LayerGroup | null>(null);
  const alertLayerRef = useRef<L.LayerGroup | null>(null);
  const responderLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const clickedPinRef = useRef<L.Marker | null>(null);

  // Watch ID for continuous geolocation
  const watchIdRef = useRef<number | null>(null);

  // Video Ref for Selected Camera
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // State: Data from Backend
  const [layersData, setLayersData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // State: Selected Entity for Side Panel Inspector
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);

  // State: GPS Location Tracking
  const [gpsStatus, setGpsStatus] = useState<
    'IDLE' | 'LOCATING' | 'FOUND' | 'TRACKING_ACTIVE' | 'TRACKING_STOPPED' | 'PERMISSION_DENIED' | 'UNAVAILABLE'
  >('IDLE');
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [followLocation, setFollowLocation] = useState<boolean>(true);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // State: Search & Geocoding
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // State: Clicked Coordinates
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // State: UI Modes & Filters
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showLayersMenu, setShowLayersMenu] = useState<boolean>(false);
  const [showOverlays, setShowOverlays] = useState({
    cameras: true,
    incidents: true,
    reports: true,
    alerts: true,
    responders: false,
    myLocation: true
  });
  const [cameraFilter, setCameraFilter] = useState<'ALL' | 'CONNECTED' | 'ALERT' | 'OFFLINE'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');

  // Default Center: Chandigarh (30.7333, 76.7794)
  const CHANDIGARH_CENTER: [number, number] = [30.7333, 76.7794];
  const DEFAULT_ZOOM = 13;

  // Fetch GIS Layers from Backend API
  const fetchGISLayers = async () => {
    try {
      setLoading(true);
      const data = await api.getGISLayers();
      setLayersData(data);
    } catch (e) {
      console.error('Failed to load GIS layers:', e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Leaflet Map with OpenStreetMap Standard Street Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CHANDIGARH_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true
    });

    // Custom Zoom Control at Bottom Right (Google Maps style)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Standard OpenStreetMap Tile Layer (True GPS Street Map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Layer Groups
    cameraLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);
    reportLayerRef.current = L.layerGroup().addTo(map);
    alertLayerRef.current = L.layerGroup().addTo(map);
    responderLayerRef.current = L.layerGroup().addTo(map);

    // Click Listener: Place a pin on clicked location and inspect coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setClickedLocation({ lat, lng });

      if (clickedPinRef.current) {
        map.removeLayer(clickedPinRef.current);
      }

      const pinIcon = L.divIcon({
        className: 'clicked-location-pin',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="background-color: #172F50; border: 2px solid white; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.4);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      const pin = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      clickedPinRef.current = pin;

      setSelectedEntity({
        type: 'CLICKED_LOCATION',
        latitude: lat,
        longitude: lng,
        address: `Chandigarh Coordinates: ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`
      });
    });

    mapInstanceRef.current = map;
    fetchGISLayers();

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update CCTV Camera Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !cameraLayerRef.current) return;
    const layer = cameraLayerRef.current;
    layer.clearLayers();

    if (!showOverlays.cameras || !layersData?.cameras) return;

    layersData.cameras.forEach((cam: any) => {
      // Status Filter
      if (cameraFilter === 'CONNECTED' && cam.status !== 'ONLINE') return;
      if (cameraFilter === 'ALERT' && cam.status !== 'DEGRADED' && cam.trust_score >= 70) return;
      if (cameraFilter === 'OFFLINE' && cam.status !== 'OFFLINE') return;

      // Sector Filter
      if (sectorFilter !== 'ALL' && !cam.area_zone?.toLowerCase().includes(sectorFilter.toLowerCase())) {
        return;
      }

      // Pin Color
      let color = '#16A36A'; // Connected / Online: Green
      if (cam.status === 'DEGRADED') color = '#E5A12B'; // Warning: Amber
      if (cam.status === 'OFFLINE') color = '#8795A5'; // Offline: Grey
      if (cam.trust_score < 70) color = '#E34D59'; // Critical / Tampered: Red

      const isSelected = selectedEntity?.camera_id === cam.camera_id;

      const camIcon = L.divIcon({
        className: 'cctv-map-marker',
        html: `
          <div style="
            background-color: ${isSelected ? '#2463A6' : '#FFFFFF'}; 
            border: 2px solid ${color}; 
            width: ${isSelected ? 24 : 16}px; 
            height: ${isSelected ? 24 : 16}px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transition: all 0.2s;
            cursor: pointer;
          ">
            <div style="background-color: ${color}; width: ${isSelected ? 10 : 6}px; height: ${isSelected ? 10 : 6}px; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [isSelected ? 24 : 16, isSelected ? 24 : 16],
        iconAnchor: [isSelected ? 12 : 8, isSelected ? 12 : 8]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: camIcon });
      marker.on('click', () => {
        // Find matching demo feed if exists
        const matchedDemo = DEMO_FEEDS.find(d => d.id === cam.camera_id);
        setSelectedEntity({
          ...cam,
          type: 'CAMERA',
          demoVideoUrl: matchedDemo?.videoUrl || (cam.status === 'ONLINE' ? '/static/demo_cam_17_001.mp4' : null)
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([cam.latitude, cam.longitude]);
        }
      });

      marker.addTo(layer);
    });
  }, [layersData?.cameras, cameraFilter, sectorFilter, showOverlays.cameras, selectedEntity]);

  // Update Verified Incidents Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentLayerRef.current) return;
    const layer = incidentLayerRef.current;
    layer.clearLayers();

    if (!showOverlays.incidents || !layersData?.incidents) return;

    layersData.incidents.forEach((inc: any) => {
      const isCritical = inc.severity === 'CRITICAL' || inc.severity === 'HIGH';
      const color = isCritical ? '#E34D59' : '#E5A12B';

      const incIcon = L.divIcon({
        className: 'incident-marker',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 1.5s infinite;"></div>
            <div style="position: relative; background-color: ${color}; color: #ffffff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 2px solid white;">
              <span style="font-size: 11px; font-weight: 900;">!</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: incIcon });
      marker.on('click', () => {
        setSelectedEntity({
          ...inc,
          type: 'INCIDENT'
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([inc.latitude, inc.longitude]);
        }
      });

      marker.addTo(layer);
    });
  }, [layersData?.incidents, showOverlays.incidents]);

  // Update Citizen Reports Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !reportLayerRef.current) return;
    const layer = reportLayerRef.current;
    layer.clearLayers();

    if (!showOverlays.reports || !layersData?.reports) return;

    layersData.reports.forEach((rep: any) => {
      const repIcon = L.divIcon({
        className: 'report-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="background-color: #EA580C; color: white; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid white;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([rep.latitude, rep.longitude], { icon: repIcon });
      marker.on('click', () => {
        setSelectedEntity({
          ...rep,
          type: 'REPORT'
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([rep.latitude, rep.longitude]);
        }
      });

      marker.addTo(layer);
    });
  }, [layersData?.reports, showOverlays.reports]);

  // Update AI Alerts Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !alertLayerRef.current) return;
    const layer = alertLayerRef.current;
    layer.clearLayers();

    if (!showOverlays.alerts || !layersData?.alerts) return;

    layersData.alerts.forEach((alt: any) => {
      const altIcon = L.divIcon({
        className: 'alert-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="background-color: #D97706; color: white; width: 16px; height: 16px; border-radius: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid white;">
              <span style="font-size: 9px; font-weight: 800;">▲</span>
            </div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([alt.latitude, alt.longitude], { icon: altIcon });
      marker.on('click', () => {
        setSelectedEntity({
          ...alt,
          type: 'ALERT'
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([alt.latitude, alt.longitude]);
        }
      });

      marker.addTo(layer);
    });
  }, [layersData?.alerts, showOverlays.alerts]);

  // Update Emergency Responders Markers (Demo Units)
  useEffect(() => {
    if (!mapInstanceRef.current || !responderLayerRef.current) return;
    const layer = responderLayerRef.current;
    layer.clearLayers();

    if (!showOverlays.responders || !layersData?.units) return;

    layersData.units.forEach((u: any) => {
      const unitIcon = L.divIcon({
        className: 'responder-unit-marker',
        html: `
          <div style="background-color: #2563EB; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
            <span>🚓</span>
            <span>${u.unit_code}</span>
          </div>
        `,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });

      const marker = L.marker([u.latitude, u.longitude], { icon: unitIcon });
      marker.on('click', () => {
        setSelectedEntity({
          ...u,
          type: 'UNIT'
        });
      });

      marker.addTo(layer);
    });
  }, [layersData?.units, showOverlays.responders]);

  // Render / Update Google Maps-Style Blue GPS Location Indicator
  const updateUserGPSMarker = (lat: number, lng: number, accuracy: number, shouldCenter: boolean) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Google Maps-Style Blue GPS Marker
    const blueGpsIcon = L.divIcon({
      className: 'gps-user-marker',
      html: `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: #2563EB; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #1D4ED8; border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.4); position: relative; z-index: 10;"></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng], { icon: blueGpsIcon, zIndexOffset: 1000 }).addTo(map);
      userMarkerRef.current.on('click', () => {
        setSelectedEntity({
          type: 'MY_LOCATION',
          latitude: lat,
          longitude: lng,
          accuracy,
          address: `Current GPS Device Location (Accuracy: ±${Math.round(accuracy)}m)`
        });
      });
    }

    // Soft Blue Accuracy Circle
    if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.setLatLng([lat, lng]);
      userAccuracyCircleRef.current.setRadius(accuracy);
    } else {
      userAccuracyCircleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#3B82F6',
        weight: 1.5,
        fillColor: '#93C5FD',
        fillOpacity: 0.18
      }).addTo(map);
    }

    if (shouldCenter) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    }
  };

  // GPS Action 1: "Locate Me" (Single-shot getCurrentPosition)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsStatus('UNAVAILABLE');
      setGpsErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('LOCATING');
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const timeStr = new Date(pos.timestamp).toLocaleTimeString();
        setUserLocation({ lat: latitude, lng: longitude, accuracy, timestamp: timeStr });
        setGpsStatus('FOUND');
        updateUserGPSMarker(latitude, longitude, accuracy, true);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('PERMISSION_DENIED');
          setGpsErrorMsg('Location permission was denied. Please allow location access in your browser.');
        } else {
          setGpsStatus('UNAVAILABLE');
          setGpsErrorMsg('Unable to retrieve device GPS coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // GPS Action 2: "Start Live Location" (Continuous watchPosition)
  const handleStartLiveTracking = () => {
    if (!navigator.geolocation) {
      setGpsStatus('UNAVAILABLE');
      setGpsErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setGpsStatus('LOCATING');
    setGpsErrorMsg(null);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const timeStr = new Date(pos.timestamp).toLocaleTimeString();
        setUserLocation({ lat: latitude, lng: longitude, accuracy, timestamp: timeStr });
        setGpsStatus('TRACKING_ACTIVE');
        updateUserGPSMarker(latitude, longitude, accuracy, followLocation);
      },
      (err) => {
        console.warn('Live geolocation error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('PERMISSION_DENIED');
          setGpsErrorMsg('Location permission was denied. Please allow location access.');
        } else {
          setGpsStatus('UNAVAILABLE');
          setGpsErrorMsg('Live location signal unavailable.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    watchIdRef.current = id;
  };

  // GPS Action 3: "Stop Tracking" (clearWatch)
  const handleStopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus('TRACKING_STOPPED');
  };

  // Reset to Chandigarh Center
  const handleResetToChandigarh = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(CHANDIGARH_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    }
  };

  // Quick FlyTo Landmark
  const handleFlyToLandmark = (lat: number, lon: number, name: string) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([lat, lon], 16, { duration: 1.0 });

    if (searchMarkerRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
    }

    const pinIcon = L.divIcon({
      className: 'search-destination-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: #2463A6; opacity: 0.35; animation: ping 1.5s infinite;"></div>
          <div style="background-color: #2463A6; border: 2px solid white; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([lat, lon], { icon: pinIcon }).addTo(mapInstanceRef.current);
    searchMarkerRef.current = marker;

    setSelectedEntity({
      type: 'LANDMARK',
      name,
      latitude: lat,
      longitude: lon,
      address: name
    });
  };

  // Location Search Handler (Nominatim + Local Gazetteers)
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setShowSearchDropdown(false);

    const q = searchQuery.trim().toLowerCase();

    // Check Local Index First
    const localMatch = CHANDIGARH_LANDMARKS.find(l => 
      l.name.toLowerCase().includes(q) || q.includes(l.name.toLowerCase().slice(0, 8))
    );

    if (localMatch) {
      handleFlyToLandmark(localMatch.lat, localMatch.lon, localMatch.name);
      setIsSearching(false);
      return;
    }

    // Nominatim OpenStreetMap Real Geocoding
    try {
      // Append Chandigarh unless user is searching regional or university
      const queryParam = q.includes('chandigarh') || q.includes('university') 
        ? searchQuery.trim() 
        : `${searchQuery.trim()}, Chandigarh`;

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryParam)}&limit=3`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();

      if (data && data.length > 0) {
        const topResult = data[0];
        handleFlyToLandmark(parseFloat(topResult.lat), parseFloat(topResult.lon), topResult.display_name);
      } else {
        setSearchError(`No geographical location found for "${searchQuery}".`);
      }
    } catch (err) {
      console.error('Nominatim search failed:', err);
      setSearchError('Search service error. Using approximate sector center.');
      handleFlyToLandmark(CHANDIGARH_CENTER[0], CHANDIGARH_CENTER[1], searchQuery);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear Active Search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchError(null);
    setShowSearchDropdown(false);
    if (searchMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }
  };

  // Video Toggle Play/Pause for Selected Camera
  const toggleVideoPlayback = () => {
    if (!videoPlayerRef.current) return;
    if (videoPlayerRef.current.paused) {
      videoPlayerRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoPlayerRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  // Video Toggle Mute for Selected Camera
  const toggleVideoMute = () => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.muted = !videoPlayerRef.current.muted;
    setIsVideoMuted(videoPlayerRef.current.muted);
  };

  return (
    <div className="space-y-3 relative">
      {/* =========================================================================
          TOP COMMAND STRIP: GPS NAVIGATION & LIVE STATUS BAR
      ========================================================================== */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: GPS Mode & Tracking Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F4F8FC] border border-[#E1EAF2]">
            <span className={`w-2 h-2 rounded-full ${
              gpsStatus === 'TRACKING_ACTIVE' ? 'bg-[#16A36A] animate-ping' :
              gpsStatus === 'FOUND' ? 'bg-[#2563EB]' :
              gpsStatus === 'LOCATING' ? 'bg-[#E5A12B] animate-pulse' :
              gpsStatus === 'PERMISSION_DENIED' ? 'bg-[#E34D59]' : 'bg-[#8795A5]'
            }`} />
            <span className="text-[#172F50]">
              {gpsStatus === 'IDLE' && 'Location Permission Required'}
              {gpsStatus === 'LOCATING' && 'Locating GPS...'}
              {gpsStatus === 'FOUND' && 'Location Found'}
              {gpsStatus === 'TRACKING_ACTIVE' && 'Live Tracking Active'}
              {gpsStatus === 'TRACKING_STOPPED' && 'Tracking Stopped'}
              {gpsStatus === 'PERMISSION_DENIED' && 'Permission Denied'}
              {gpsStatus === 'UNAVAILABLE' && 'Location Unavailable'}
            </span>
          </div>

          {/* Device GPS Coordinates Badge */}
          {userLocation && (
            <div className="flex items-center space-x-2 text-xs font-mono bg-[#EBF3FC] text-[#2463A6] px-2.5 py-1 rounded border border-[#DCEBFA]">
              <Crosshair className="w-3.5 h-3.5" />
              <span>{userLocation.lat.toFixed(5)}° N, {userLocation.lng.toFixed(5)}° E</span>
              <span className="text-[10px] text-[#526477] font-sans font-medium">(±{Math.round(userLocation.accuracy)}m)</span>
            </div>
          )}

          {/* Follow My Location Toggle */}
          <label className="flex items-center space-x-1.5 text-xs text-[#526477] cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={followLocation}
              onChange={(e) => setFollowLocation(e.target.checked)}
              className="rounded text-[#2463A6] focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-medium">Follow My Location</span>
          </label>
        </div>

        {/* Right Side: GPS Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Locate Me Button */}
          <button
            onClick={handleLocateMe}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Locate Me</span>
          </button>

          {/* Start Live Location / Stop Tracking Button */}
          {gpsStatus === 'TRACKING_ACTIVE' ? (
            <button
              onClick={handleStopTracking}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FEE2E2] border border-[#FECACA] hover:bg-[#FCDAD7] text-[#E34D59] transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Stop Tracking</span>
            </button>
          ) : (
            <button
              onClick={handleStartLiveTracking}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2463A6] hover:bg-[#1E528B] text-white shadow-sm transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Start Live Location</span>
            </button>
          )}

          {/* Reset to Chandigarh Button */}
          <button
            onClick={handleResetToChandigarh}
            title="Reset to Chandigarh"
            className="p-1.5 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* GPS Error Alert */}
      {gpsErrorMsg && (
        <div className="p-2.5 bg-[#FEE2E2] border border-[#FECACA] rounded-xl text-xs text-[#E34D59] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{gpsErrorMsg}</span>
          </div>
          <button onClick={() => setGpsErrorMsg(null)} className="text-[#E34D59] font-bold">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN INTERACTIVE MAP CANVAS (FULL-WIDTH EXPANSIVE VIEW)
      ========================================================================== */}
      <div className={`relative w-full rounded-xl border border-[#E1EAF2] overflow-hidden shadow-sm bg-[#E5E3DF] ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'h-[calc(100vh-180px)] min-h-[660px]'
      }`}>
        {/* Leaflet Map Div */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* =====================================================================
            FLOATING SEARCH BAR & QUICK LANDMARKS (TOP-LEFT GOOGLE MAPS STYLE)
        ====================================================================== */}
        <div className="absolute top-3 left-3 z-[1000] w-full max-w-md pointer-events-auto space-y-2">
          {/* Main Search Input Box */}
          <div className="bg-white rounded-xl shadow-lg border border-[#E1EAF2] p-1.5 flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#F4F8FC] flex items-center justify-center text-[#2463A6]">
              <Search className="w-4 h-4" />
            </div>

            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Search Chandigarh Street, Sector, Sukhna Lake..."
                className="w-full text-xs text-[#172F50] placeholder-[#8291A2] focus:outline-none bg-transparent"
              />
            </form>

            {isSearching && (
              <RefreshCw className="w-3.5 h-3.5 text-[#2463A6] animate-spin shrink-0" />
            )}

            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="p-1 text-[#8291A2] hover:text-[#172F50] transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => handleSearchSubmit()}
              className="px-3 py-1 bg-[#2463A6] text-white text-xs font-semibold rounded-lg hover:bg-[#1E528B] transition"
            >
              Search
            </button>
          </div>

          {/* Autocomplete / Landmark Suggestions Dropdown */}
          {showSearchDropdown && (
            <div className="bg-white rounded-xl shadow-xl border border-[#E1EAF2] max-h-64 overflow-y-auto divide-y divide-[#F0F5FA]">
              <div className="p-2 text-[10px] font-bold uppercase tracking-wider text-[#8291A2] bg-[#F8FAFC]">
                Chandigarh Key Locations
              </div>
              {CHANDIGARH_LANDMARKS.filter(l => 
                !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((lm, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(lm.name);
                    setShowSearchDropdown(false);
                    handleFlyToLandmark(lm.lat, lm.lon, lm.name);
                  }}
                  className="w-full text-left p-2.5 hover:bg-[#F4F8FC] flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-[#2463A6] shrink-0" />
                    <div>
                      <div className="font-semibold text-[#172F50]">{lm.name}</div>
                      <div className="text-[10px] text-[#8291A2]">{lm.type}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#A0AEC0]" />
                </button>
              ))}
            </div>
          )}

          {/* Quick Landmark Chips Strip */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['Sector 17', 'Sector 22', 'Sector 35', 'Sector 43', 'Sukhna Lake', 'Rock Garden', 'Panjab University'].map((chip, i) => (
              <button
                key={i}
                onClick={() => {
                  const match = CHANDIGARH_LANDMARKS.find(l => l.name.includes(chip));
                  if (match) {
                    handleFlyToLandmark(match.lat, match.lon, match.name);
                  }
                }}
                className="whitespace-nowrap px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[11px] font-semibold text-[#172F50] shadow-md border border-[#E1EAF2] hover:bg-[#F4F8FC] transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Search Error Toast */}
          {searchError && (
            <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-lg p-2 text-xs text-[#E34D59] flex items-center justify-between">
              <span>{searchError}</span>
              <button onClick={() => setSearchError(null)} className="font-bold">✕</button>
            </div>
          )}
        </div>

        {/* =====================================================================
            FLOATING LAYER CONTROLS (TOP-RIGHT GOOGLE MAPS STYLE)
        ====================================================================== */}
        <div className="absolute top-3 right-3 z-[1000] pointer-events-auto">
          <div className="bg-white rounded-xl shadow-lg border border-[#E1EAF2] p-2 space-y-2">
            <div className="flex items-center justify-between gap-3 pb-1 border-b border-[#E1EAF2]">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#172F50]">
                <Layers className="w-3.5 h-3.5 text-[#2463A6]" />
                <span>Map Overlays</span>
              </div>
              <button
                onClick={() => setShowLayersMenu(!showLayersMenu)}
                className="text-[11px] text-[#2463A6] font-semibold hover:underline"
              >
                {showLayersMenu ? 'Hide' : 'Configure'}
              </button>
            </div>

            {/* Quick Status Legend Always Visible */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#526477]">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#16A36A]"></span>
                <span>Online (86)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#E5A12B]"></span>
                <span>Alerts (5)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#8795A5]"></span>
                <span>Offline (9)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                <span>GPS Blue</span>
              </div>
            </div>

            {/* Expanded Layer & Camera Filters */}
            {showLayersMenu && (
              <div className="space-y-2 pt-2 border-t border-[#F0F5FA] text-xs">
                {/* Independent Overlays Toggles */}
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 text-[#172F50] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOverlays.cameras}
                      onChange={(e) => setShowOverlays({ ...showOverlays, cameras: e.target.checked })}
                      className="rounded text-[#2463A6]"
                    />
                    <span>CCTV Cameras Overlay</span>
                  </label>

                  <label className="flex items-center space-x-2 text-[#172F50] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOverlays.incidents}
                      onChange={(e) => setShowOverlays({ ...showOverlays, incidents: e.target.checked })}
                      className="rounded text-[#E34D59]"
                    />
                    <span>Emergency Incidents</span>
                  </label>

                  <label className="flex items-center space-x-2 text-[#172F50] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOverlays.reports}
                      onChange={(e) => setShowOverlays({ ...showOverlays, reports: e.target.checked })}
                      className="rounded text-[#EA580C]"
                    />
                    <span>Citizen Public Reports</span>
                  </label>

                  <label className="flex items-center space-x-2 text-[#172F50] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOverlays.responders}
                      onChange={(e) => setShowOverlays({ ...showOverlays, responders: e.target.checked })}
                      className="rounded text-[#2563EB]"
                    />
                    <span>Demo Response Units</span>
                  </label>
                </div>

                {/* Camera Status Filter */}
                <div className="pt-2 border-t border-[#F0F5FA]">
                  <div className="text-[10px] font-bold text-[#8291A2] uppercase mb-1">Camera Filter</div>
                  <select
                    value={cameraFilter}
                    onChange={(e) => setCameraFilter(e.target.value as any)}
                    className="w-full text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded p-1 text-[#172F50]"
                  >
                    <option value="ALL">All Statuses (100)</option>
                    <option value="CONNECTED">Connected Only (86)</option>
                    <option value="ALERT">Alerts Only (5)</option>
                    <option value="OFFLINE">Offline Only (9)</option>
                  </select>
                </div>

                {/* Sector Filter */}
                <div>
                  <div className="text-[10px] font-bold text-[#8291A2] uppercase mb-1">Sector Filter</div>
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="w-full text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded p-1 text-[#172F50]"
                  >
                    <option value="ALL">All Sectors</option>
                    <option value="Sector 17">Sector 17 (City Centre)</option>
                    <option value="Sector 22">Sector 22 (Market)</option>
                    <option value="Sector 35">Sector 35 (Commercial)</option>
                    <option value="Sector 43">Sector 43 (ISBT / Courts)</option>
                    <option value="Sukhna Lake">Sukhna Lake</option>
                    <option value="University">Panjab University</option>
                    <option value="IT Park">IT Park</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            FLOATING SELECTED ENTITY / CAMERA / PLACE CARD (BOTTOM-LEFT DRAWER)
        ====================================================================== */}
        {selectedEntity && (
          <div className="absolute bottom-6 left-3 z-[1000] w-full max-w-sm pointer-events-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-[#E1EAF2] p-4 space-y-3">
              {/* Header with Title and Close Button */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    {selectedEntity.type === 'CAMERA' && <Camera className="w-4 h-4 text-[#2463A6]" />}
                    {selectedEntity.type === 'INCIDENT' && <Siren className="w-4 h-4 text-[#E34D59]" />}
                    {selectedEntity.type === 'REPORT' && <AlertTriangle className="w-4 h-4 text-[#EA580C]" />}
                    {selectedEntity.type === 'MY_LOCATION' && <Crosshair className="w-4 h-4 text-[#2563EB]" />}
                    {selectedEntity.type === 'LANDMARK' && <MapPin className="w-4 h-4 text-[#2463A6]" />}
                    {selectedEntity.type === 'CLICKED_LOCATION' && <MapPinned className="w-4 h-4 text-[#172F50]" />}
                    <h3 className="text-sm font-bold text-[#172F50]">
                      {selectedEntity.name || selectedEntity.camera_id || selectedEntity.incident_number || 'Geographical Location'}
                    </h3>
                  </div>
                  <p className="text-xs text-[#526477] mt-0.5">
                    {selectedEntity.address || selectedEntity.area_zone || 'Chandigarh Geographical Coordinates'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedEntity(null)}
                  className="p-1 text-[#8291A2] hover:text-[#172F50] rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Coordinates & Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E1EAF2]">
                <div>
                  <span className="text-[#8291A2] block text-[10px] uppercase font-bold">Latitude</span>
                  <span className="font-mono text-[#172F50] font-semibold">{selectedEntity.latitude?.toFixed(6)}° N</span>
                </div>
                <div>
                  <span className="text-[#8291A2] block text-[10px] uppercase font-bold">Longitude</span>
                  <span className="font-mono text-[#172F50] font-semibold">{selectedEntity.longitude?.toFixed(6)}° E</span>
                </div>

                {selectedEntity.type === 'CAMERA' && (
                  <>
                    <div>
                      <span className="text-[#8291A2] block text-[10px] uppercase font-bold">Status</span>
                      <span className={`font-semibold ${
                        selectedEntity.status === 'ONLINE' ? 'text-[#16A36A]' :
                        selectedEntity.status === 'DEGRADED' ? 'text-[#E5A12B]' : 'text-[#8795A5]'
                      }`}>
                        {selectedEntity.status} ({selectedEntity.trust_score}% Trust)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8291A2] block text-[10px] uppercase font-bold">Stream Type</span>
                      <span className="font-semibold text-[#2463A6]">H.264 HD Stream</span>
                    </div>
                  </>
                )}

                {selectedEntity.type === 'INCIDENT' && (
                  <>
                    <div>
                      <span className="text-[#8291A2] block text-[10px] uppercase font-bold">Category</span>
                      <span className="font-semibold text-[#E34D59]">{selectedEntity.category}</span>
                    </div>
                    <div>
                      <span className="text-[#8291A2] block text-[10px] uppercase font-bold">Severity</span>
                      <span className="font-semibold text-[#E34D59]">{selectedEntity.severity}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Camera Video Player Preview (if Selected Entity is a Camera) */}
              {selectedEntity.type === 'CAMERA' && selectedEntity.demoVideoUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#172F50]">
                    <div className="flex items-center space-x-1">
                      <FileVideo className="w-3.5 h-3.5 text-[#2463A6]" />
                      <span>Live CCTV Video Preview</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EBF3FC] text-[#2463A6] border border-[#DCEBFA]">
                      DEMO FEED
                    </span>
                  </div>

                  <div className="relative rounded-lg overflow-hidden border border-[#E1EAF2] bg-black aspect-video">
                    <video
                      ref={videoPlayerRef}
                      src={selectedEntity.demoVideoUrl}
                      autoPlay
                      loop
                      muted={isVideoMuted}
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    {/* Video Player Floating Controls */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
                      <div className="flex items-center space-x-2">
                        <button onClick={toggleVideoPlayback} className="hover:text-[#4B83B8] transition">
                          {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={toggleVideoMute} className="hover:text-[#4B83B8] transition">
                          {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="font-mono text-[10px]">LIVE • 30 FPS</span>
                      </div>
                      <span className="text-[10px] text-white/70 font-mono">1080p</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Action Buttons */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => {
                    if (mapInstanceRef.current && selectedEntity.latitude && selectedEntity.longitude) {
                      mapInstanceRef.current.flyTo([selectedEntity.latitude, selectedEntity.longitude], 17, { duration: 0.8 });
                    }
                  }}
                  className="flex-1 py-1.5 bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] text-xs font-semibold rounded-lg transition"
                >
                  Zoom In Here
                </button>

                <button
                  onClick={() => {
                    if (selectedEntity.latitude && selectedEntity.longitude) {
                      navigator.clipboard.writeText(`${selectedEntity.latitude}, ${selectedEntity.longitude}`);
                      alert(`Copied coordinates: ${selectedEntity.latitude}, ${selectedEntity.longitude}`);
                    }
                  }}
                  className="py-1.5 px-3 bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#172F50] text-xs font-semibold rounded-lg transition"
                >
                  Copy Lat/Lng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            CLICKED COORDINATES STATUS BAR (BOTTOM-LEFT PILL)
        ====================================================================== */}
        {clickedLocation && !selectedEntity && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-[#E1EAF2] rounded-lg px-3 py-1.5 shadow-md flex items-center space-x-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#2463A6]" />
            <span className="font-mono text-[#172F50] font-semibold">
              {clickedLocation.lat.toFixed(6)}° N, {clickedLocation.lng.toFixed(6)}° E
            </span>
            <button
              onClick={() => {
                setClickedLocation(null);
                if (clickedPinRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.removeLayer(clickedPinRef.current);
                  clickedPinRef.current = null;
                }
              }}
              className="text-[#8291A2] hover:text-[#172F50] ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default LiveLocationGIS;
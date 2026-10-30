import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User, LiveAlert } from '../types';
import { api } from '../services/api';

export type NavTab = 
  | 'dashboard'
  | 'gis-map'
  | 'camera-management'
  | 'video-management'
  | 'incident-reconstruction'
  | 'vehicle-intelligence'
  | 'plate-search'
  | 'analytics'
  | 'alerts-events'
  | 'emergency-response'
  | 'incident-reporting'
  | 'investigation'
  | 'model-training'
  | 'settings'
  // Backwards compatibility tabs
  | 'command-centre'
  | 'predictive-ai'
  | 'behaviour-intelligence'
  | 'live-cctv'
  | 'risk-assessment'
  | 'coordination'
  | 'multi-camera'
  | 'evidence'
  | 'camera-trust';

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  activeRole: Role;
  switchRole: (role: Role) => Promise<void>;
  alerts: LiveAlert[];
  dismissAlert: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isDemoMode: boolean;
  setIsDemoMode: (isDemo: boolean) => void;
  triggerScenario: (scenarioType: string, cameraId?: string) => Promise<any>;
  isTriggeringScenario: boolean;
  pendingIncidentsCount: number;
  refreshIncidentsCount: () => Promise<void>;
}

const defaultUser: User = {
  id: 2,
  username: 'operator',
  full_name: 'Senior Control Operator Arjun Singh',
  role: 'OPERATOR',
  badge_number: 'OPR-402',
  department: 'Real-time CCTV Monitoring Division'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [activeRole, setActiveRole] = useState<Role>('OPERATOR');
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isTriggeringScenario, setIsTriggeringScenario] = useState(false);
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState(1);

  // Synthesize soft warning beep using Web Audio API
  const playAlertSound = (severity: string) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (severity === 'CRITICAL') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High alert A5
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      }
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  const refreshIncidentsCount = async () => {
    try {
      const incs = await api.getIncidents('OPERATOR_VERIFYING');
      setPendingIncidentsCount(incs.length);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    refreshIncidentsCount();
    const interval = setInterval(refreshIncidentsCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket for Live Alerts
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          // Connected
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'EARLY_WARNING_ALERT') {
              const newAlert: LiveAlert = {
                id: `alert-${Date.now()}`,
                type: data.type,
                severity: data.severity,
                title: `${data.severity}: ${data.category}`,
                message: data.explanation || `Detected at ${data.camera_name}`,
                timestamp: new Date().toLocaleTimeString(),
                incident_id: data.incident_id,
                camera_id: data.camera_id
              };
              setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
              playAlertSound(data.severity);
              refreshIncidentsCount();
            } else if (data.type === 'DISPATCH_AUTHORIZED' || data.type === 'RESPONSE_STATUS_UPDATED') {
              refreshIncidentsCount();
            }
          } catch (e) {
            // invalid json
          }
        };

        socket.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 4000);
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connectWs, 4000);
      }
    };

    connectWs();
    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [soundEnabled]);

  const switchRole = async (newRole: Role) => {
    setActiveRole(newRole);
    try {
      await api.switchRole(newRole, currentUser.username);
    } catch (e) {
      // ignore
    }
    // Update display user profile
    const nameMap: Record<Role, { name: string; dept: string; badge: string }> = {
      ADMIN: { name: 'Operations Director Sarah Vance', dept: 'Command & Control', badge: 'DIR-001' },
      OPERATOR: { name: 'Senior Control Operator Arjun Singh', dept: 'CCTV Monitoring Division', badge: 'OPR-402' },
      POLICE_RESPONDER: { name: 'Inspector Rajesh Sharma', dept: 'Metropolitan Police Dispatch', badge: 'POL-120' },
      MEDICAL_RESPONDER: { name: 'Dr. Sunita Verma', dept: 'Emergency Medical Services (EMS)', badge: 'MED-084' },
      INVESTIGATOR: { name: 'Detective Maya Lin', dept: 'Forensic Reconstruction Unit', badge: 'INV-902' }
    };
    const info = nameMap[newRole];
    setCurrentUser((prev) => ({
      ...prev,
      role: newRole,
      full_name: info.name,
      department: info.dept,
      badge_number: info.badge
    }));
  };

  const triggerScenario = async (scenarioType: string, cameraId = 'CAM-01') => {
    setIsTriggeringScenario(true);
    try {
      const res = await api.simulateScenario(cameraId, scenarioType);
      await refreshIncidentsCount();
      return res;
    } finally {
      setIsTriggeringScenario(false);
    }
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        activeRole,
        switchRole,
        alerts,
        dismissAlert,
        soundEnabled,
        setSoundEnabled,
        isDemoMode,
        setIsDemoMode,
        triggerScenario,
        isTriggeringScenario,
        pendingIncidentsCount,
        refreshIncidentsCount
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

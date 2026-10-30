import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User, LiveAlert, PortalMode } from '../types';
import { api } from '../services/api';

export type NavTab = 
  | 'dashboard'
  | 'gis-map'
  | 'camera-management'
  | 'video-management'
  | 'incident-reconstruction'
  | 'citizen-reports-review'
  | 'incident-audit'
  | 'vehicle-intelligence'
  | 'plate-search'
  | 'analytics'
  | 'alerts-events'
  | 'emergency-response'
  | 'incident-reporting'
  | 'investigation'
  | 'settings'
  // Citizen Portal tabs
  | 'citizen-dashboard'
  | 'citizen-report'
  | 'citizen-track'
  | 'citizen-help'
  // Backend Engineer Portal tabs
  | 'tech-dashboard'
  | 'api-health'
  | 'database-status'
  | 'storage-queue'
  | 'camera-integrations'
  | 'ai-engine-status'
  | 'system-logs'
  | 'user-roles'
  | 'system-config'
  // Backwards compatibility tabs
  | 'command-centre'
  | 'predictive-ai'
  | 'behaviour-intelligence'
  | 'live-cctv'
  | 'risk-assessment'
  | 'coordination'
  | 'multi-camera'
  | 'evidence'
  | 'camera-trust'
  | 'model-training';

export type AuthView = 'ROLE_SELECTION' | 'LOGIN_CITIZEN' | 'LOGIN_POLICE' | 'LOGIN_ENGINEER' | null;

interface AppContextType {
  // Authentication & RBAC
  isAuthenticated: boolean;
  authToken: string | null;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  loginWithCredentials: (username: string, password: string, portal?: string) => Promise<any>;
  registerCitizenAccount: (formData: any) => Promise<any>;
  logout: () => void;
  navigateToLogin: (view?: AuthView) => void;

  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  switchPortal: (mode: PortalMode) => void;
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
  // Authentication & Session Persistence
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('ciirs_token');
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('ciirs_token') || null;
  });
  const [authView, setAuthView] = useState<AuthView>(() => {
    return localStorage.getItem('ciirs_token') ? null : 'ROLE_SELECTION';
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('ciirs_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultUser;
  });

  const [portalMode, setPortalMode] = useState<PortalMode>(() => {
    try {
      const saved = localStorage.getItem('ciirs_portal') as PortalMode;
      if (saved) return saved;
    } catch {}
    return 'POLICE_OPERATIONS';
  });

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem('ciirs_portal') as PortalMode;
      if (saved === 'PUBLIC_CITIZEN') return 'citizen-dashboard';
      if (saved === 'BACKEND_ENGINEER') return 'tech-dashboard';
    } catch {}
    return 'dashboard';
  });

  const [activeRole, setActiveRole] = useState<Role>(() => {
    try {
      const saved = localStorage.getItem('ciirs_user');
      if (saved) return JSON.parse(saved).role as Role;
    } catch {}
    return 'OPERATOR';
  });

  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isTriggeringScenario, setIsTriggeringScenario] = useState(false);
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState(1);

  // Validate session on boot
  useEffect(() => {
    const token = localStorage.getItem('ciirs_token');
    if (token) {
      api.getMe(token)
        .then((userData) => {
          setCurrentUser(userData);
          setActiveRole(userData.role as Role);
          if (userData.portal) {
            setPortalMode(userData.portal as PortalMode);
          }
        })
        .catch(() => {
          // If session is expired or invalid, reset
          localStorage.removeItem('ciirs_token');
          localStorage.removeItem('ciirs_user');
          localStorage.removeItem('ciirs_portal');
          setIsAuthenticated(false);
          setAuthToken(null);
          setAuthView('ROLE_SELECTION');
        });
    }
  }, []);

  const loginWithCredentials = async (username: string, password: string, portal?: string) => {
    setAuthError(null);
    try {
      const data = await api.login(username, password, portal);
      const token = data.access_token;
      const user = data.user;
      const userPortal: PortalMode = data.portal || (user.role === 'CITIZEN' ? 'PUBLIC_CITIZEN' : user.role === 'ENGINEER' ? 'BACKEND_ENGINEER' : 'POLICE_OPERATIONS');
      
      localStorage.setItem('ciirs_token', token);
      localStorage.setItem('ciirs_user', JSON.stringify(user));
      localStorage.setItem('ciirs_portal', userPortal);

      setAuthToken(token);
      setCurrentUser(user);
      setActiveRole(user.role as Role);
      setPortalMode(userPortal);
      setIsAuthenticated(true);
      setAuthView(null);

      if (userPortal === 'PUBLIC_CITIZEN') {
        setActiveTab('citizen-dashboard');
      } else if (userPortal === 'BACKEND_ENGINEER') {
        setActiveTab('tech-dashboard');
      } else {
        setActiveTab('dashboard');
      }
      return data;
    } catch (err: any) {
      const msg = err.message || 'Authentication error.';
      setAuthError(msg);
      throw err;
    }
  };

  const registerCitizenAccount = async (formData: any) => {
    setAuthError(null);
    try {
      const data = await api.registerCitizen(formData);
      const token = data.access_token;
      const user = data.user;
      const userPortal: PortalMode = 'PUBLIC_CITIZEN';

      localStorage.setItem('ciirs_token', token);
      localStorage.setItem('ciirs_user', JSON.stringify(user));
      localStorage.setItem('ciirs_portal', userPortal);

      setAuthToken(token);
      setCurrentUser(user);
      setActiveRole('CITIZEN');
      setPortalMode(userPortal);
      setIsAuthenticated(true);
      setAuthView(null);
      setActiveTab('citizen-dashboard');
      return data;
    } catch (err: any) {
      const msg = err.message || 'Registration error.';
      setAuthError(msg);
      throw err;
    }
  };

  const logout = () => {
    try {
      api.logout().catch(() => {});
    } catch {}
    localStorage.removeItem('ciirs_token');
    localStorage.removeItem('ciirs_user');
    localStorage.removeItem('ciirs_portal');
    setAuthToken(null);
    setIsAuthenticated(false);
    setAuthView('ROLE_SELECTION');
    setAuthError(null);
  };

  const navigateToLogin = (view: AuthView = 'ROLE_SELECTION') => {
    setAuthView(view);
    setAuthError(null);
  };

  const switchPortal = (mode: PortalMode) => {
    setPortalMode(mode);
    if (mode === 'PUBLIC_CITIZEN') {
      setActiveTab('citizen-dashboard');
      setActiveRole('CITIZEN');
      setCurrentUser({
        id: 101,
        username: 'pooja.sharma',
        full_name: 'Pooja Sharma',
        role: 'CITIZEN',
        badge_number: 'CIT-CHD-8419',
        department: 'Resident — Sector 17, Chandigarh'
      });
    } else if (mode === 'BACKEND_ENGINEER') {
      setActiveTab('tech-dashboard');
      setActiveRole('ENGINEER');
      setCurrentUser({
        id: 103,
        username: 'vikram.mehta',
        full_name: 'Vikram Mehta',
        role: 'ENGINEER',
        badge_number: 'SYS-007',
        department: 'Infrastructure & AI Systems Engineering'
      });
    } else {
      setActiveTab('dashboard');
      setActiveRole('OPERATOR');
      setCurrentUser(defaultUser);
    }
  };

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
      MEDICAL_RESPONDER: { name: 'Dr. Harleen Kaur', dept: 'Emergency Medical Services (EMS)', badge: 'MED-084' },
      INVESTIGATOR: { name: 'Detective Maya Lin', dept: 'Forensic Reconstruction Unit', badge: 'INV-902' },
      CITIZEN: { name: 'Pooja Sharma', dept: 'Resident — Sector 17, Chandigarh', badge: 'CIT-CHD-8419' },
      ENGINEER: { name: 'Vikram Mehta', dept: 'Infrastructure & AI Systems Engineering', badge: 'SYS-007' }
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
        isAuthenticated,
        authToken,
        authView,
        setAuthView,
        authError,
        setAuthError,
        loginWithCredentials,
        registerCitizenAccount,
        logout,
        navigateToLogin,
        portalMode,
        setPortalMode,
        switchPortal,
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

import React from 'react';
import { 
  LayoutDashboard, MapPin, Video, FileVideo, GitFork, 
  Car, FileSearch, LineChart, BellRing, Siren, 
  Megaphone, FileText, Settings, ShieldAlert,
  ClipboardList, Activity, Server, Database, HardDrive,
  Cpu, Users, Terminal, FileCode, CheckCircle2, PhoneCall
} from 'lucide-react';
import { useApp, NavTab } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, portalMode, pendingIncidentsCount } = useApp();

  // Navigation Items defined per Portal
  const getNavItems = (): { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] => {
    if (portalMode === 'PUBLIC_CITIZEN') {
      return [
        { id: 'citizen-dashboard', label: 'Citizen Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'citizen-report', label: 'Report an Incident', icon: <Megaphone className="w-4 h-4" /> },
        { id: 'citizen-track', label: 'Track My Reports', icon: <FileSearch className="w-4 h-4" /> },
        { id: 'citizen-help', label: 'Safety & Helplines', icon: <PhoneCall className="w-4 h-4" /> }
      ];
    }

    if (portalMode === 'BACKEND_ENGINEER') {
      return [
        { id: 'tech-dashboard', label: 'Technical Overview', icon: <Activity className="w-4 h-4" /> },
        { id: 'api-health', label: 'API Health & Services', icon: <Server className="w-4 h-4" /> },
        { id: 'database-status', label: 'Database & Integrity', icon: <Database className="w-4 h-4" /> },
        { id: 'storage-queue', label: 'Storage & Video Queue', icon: <HardDrive className="w-4 h-4" /> },
        { id: 'camera-integrations', label: 'Camera Stream Health', icon: <Video className="w-4 h-4" /> },
        { id: 'ai-engine-status', label: 'AI Inference Engine', icon: <Cpu className="w-4 h-4" /> },
        { id: 'system-logs', label: 'System Logs & Errors', icon: <FileCode className="w-4 h-4" /> },
        { id: 'user-roles', label: 'User & Role Access', icon: <Users className="w-4 h-4" /> },
        { id: 'system-config', label: 'Backup & Recovery', icon: <Settings className="w-4 h-4" /> }
      ];
    }

    // Default: POLICE_OPERATIONS
    return [
      { id: 'dashboard', label: 'Main Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'gis-map', label: 'City Map', icon: <MapPin className="w-4 h-4" /> },
      { id: 'camera-management', label: 'Camera Management', icon: <Video className="w-4 h-4" /> },
      { id: 'video-management', label: 'Video Management', icon: <FileVideo className="w-4 h-4" /> },
      { id: 'incident-reconstruction', label: 'Incident Reconstruction', icon: <GitFork className="w-4 h-4" /> },
      { id: 'citizen-reports-review', label: 'Citizen Reports Review', icon: <ClipboardList className="w-4 h-4" />, badge: 2 },
      { id: 'incident-audit', label: 'Incident Audit & Scene Reports', icon: <ShieldAlert className="w-4 h-4" /> },
      { id: 'emergency-response', label: 'Emergency Coordination', icon: <Siren className="w-4 h-4" /> },
      { id: 'vehicle-intelligence', label: 'Vehicle Intelligence', icon: <Car className="w-4 h-4" /> },
      { id: 'plate-search', label: 'Number Plate Search', icon: <FileSearch className="w-4 h-4" /> },
      { id: 'analytics', label: 'Predictive Analytics', icon: <LineChart className="w-4 h-4" /> },
      { id: 'alerts-events', label: 'Alerts & Events', icon: <BellRing className="w-4 h-4" />, badge: pendingIncidentsCount },
      { id: 'investigation', label: 'Investigation Reports', icon: <FileText className="w-4 h-4" /> },
      { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" /> }
    ];
  };

  const navItems = getNavItems();

  const getPortalBadge = () => {
    if (portalMode === 'PUBLIC_CITIZEN') {
      return (
        <div className="px-3 py-2 bg-[#DCEBFA] border border-[#CBDCEE] rounded-lg mb-2">
          <div className="text-[10px] uppercase font-bold text-[#2463A6] tracking-wider">Active Portal</div>
          <div className="text-xs font-bold text-[#172F50]">Public / Citizen Portal</div>
        </div>
      );
    }
    if (portalMode === 'BACKEND_ENGINEER') {
      return (
        <div className="px-3 py-2 bg-[#CCFBF1] border border-[#99F6E4] rounded-lg mb-2">
          <div className="text-[10px] uppercase font-bold text-[#0D9488] tracking-wider">Active Portal</div>
          <div className="text-xs font-bold text-[#0F766E]">Backend Engineer Portal</div>
        </div>
      );
    }
    return (
      <div className="px-3 py-2 bg-[#172F50] text-white rounded-lg mb-2 shadow-sm">
        <div className="text-[10px] uppercase font-bold text-[#93C5FD] tracking-wider">Active Portal</div>
        <div className="text-xs font-bold text-white">Police Operations Portal</div>
      </div>
    );
  };

  return (
    <aside className="w-64 bg-[#EDF4FC] border-r border-[#E1EAF2] flex flex-col shrink-0 select-none h-full">
      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
        {/* Active Portal Header Card */}
        {getPortalBadge()}

        {navItems.map((item) => {
          const isActive = activeTab === item.id || 
            (item.id === 'dashboard' && activeTab === 'command-centre') ||
            (item.id === 'alerts-events' && activeTab === 'predictive-ai');

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#DCEBFA] text-[#2463A6] font-semibold shadow-sm shadow-[#2463A6]/10'
                  : 'text-[#526477] hover:bg-[#E2EDF9] hover:text-[#172F50]'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span className={`shrink-0 ${isActive ? 'text-[#2463A6]' : 'text-[#526477]'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-[#E34D59] text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Branding / Smart City Illustration */}
      <div className="p-4 border-t border-[#E1EAF2]/80 bg-[#E8F1FB]">
        <div className="flex items-center space-x-3">
          {/* Subtle monument sketch icon */}
          <div className="w-9 h-9 rounded-lg border border-[#CBDCEE] bg-white/80 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#2463A6]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 21V9l4-4 4 4v12M12 21V5l4-4 4 4v16M2 21h20" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-[#172F50] leading-tight">
              Smart Chandigarh
            </div>
            <div className="text-[11px] text-[#526477] leading-tight">
              Safer Chandigarh
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

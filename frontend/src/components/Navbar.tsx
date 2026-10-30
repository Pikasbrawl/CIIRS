import React from 'react';
import { 
  LayoutDashboard, MapPin, Video, FileVideo, GitFork, 
  Car, FileSearch, LineChart, BellRing, Siren, 
  Megaphone, FileText, Cpu, Settings
} from 'lucide-react';
import { useApp, NavTab } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, pendingIncidentsCount } = useApp();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'gis-map', label: 'City Map', icon: <MapPin className="w-4 h-4" /> },
    { id: 'camera-management', label: 'Camera Management', icon: <Video className="w-4 h-4" /> },
    { id: 'video-management', label: 'Video Management', icon: <FileVideo className="w-4 h-4" /> },
    { id: 'incident-reconstruction', label: 'Incident Reconstruction', icon: <GitFork className="w-4 h-4" /> },
    { id: 'vehicle-intelligence', label: 'Vehicle Intelligence', icon: <Car className="w-4 h-4" /> },
    { id: 'plate-search', label: 'Number Plate Search', icon: <FileSearch className="w-4 h-4" /> },
    { id: 'analytics', label: 'Predictive Analytics', icon: <LineChart className="w-4 h-4" /> },
    { id: 'alerts-events', label: 'Alerts & Events', icon: <BellRing className="w-4 h-4" />, badge: pendingIncidentsCount },
    { id: 'emergency-response', label: 'Emergency Coordination', icon: <Siren className="w-4 h-4" /> },
    { id: 'incident-reporting', label: 'Incident Reporting', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'investigation', label: 'Investigation Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'model-training', label: 'AI Training Centre', icon: <Cpu className="w-4 h-4" /> },
    { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <aside className="w-60 bg-[#EDF4FC] border-r border-[#E1EAF2] flex flex-col shrink-0 select-none h-full">
      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
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

import React, { useState, useEffect } from 'react';
import { 
  Search, Bell, ChevronDown, User, ShieldCheck, 
  CheckCircle2, Radio, Sparkles, Users, Shield, Terminal
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    activeRole, 
    switchRole, 
    portalMode,
    switchPortal,
    soundEnabled, 
    setSoundEnabled,
    setActiveTab
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Format: Mon, 18 May 2026
      const dateFormatted = now.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      // Format: 14:32:15
      const timeFormatted = now.toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentDate(dateFormatted);
      setCurrentTime(timeFormatted);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const roles: { role: Role; title: string; subtitle: string; portal: string }[] = [
    { role: 'OPERATOR', title: 'Senior Operator Arjun Singh', subtitle: 'Monitoring Division', portal: 'POLICE_OPERATIONS' },
    { role: 'INVESTIGATOR', title: 'Detective Maya Lin', subtitle: 'Forensic Reconstruction', portal: 'POLICE_OPERATIONS' },
    { role: 'POLICE_RESPONDER', title: 'Inspector Rajesh Sharma', subtitle: 'Police Dispatch Lead', portal: 'POLICE_OPERATIONS' },
    { role: 'MEDICAL_RESPONDER', title: 'Dr. Harleen Kaur', subtitle: 'PGIMER Trauma / EMS', portal: 'POLICE_OPERATIONS' },
    { role: 'ADMIN', title: 'Director Sarah Vance', subtitle: 'City Command', portal: 'POLICE_OPERATIONS' },
    { role: 'CITIZEN', title: 'Pooja Sharma (Citizen)', subtitle: 'Sector 17 Resident', portal: 'PUBLIC_CITIZEN' },
    { role: 'ENGINEER', title: 'Vikram Mehta (DevOps)', subtitle: 'Infrastructure Lead', portal: 'BACKEND_ENGINEER' }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('cam') || q.includes('sector') || q.includes('camera')) {
      setActiveTab('camera-management');
    } else if (q.includes('ch01') || q.includes('pb') || q.includes('plate') || q.includes('vehicle') || q.includes('car')) {
      setActiveTab('vehicle-intelligence');
    } else {
      setActiveTab('alerts-events');
    }
  };

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E1EAF2] px-5 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(23,47,80,0.04)]">
      {/* Left: Brand Identity */}
      <div className="flex items-center space-x-3.5">
        {/* Emblem Badge */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2463A6] to-[#172F50] flex items-center justify-center text-white shadow-sm shadow-[#2463A6]/20">
          <span className="font-extrabold text-sm tracking-tighter">CIIRS</span>
        </div>

        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-[#172F50] tracking-tight leading-none">
              CIIRS
            </h1>
            <span className="hidden sm:inline-block text-xs font-medium text-[#526477]">
              CCTV Incident Intelligence & Reconstruction System
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-[10px] font-semibold text-[#2463A6] bg-[#DCEBFA] px-1.5 py-0.5 rounded">
              Team PANDA
            </span>
            <span className="text-[10px] text-[#8291A2]">
              Zinnovatio 4.0 • Smart & Sustainable Cities
            </span>
          </div>
        </div>
      </div>

      {/* Center: Role-Based Portal Switcher & Quick Search */}
      <div className="hidden lg:flex items-center space-x-3 flex-1 max-w-2xl mx-5">
        {/* Portal Switcher Buttons */}
        <div className="flex items-center bg-[#EDF4FC] p-1 rounded-xl border border-[#CBDCEE] space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => switchPortal('PUBLIC_CITIZEN')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              portalMode === 'PUBLIC_CITIZEN'
                ? 'bg-white text-[#2463A6] shadow-sm shadow-[#172F50]/5 border border-[#CBDCEE]'
                : 'text-[#526477] hover:text-[#172F50]'
            }`}
            title="Switch to Public / Citizen Portal"
          >
            <Users className="w-3.5 h-3.5 text-[#2463A6]" />
            <span>Public / Citizen</span>
          </button>
          <button
            type="button"
            onClick={() => switchPortal('POLICE_OPERATIONS')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              portalMode === 'POLICE_OPERATIONS'
                ? 'bg-[#172F50] text-white shadow-sm shadow-[#172F50]/20'
                : 'text-[#526477] hover:text-[#172F50]'
            }`}
            title="Switch to Police / Operations Portal"
          >
            <Shield className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Police / Operations</span>
          </button>
          <button
            type="button"
            onClick={() => switchPortal('BACKEND_ENGINEER')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              portalMode === 'BACKEND_ENGINEER'
                ? 'bg-white text-[#0D9488] shadow-sm shadow-[#172F50]/5 border border-[#CBDCEE]'
                : 'text-[#526477] hover:text-[#172F50]'
            }`}
            title="Switch to Backend Engineer / Systems Admin Portal"
          >
            <Terminal className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Backend Engineer</span>
          </button>
        </div>

        {/* Search Field */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-[#8291A2] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cameras, vehicles, incidents..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] focus:ring-1 focus:ring-[#2463A6] transition"
          />
        </form>
      </div>

      {/* Right: Telemetry & Controls */}
      <div className="flex items-center space-x-4">
        {/* LIVE Status Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#FEE2E2] border border-[#FECACA] text-[#E34D59] text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-[#E34D59] animate-pulse"></span>
          <span>LIVE</span>
        </div>

        {/* Notifications Bell */}
        <button 
          onClick={() => setActiveTab('alerts-events')}
          className="relative p-2 rounded-lg text-[#526477] hover:bg-[#F4F8FC] hover:text-[#172F50] transition"
          title="Recent Early Warning Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute 1 top-1 right-1 w-4 h-4 bg-[#E34D59] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            3
          </span>
        </button>

        <div className="h-6 w-[1px] bg-[#E1EAF2] hidden sm:block"></div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[#F4F8FC] transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#2463A6] flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden lg:block">
              <div className="text-xs font-semibold text-[#172F50] leading-none">
                {roles.find(r => r.role === activeRole)?.title || 'Investigator'}
              </div>
              <div className="text-[10px] text-[#8291A2] mt-0.5 leading-none">
                {roles.find(r => r.role === activeRole)?.subtitle || 'Control Room'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#8291A2]" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E1EAF2] rounded-xl shadow-lg shadow-[#172F50]/10 py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-[#E1EAF2] text-[10px] font-bold uppercase tracking-wider text-[#8291A2]">
                Switch Command Role
              </div>
              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    switchRole(r.role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F4F8FC] transition ${
                    activeRole === r.role ? 'bg-[#DCEBFA]/60 text-[#2463A6] font-semibold' : 'text-[#526477]'
                  }`}
                >
                  <div>
                    <div className="font-medium text-[#172F50]">{r.title}</div>
                    <div className="text-[10px] text-[#8291A2]">{r.subtitle}</div>
                  </div>
                  {activeRole === r.role && <CheckCircle2 className="w-3.5 h-3.5 text-[#2463A6]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-[#E1EAF2] hidden sm:block"></div>

        {/* Dynamic System Date & Time */}
        <div className="text-right hidden sm:block">
          <div className="text-[11px] font-medium text-[#8291A2] leading-none">
            {currentDate}
          </div>
          <div className="text-sm font-bold text-[#172F50] font-mono leading-none mt-1">
            {currentTime}
          </div>
        </div>
      </div>
    </header>
  );
};

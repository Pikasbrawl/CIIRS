import React, { useState, useEffect } from 'react';
import { 
  Search, Bell, ChevronDown, User, ShieldCheck, 
  CheckCircle2, Radio, Sparkles, Users, Shield, Terminal, LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    activeRole, 
    portalMode,
    logout,
    soundEnabled, 
    setSoundEnabled,
    setActiveTab
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('cam') || q.includes('sector') || q.includes('camera')) {
      setActiveTab('camera-management');
    } else if (q.includes('ch01') || q.includes('pb') || q.includes('plate') || q.includes('vehicle') || q.includes('car')) {
      setActiveTab('plate-search');
    } else {
      setActiveTab('alerts-events');
    }
  };

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E1EAF2] px-5 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(23,47,80,0.04)] select-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center space-x-3.5">
        {/* Emblem Badge */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2463A6] to-[#172F50] flex items-center justify-center text-white shadow-sm shadow-[#2463A6]/20">
          <span className="font-extrabold text-sm tracking-tighter font-mono">CIIRS</span>
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

      {/* Center: Active Verified Portal Identity & Quick Search */}
      <div className="hidden lg:flex items-center space-x-3 flex-1 max-w-2xl mx-5">
        
        {/* Active Portal Verified Badge */}
        {portalMode === 'PUBLIC_CITIZEN' && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#EBF3FC] border border-[#CBDCEE] text-xs font-bold text-[#2463A6] shrink-0 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-[#2463A6]" />
            <span>Public / Citizen Portal</span>
            <span className="text-[9.5px] font-mono bg-white text-[#2463A6] px-1.5 py-0.2 rounded border border-[#CBDCEE]">
              {currentUser.badge_number || 'RESIDENT'}
            </span>
          </div>
        )}

        {portalMode === 'POLICE_OPERATIONS' && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#172F50] text-white text-xs font-bold shrink-0 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Police Operations Portal</span>
            <span className="text-[9.5px] font-mono bg-white/15 text-sky-200 px-1.5 py-0.2 rounded border border-white/20">
              {currentUser.badge_number || 'LAW ENFORCEMENT'}
            </span>
          </div>
        )}

        {portalMode === 'BACKEND_ENGINEER' && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-[#0D9488] shrink-0 shadow-2xs">
            <Terminal className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Backend Engineer Portal</span>
            <span className="text-[9.5px] font-mono bg-white text-[#0D9488] px-1.5 py-0.2 rounded border border-teal-200">
              {currentUser.badge_number || 'SYS-ADMIN'}
            </span>
          </div>
        )}

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

      {/* Right: Telemetry & Authenticated User Controls */}
      <div className="flex items-center space-x-3.5">
        
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
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#E34D59] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            3
          </span>
        </button>

        <div className="h-6 w-[1px] bg-[#E1EAF2] hidden sm:block"></div>

        {/* Authenticated User Profile Summary */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[#F4F8FC] transition text-left"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              portalMode === 'PUBLIC_CITIZEN' ? 'bg-[#EBF3FC] text-[#2463A6]' :
              portalMode === 'BACKEND_ENGINEER' ? 'bg-teal-50 text-[#0D9488]' :
              'bg-[#172F50] text-white'
            }`}>
              {currentUser.full_name ? currentUser.full_name.charAt(0) : <User className="w-4 h-4" />}
            </div>
            <div className="hidden lg:block">
              <div className="text-xs font-semibold text-[#172F50] leading-none truncate max-w-[150px]">
                {currentUser.full_name || 'Senior Operator'}
              </div>
              <div className="text-[10px] text-[#8291A2] mt-0.5 leading-none truncate max-w-[150px]">
                {currentUser.department || currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#8291A2]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#CBDCEE] rounded-xl shadow-xl shadow-[#172F50]/10 py-2 z-50">
              <div className="px-3.5 py-2 border-b border-[#E1EAF2]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8291A2]">
                  Authenticated Session
                </div>
                <div className="font-bold text-[#172F50] text-xs mt-1">
                  {currentUser.full_name}
                </div>
                <div className="text-[11px] text-[#526477] font-mono mt-0.5">
                  ID: {currentUser.username} • {currentUser.badge_number || 'N/A'}
                </div>
                <div className="text-[10px] text-[#8291A2] mt-0.5">
                  {currentUser.department}
                </div>
              </div>

              <div className="p-1.5">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition flex items-center space-x-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Switch Account / Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Explicit Sign Out Button */}
        <button
          onClick={logout}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition shadow-2xs"
          title="Sign out of CIIRS Command Network"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>

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

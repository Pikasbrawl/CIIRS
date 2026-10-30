import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Terminal, ArrowRight, ArrowLeft, Lock, 
  KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, 
  Sparkles, HelpCircle, ShieldCheck, Server, Activity, 
  FileText, Radio, Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuthView } from '../context/AppContext';

export const AuthPortal: React.FC = () => {
  const { 
    authView, 
    setAuthView, 
    loginWithCredentials, 
    registerCitizenAccount, 
    authError, 
    setAuthError 
  } = useApp();

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sync view with URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('citizen')) {
        setAuthView('LOGIN_CITIZEN');
      } else if (hash.includes('police')) {
        setAuthView('LOGIN_POLICE');
      } else if (hash.includes('engineer') || hash.includes('backend')) {
        setAuthView('LOGIN_ENGINEER');
      } else if (hash.includes('login') || !hash) {
        setAuthView('ROLE_SELECTION');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const changeAuthView = (view: AuthView) => {
    setAuthView(view);
    setAuthError(null);
    if (view === 'LOGIN_CITIZEN') {
      window.location.hash = '#login/citizen';
    } else if (view === 'LOGIN_POLICE') {
      window.location.hash = '#login/police';
    } else if (view === 'LOGIN_ENGINEER') {
      window.location.hash = '#login/backend-engineer';
    } else {
      window.location.hash = '#login';
    }
  };
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent, portal: string) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError('Please enter both your identifier and password.');
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      await loginWithCredentials(username.trim(), password, portal);
    } catch (err: any) {
      // Handled in context, error set
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Citizen Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword) {
      setAuthError('Please complete all registration fields.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Passwords do not match. Please verify.');
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      await registerCitizenAccount({
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        phone_number: regPhone.trim(),
        password: regPassword,
        confirm_password: regConfirmPassword
      });
      setRegSuccessMsg('Account registered successfully! Directing to Citizen Safety Dashboard...');
    } catch (err: any) {
      // Handled in context
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Auto-Fill helper
  const applyDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setAuthError(null);
  };

  // Render the Three-Card Role Selection Landing Page (CUIMS inspired layout)
  if (authView === 'ROLE_SELECTION' || !authView) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#F4F8FC] via-[#FFFFFF] to-[#EDF4FC] flex flex-col justify-between text-[#172F50] select-none font-sans">
        
        {/* Top Government & System Identity Header */}
        <header className="w-full bg-white border-b border-[#CBDCEE] py-4 px-6 md:px-12 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2463A6] to-[#172F50] flex items-center justify-center text-white shadow-md shadow-[#2463A6]/20">
                <span className="font-extrabold text-lg tracking-tight font-mono">CIIRS</span>
              </div>
              <div>
                <div className="flex items-center justify-center md:justify-start space-x-2">
                  <h1 className="text-xl md:text-2xl font-black text-[#172F50] tracking-tight">
                    CIIRS
                  </h1>
                  <span className="text-xs bg-[#DCEBFA] text-[#2463A6] font-bold px-2 py-0.5 rounded-full border border-[#CBDCEE]">
                    Team PANDA
                  </span>
                  <span className="hidden sm:inline-block text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Zinnovatio 4.0
                  </span>
                </div>
                <p className="text-xs text-[#526477] font-medium mt-0.5">
                  CCTV Incident Intelligence & Reconstruction System • Smart & Sustainable Cities
                </p>
              </div>
            </div>

            {/* Official Security Seal Badge */}
            <div className="flex items-center space-x-2 text-xs text-[#526477] bg-[#F4F8FC] border border-[#CBDCEE] px-3.5 py-1.5 rounded-lg shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left">
                <span className="font-bold text-[#172F50] block leading-tight">Official Secure Gateway</span>
                <span className="text-[10px] text-[#8291A2] leading-tight">256-Bit SSL • CCTNS Interoperable</span>
              </div>
            </div>
          </div>
        </header>

        {/* Central Institutional Portal Banner */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col items-center justify-center">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            {/* Tagline */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF3FC] border border-[#CBDCEE] text-[#2463A6] text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Agency Incident Response Grid</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#172F50] tracking-tight mb-3">
              Intelligent Public Safety. Connected Communities. Coordinated Response.
            </h2>
            
            <p className="text-sm md:text-base text-[#526477] font-normal max-w-2xl mx-auto leading-relaxed">
              Select your designated institutional role to enter the secure CIIRS operational portal. 
              All sessions are verified against role-based operational permissions and cryptographically sealed.
            </p>
          </div>

          {/* Three Large Horizontal Login Cards (CUIMS layout inspiration adapted to CIIRS) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            
            {/* CARD 1: PUBLIC / CITIZEN PORTAL */}
            <div className="bg-white rounded-2xl border border-[#CBDCEE] p-7 shadow-sm hover:shadow-xl hover:border-[#2463A6] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#2463A6]"></div>
              
              <div>
                {/* Icon Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                    <Users className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#2463A6] border border-sky-200 px-2.5 py-1 rounded-full">
                    Citizen Services
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-[#172F50] group-hover:text-[#2463A6] transition-colors mb-2.5">
                  Public / Citizen Login
                </h3>
                
                <p className="text-xs text-[#526477] leading-relaxed mb-5">
                  Access community safety services, report incidents, submit photographs, request assistance and track your submitted reports.
                </p>

                {/* Feature Bullet Points */}
                <div className="space-y-2 border-t border-[#E1EAF2] pt-4 mb-6 text-xs text-[#526477]">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Report incidents & upload evidence photos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Real-time tracking of police investigation status</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Emergency SOS & community safety alerts</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  onClick={() => {
                    changeAuthView('LOGIN_CITIZEN');
                    setActiveFormTab('LOGIN');
                    setAuthError(null);
                    applyDemoCredentials('citizen', 'citizen123');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-sm shadow-[#2463A6]/20 transition group-hover:shadow-md"
                >
                  <span>Login as Citizen</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <div className="text-center mt-2.5">
                  <span className="text-[11px] text-[#8291A2]">
                    Resident of Chandigarh? Open to all citizens.
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: POLICE / OPERATIONS PORTAL */}
            <div className="bg-white rounded-2xl border-2 border-[#172F50]/20 p-7 shadow-md hover:shadow-2xl hover:border-[#172F50] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-white via-white to-[#F8FAFC]">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#172F50]"></div>
              
              <div>
                {/* Icon Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#172F50] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-[#172F50]/20">
                    <Shield className="w-7 h-7 text-[#60A5FA]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full">
                    Law Enforcement Only
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-[#172F50] group-hover:text-[#2463A6] transition-colors mb-2.5">
                  Police / Operations Login
                </h3>
                
                <p className="text-xs text-[#526477] leading-relaxed mb-5">
                  Monitor CCTV networks, verify incident alerts, review camera footage, coordinate emergency responses and manage incident investigations.
                </p>

                {/* Feature Bullet Points */}
                <div className="space-y-2 border-t border-[#E1EAF2] pt-4 mb-6 text-xs text-[#526477]">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>24/7 Live AI CCTV monitoring & ANPR search</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Multi-camera video incident reconstruction</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Emergency coordination & inter-agency scene reports</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  onClick={() => {
                    changeAuthView('LOGIN_POLICE');
                    setAuthError(null);
                    applyDemoCredentials('operator', 'operator123');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#172F50] hover:bg-[#0F1E33] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-[#172F50]/20 transition group-hover:shadow-lg"
                >
                  <Lock className="w-4 h-4 text-[#60A5FA]" />
                  <span>Login as Police Officer</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <div className="text-center mt-2.5">
                  <span className="text-[11px] text-[#8291A2]">
                    Requires valid Officer ID & Command clearance.
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: BACKEND ENGINEER PORTAL */}
            <div className="bg-white rounded-2xl border border-[#CBDCEE] p-7 shadow-sm hover:shadow-xl hover:border-[#0D9488] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0D9488]"></div>
              
              <div>
                {/* Icon Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0D9488] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                    <Terminal className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full">
                    Systems Admin
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-[#172F50] group-hover:text-[#0D9488] transition-colors mb-2.5">
                  Backend Engineer Login
                </h3>
                
                <p className="text-xs text-[#526477] leading-relaxed mb-5">
                  Access authorised system administration, camera infrastructure, service monitoring, application health and technical diagnostics.
                </p>

                {/* Feature Bullet Points */}
                <div className="space-y-2 border-t border-[#E1EAF2] pt-4 mb-6 text-xs text-[#526477]">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Camera stream connectivity & RTSP ingest telemetry</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>AI PyTorch/YOLO inference pipeline performance</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Database latency, system logs & service diagnostics</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  onClick={() => {
                    changeAuthView('LOGIN_ENGINEER');
                    setAuthError(null);
                    applyDemoCredentials('engineer', 'engineer123');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-sm shadow-[#0D9488]/20 transition group-hover:shadow-md"
                >
                  <Server className="w-4 h-4 text-teal-200" />
                  <span>Login as Backend Engineer</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <div className="text-center mt-2.5">
                  <span className="text-[11px] text-[#8291A2]">
                    System architecture & DevOps engineering division.
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Demo Helper Section for Evaluators */}
          <div className="mt-10 bg-white border border-[#CBDCEE] rounded-xl p-4 max-w-4xl w-full shadow-2xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold text-xs shrink-0">
                  DEMO
                </div>
                <div>
                  <div className="text-xs font-bold text-[#172F50]">
                    Hackathon Evaluation Quick-Fill Accounts (Zinnovatio 4.0)
                  </div>
                  <div className="text-[11px] text-[#526477]">
                    Click any account to jump directly to its dedicated login view with pre-configured verified credentials:
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    changeAuthView('LOGIN_CITIZEN');
                    setActiveFormTab('LOGIN');
                    applyDemoCredentials('citizen', 'citizen123');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#EBF3FC] hover:bg-[#DCEBFA] text-[#2463A6] text-xs font-semibold border border-[#CBDCEE] transition flex items-center space-x-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Citizen (Pooja)</span>
                </button>
                <button
                  onClick={() => {
                    changeAuthView('LOGIN_POLICE');
                    applyDemoCredentials('operator', 'operator123');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#EDF4FC] hover:bg-[#DCEBFA] text-[#172F50] text-xs font-semibold border border-[#CBDCEE] transition flex items-center space-x-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Police (Arjun)</span>
                </button>
                <button
                  onClick={() => {
                    changeAuthView('LOGIN_ENGINEER');
                    applyDemoCredentials('engineer', 'engineer123');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0D9488] text-xs font-semibold border border-teal-200 transition flex items-center space-x-1"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Engineer (Vikram)</span>
                </button>
              </div>
            </div>
          </div>

        </main>

        {/* Professional Government/Institutional Footer */}
        <footer className="w-full bg-white border-t border-[#CBDCEE] py-5 px-6 text-center text-xs text-[#8291A2]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#526477]">
                Government of India & Smart City Chandigarh Mission • CIIRS Incident Intelligence Architecture
              </p>
              <p className="text-[11px] mt-0.5">
                Developed by Team PANDA for Zinnovatio 4.0 | Theme: Smart and Sustainable Cities
              </p>
            </div>
            <div className="flex items-center space-x-4 text-[11px]">
              <span className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>256-Bit Cryptographic Sealing</span>
              </span>
              <span>•</span>
              <span>ISO 27001 Certified Security</span>
              <span>•</span>
              <span>CCTNS Interoperable</span>
            </div>
          </div>
        </footer>

      </div>
    );
  }

  // Common Header for Specific Role Login Forms
  const renderFormHeader = (
    title: string, 
    subtitle: string, 
    badge: string, 
    icon: React.ReactNode, 
    accentColor: string
  ) => (
    <div className="mb-6 text-center">
      <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-md ${accentColor}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EBF3FC] text-[#2463A6] border border-[#CBDCEE] px-2.5 py-0.5 rounded-full inline-block mb-1.5">
        {badge}
      </span>
      <h2 className="text-2xl font-extrabold text-[#172F50] tracking-tight">
        {title}
      </h2>
      <p className="text-xs text-[#526477] mt-1 max-w-sm mx-auto">
        {subtitle}
      </p>
    </div>
  );

  // Render 1: Citizen Login / Register Page
  if (authView === 'LOGIN_CITIZEN') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#F4F8FC] via-[#FFFFFF] to-[#EDF4FC] flex flex-col justify-between text-[#172F50] p-4 font-sans">
        
        {/* Back Link */}
        <div className="max-w-md w-full mx-auto pt-4">
          <button
            onClick={() => {
              changeAuthView('ROLE_SELECTION');
              setAuthError(null);
            }}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#2463A6] hover:text-[#172F50] transition bg-white px-3 py-1.5 rounded-lg border border-[#CBDCEE] shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Role Selection</span>
          </button>
        </div>

        {/* Card Form */}
        <div className="max-w-md w-full mx-auto my-auto bg-white rounded-2xl border border-[#CBDCEE] p-7 md:p-8 shadow-xl">
          
          {renderFormHeader(
            'Citizen Portal Login',
            'Access community incident reporting, upload scene photos, and track response status.',
            'Public Safety Services',
            <Users className="w-7 h-7 text-white" />,
            'bg-[#2463A6]'
          )}

          {/* Toggle between Sign In and Create Account */}
          <div className="flex bg-[#F4F8FC] p-1 rounded-xl border border-[#CBDCEE] mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveFormTab('LOGIN');
                setAuthError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                activeFormTab === 'LOGIN'
                  ? 'bg-white text-[#2463A6] shadow-xs'
                  : 'text-[#526477] hover:text-[#172F50]'
              }`}
            >
              Citizen Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFormTab('REGISTER');
                setAuthError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                activeFormTab === 'REGISTER'
                  ? 'bg-white text-[#2463A6] shadow-xs'
                  : 'text-[#526477] hover:text-[#172F50]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{authError}</div>
            </div>
          )}

          {/* Success Banner */}
          {regSuccessMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{regSuccessMsg}</div>
            </div>
          )}

          {activeFormTab === 'LOGIN' ? (
            /* Citizen Sign In Form */
            <form onSubmit={(e) => handleLoginSubmit(e, 'PUBLIC_CITIZEN')} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#172F50] mb-1">
                  Mobile Number or Registered Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. 9876543210 or citizen@ciirs.gov.in"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] focus:ring-1 focus:ring-[#2463A6] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#172F50]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-[#2463A6] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter citizen account password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] focus:ring-1 focus:ring-[#2463A6] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8291A2] hover:text-[#172F50]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Helper Pill */}
              <div className="bg-[#EBF3FC] border border-[#CBDCEE] rounded-lg p-2.5 flex items-center justify-between text-xs">
                <div className="text-[11px] text-[#526477]">
                  <span className="font-bold text-[#2463A6]">Demo Citizen:</span> Pooja Sharma
                </div>
                <button
                  type="button"
                  onClick={() => applyDemoCredentials('citizen', 'citizen123')}
                  className="text-[10px] bg-white text-[#2463A6] font-bold px-2 py-0.5 rounded border border-[#CBDCEE] hover:bg-[#2463A6] hover:text-white transition shadow-2xs"
                >
                  Quick Fill Demo
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-[#2463A6]/20 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Sign In to Citizen Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Citizen Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#172F50] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Aarav Gupta"
                  className="w-full px-3.5 py-2 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#172F50] mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#172F50] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full px-3.5 py-2 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#172F50] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3.5 py-2 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#172F50] mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#2463A6] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Create Citizen Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        <div className="text-center text-xs text-[#8291A2] py-4">
          Government of India & Smart City Chandigarh Mission • Team PANDA Zinnovatio 4.0
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#CBDCEE] p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center space-x-2.5 mb-3 text-[#172F50]">
                <HelpCircle className="w-5 h-5 text-[#2463A6]" />
                <h3 className="font-bold text-base">Citizen Password Assistance</h3>
              </div>
              <p className="text-xs text-[#526477] mb-4">
                Enter your registered mobile or email to receive a password reset token via the Chandigarh Smart City gateway.
              </p>
              <input
                type="text"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Mobile number or email"
                className="w-full px-3 py-2 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-lg mb-3"
              />
              {forgotMsg && (
                <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-[11px] mb-3">
                  {forgotMsg}
                </div>
              )}
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotMsg(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#CBDCEE] text-xs font-semibold text-[#526477]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMsg('Password reset link sent to registered mobile/email.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#2463A6] text-white text-xs font-bold"
                >
                  Send OTP Token
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Render 2: Police / Operations Login Page
  if (authView === 'LOGIN_POLICE') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#F4F8FC] via-[#FFFFFF] to-[#EDF4FC] flex flex-col justify-between text-[#172F50] p-4 font-sans">
        
        {/* Back Link */}
        <div className="max-w-md w-full mx-auto pt-4">
          <button
            onClick={() => {
              changeAuthView('ROLE_SELECTION');
              setAuthError(null);
            }}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#172F50] hover:text-[#2463A6] transition bg-white px-3 py-1.5 rounded-lg border border-[#CBDCEE] shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Role Selection</span>
          </button>
        </div>

        {/* Card Form */}
        <div className="max-w-md w-full mx-auto my-auto bg-white rounded-2xl border-2 border-[#172F50]/20 p-7 md:p-8 shadow-2xl">
          
          {renderFormHeader(
            'Police Operations Login',
            'Integrated Command & Control Centre • CCTV Telemetry & Emergency Coordination',
            'Authorized Law Enforcement',
            <Shield className="w-7 h-7 text-[#60A5FA]" />,
            'bg-[#172F50]'
          )}

          {/* Security Notice */}
          <div className="mb-5 p-3 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed flex items-start space-x-2.5">
            <Lock className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#60A5FA]">RESTRICTED LAW ENFORCEMENT NETWORK:</span>
              <span className="text-slate-300 block mt-0.5">
                Access is restricted to authorized Chandigarh Police officers, CCTV monitoring specialists, and emergency dispatch commanders.
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{authError}</div>
            </div>
          )}

          <form onSubmit={(e) => handleLoginSubmit(e, 'POLICE_OPERATIONS')} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#172F50] mb-1">
                Officer ID or Registered Email
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. operator or police_officer"
                className="w-full px-3.5 py-2.5 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#172F50] focus:ring-1 focus:ring-[#172F50] transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#172F50]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-semibold text-[#172F50] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter police account password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#172F50] focus:ring-1 focus:ring-[#172F50] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8291A2] hover:text-[#172F50]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Demo Helper Pills for Police Roles */}
            <div className="bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-[#172F50] flex items-center justify-between">
                <span>Select Police Demonstration Account:</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono">LIVE DEMO</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyDemoCredentials('operator', 'operator123')}
                  className="p-1.5 rounded-lg bg-white border border-[#CBDCEE] hover:border-[#172F50] hover:bg-[#EDF4FC] text-left transition"
                >
                  <div className="text-[11px] font-bold text-[#172F50]">Senior Operator</div>
                  <div className="text-[9.5px] text-[#8291A2]">OPR-402 • CCTV Grid</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyDemoCredentials('police_officer', 'police123')}
                  className="p-1.5 rounded-lg bg-white border border-[#CBDCEE] hover:border-[#172F50] hover:bg-[#EDF4FC] text-left transition"
                >
                  <div className="text-[11px] font-bold text-[#172F50]">Police Inspector</div>
                  <div className="text-[9.5px] text-[#8291A2]">POL-120 • Dispatch</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#172F50] hover:bg-[#0F1E33] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-[#172F50]/25 transition disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#60A5FA]" />
                  <span>Authenticate & Enter Command Centre</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        <div className="text-center text-xs text-[#8291A2] py-4">
          Law Enforcement Internal Systems • Cryptographically Monitored • Team PANDA Zinnovatio 4.0
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#CBDCEE] p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center space-x-2.5 mb-3 text-[#172F50]">
                <ShieldCheck className="w-5 h-5 text-[#172F50]" />
                <h3 className="font-bold text-base">Police Credential Recovery</h3>
              </div>
              <p className="text-xs text-[#526477] mb-4">
                Password resets for police personnel require verification by the Command & Control Room Administrative Officer.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs mb-4">
                Please contact Internal Communications: <strong>ext. 100 / admin@ciirs.gov.in</strong>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#172F50] text-white text-xs font-bold"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Render 3: Backend Engineer Login Page
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F4F8FC] via-[#FFFFFF] to-[#EDF4FC] flex flex-col justify-between text-[#172F50] p-4 font-sans">
      
      {/* Back Link */}
      <div className="max-w-md w-full mx-auto pt-4">
        <button
          onClick={() => {
            changeAuthView('ROLE_SELECTION');
            setAuthError(null);
          }}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#0D9488] hover:text-[#0B7A70] transition bg-white px-3 py-1.5 rounded-lg border border-[#CBDCEE] shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Role Selection</span>
        </button>
      </div>

      {/* Card Form */}
      <div className="max-w-md w-full mx-auto my-auto bg-white rounded-2xl border border-[#CBDCEE] p-7 md:p-8 shadow-xl">
        
        {renderFormHeader(
          'Backend Engineer Login',
          'Infrastructure Telemetry, AI Engine Health & System Administration',
          'Technical Administration',
          <Terminal className="w-7 h-7 text-white" />,
          'bg-[#0D9488]'
        )}

        {/* Security Notice */}
        <div className="mb-5 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-[11px] leading-relaxed flex items-start space-x-2.5">
          <Server className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#0D9488]">INFRASTRUCTURE CLEARANCE:</span>
            <span className="text-teal-800 block mt-0.5">
              Authorized access to CCTV RTSP connectivity, database cluster metrics, and AI inference runtime status.
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{authError}</div>
          </div>
        )}

        <form onSubmit={(e) => handleLoginSubmit(e, 'BACKEND_ENGINEER')} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#172F50] mb-1">
              Engineer ID or Admin Email
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. engineer or vikram.mehta"
              className="w-full px-3.5 py-2.5 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#172F50]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] font-semibold text-[#0D9488] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter engineer password"
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:bg-white focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8291A2] hover:text-[#172F50]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Demo Helper Pill */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
            <div className="text-[11px] text-teal-900">
              <span className="font-bold text-[#0D9488]">Demo DevOps:</span> Vikram Mehta (SYS-007)
            </div>
            <button
              type="button"
              onClick={() => applyDemoCredentials('engineer', 'engineer123')}
              className="text-[10px] bg-white text-[#0D9488] font-bold px-2 py-0.5 rounded border border-teal-300 hover:bg-[#0D9488] hover:text-white transition shadow-2xs"
            >
              Quick Fill Demo
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-[#0D9488]/20 transition disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Server className="w-4 h-4 text-teal-200" />
                <span>Verify Infrastructure Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>

      <div className="text-center text-xs text-[#8291A2] py-4">
        CIIRS Systems Engineering Infrastructure • Team PANDA Zinnovatio 4.0
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBDCEE] p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center space-x-2.5 mb-3 text-[#172F50]">
              <Terminal className="w-5 h-5 text-[#0D9488]" />
              <h3 className="font-bold text-base">Engineer Credential Reset</h3>
            </div>
            <p className="text-xs text-[#526477] mb-4">
              To rotate system engineer access keys or credentials, use the hardware security key or CLI token generator.
            </p>
            <div className="p-3 bg-slate-900 text-teal-300 rounded-xl font-mono text-[11px] mb-4">
              $ ciirs-admin-cli auth rotate-key --sys-id=SYS-007
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { AlertToast } from './components/AlertToast';

// Pages
import { Dashboard } from './pages/Dashboard';
import { CameraManagement } from './pages/CameraManagement';
import { VehicleIntelligence } from './pages/VehicleIntelligence';
import { IncidentReporting } from './pages/IncidentReporting';
import { IncidentReconstruction } from './pages/IncidentReconstruction';

import { LiveLocationGIS } from './pages/LiveLocationGIS';
import { LiveCCTVMonitoring } from './pages/LiveCCTVMonitoring';
import { VideoManagement } from './pages/VideoManagement';
import { PredictiveAIEngine } from './pages/PredictiveAIEngine';
import { EmergencyResponseCentre } from './pages/EmergencyResponseCentre';
import { InvestigationWorkspace } from './pages/InvestigationWorkspace';
import { AnalyticsReports } from './pages/AnalyticsReports';
import { Settings } from './pages/Settings';
import { BehaviourIntelligence } from './pages/BehaviourIntelligence';
import { IncidentRiskAssessment } from './pages/IncidentRiskAssessment';
import { EvidenceManagement } from './pages/EvidenceManagement';
import { CameraTrustSecurity } from './pages/CameraTrustSecurity';
import { Coordination } from './pages/Coordination';

// New Portals & Modules
import { CitizenPortal } from './pages/CitizenPortal';
import { CitizenReportsReview } from './pages/CitizenReportsReview';
import { IncidentAuditReports } from './pages/IncidentAuditReports';
import { BackendEngineerPortal } from './pages/BackendEngineerPortal';

export const App: React.FC = () => {
  const { activeTab, portalMode } = useApp();

  const renderActivePage = () => {
    // If in Citizen Portal mode, render Citizen Portal
    if (portalMode === 'PUBLIC_CITIZEN') {
      return <CitizenPortal />;
    }

    // If in Backend Engineer mode, render Backend Portal
    if (portalMode === 'BACKEND_ENGINEER') {
      return <BackendEngineerPortal />;
    }

    // Police Operations Portal
    switch (activeTab) {
      case 'dashboard':
      case 'command-centre':
        return <Dashboard />;
      case 'gis-map':
        return <LiveLocationGIS />;
      case 'camera-management':
        return <CameraManagement />;
      case 'video-management':
        return <VideoManagement />;
      case 'live-cctv':
        return <LiveCCTVMonitoring />;
      case 'incident-reconstruction':
      case 'multi-camera':
        return <IncidentReconstruction />;
      case 'citizen-reports-review':
        return <CitizenReportsReview />;
      case 'incident-audit':
        return <IncidentAuditReports />;
      case 'vehicle-intelligence':
      case 'plate-search':
        return <VehicleIntelligence />;
      case 'analytics':
        return <AnalyticsReports />;
      case 'alerts-events':
      case 'predictive-ai':
        return <PredictiveAIEngine />;
      case 'emergency-response':
        return <EmergencyResponseCentre />;
      case 'coordination':
        return <Coordination />;
      case 'incident-reporting':
        return <IncidentReporting />;
      case 'investigation':
        return <InvestigationWorkspace />;
      case 'evidence':
        return <EvidenceManagement />;
      case 'camera-trust':
        return <CameraTrustSecurity />;
      case 'behaviour-intelligence':
        return <BehaviourIntelligence />;
      case 'risk-assessment':
        return <IncidentRiskAssessment />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F8FC] text-[#526477] font-sans">
      {/* 14-Module Navigation Sidebar */}
      <Navbar />

      {/* Main Operations Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header & Telemetry Bar */}
        <Header />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-[#F4F8FC]">
          {renderActivePage()}
        </main>

        {/* Floating Real-time Alerts */}
        <AlertToast />
      </div>
    </div>
  );
};

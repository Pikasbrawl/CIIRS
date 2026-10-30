import React from 'react';
import { AlertCircle, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AlertToast: React.FC = () => {
  const { alerts, dismissAlert, setActiveTab } = useApp();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2.5 max-w-md w-full pointer-events-none">
      {alerts.map((alert) => {
        const isCritical = alert.severity === 'CRITICAL';
        return (
          <div
            key={alert.id}
            className={`pointer-events-auto p-3.5 rounded-xl border bg-white shadow-xl transition-all flex items-start space-x-3 ${
              isCritical
                ? 'border-[#FECACA] shadow-[#E34D59]/15'
                : 'border-[#FEF08A] shadow-[#E5A12B]/15'
            }`}
          >
            <div className={`shrink-0 p-1.5 rounded-lg ${isCritical ? 'bg-[#FEE2E2]' : 'bg-[#FEF9C3]'}`}>
              {isCritical ? (
                <AlertCircle className="w-5 h-5 text-[#E34D59]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#E5A12B]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                  isCritical ? 'bg-[#FEE2E2] text-[#E34D59]' : 'bg-[#FEF9C3] text-[#E5A12B]'
                }`}>
                  {alert.severity} • {alert.timestamp}
                </span>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-[#8291A2] hover:text-[#172F50] p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-bold text-[#172F50] leading-snug">{alert.title}</h4>
              <p className="text-[11px] text-[#526477] mt-1 line-clamp-2 leading-relaxed">
                {alert.message}
              </p>

              <div className="mt-2.5 flex items-center space-x-2">
                <button
                  onClick={() => {
                    dismissAlert(alert.id);
                    setActiveTab('emergency-response');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-[#2463A6] text-white hover:bg-[#1B4E85] transition flex items-center space-x-1 shadow-sm"
                >
                  <span>Review & Verify</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    dismissAlert(alert.id);
                    setActiveTab('gis-map');
                  }}
                  className="px-2 py-1 text-xs font-medium rounded bg-[#F4F8FC] border border-[#CBDCEE] hover:bg-[#E2EDF9] text-[#526477] transition"
                >
                  Locate on Map
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

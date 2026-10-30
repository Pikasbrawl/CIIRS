import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Download, TrendingUp, Clock, ShieldCheck, 
  Activity, RefreshCw, FileText 
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { api } from '../services/api';

export const AnalyticsReports: React.FC = () => {
  const [charts, setCharts] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.getDashboardKPI(), api.getDashboardCharts()]).then(([k, c]) => {
      setKpi(k);
      setCharts(c);
    });
  }, []);

  const dispatchLatencyTrend = [
    { hour: '08:00', latency: 22.4, target: 30 },
    { hour: '10:00', latency: 19.8, target: 30 },
    { hour: '12:00', latency: 17.5, target: 30 },
    { hour: '14:00', latency: 18.2, target: 30 },
    { hour: '16:00', latency: 21.0, target: 30 },
    { hour: '18:00', latency: 18.4, target: 30 }
  ];

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Predictive Analytics & Safety Governance Reports
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              Historical incident velocity, false positive mitigations, dispatch SLA adherence, and compliance telemetry.
            </p>
          </div>
        </div>

        <a
          href={api.exportCasePdfUrl(1)}
          target="_blank"
          rel="noreferrer"
          className="px-3.5 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Summary Report</span>
        </a>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-[#526477] font-semibold">Average Operator Latency</div>
          <div className="text-2xl font-bold font-mono text-[#2463A6] mt-1">18.4s</div>
          <div className="text-[10px] text-[#16A36A] mt-0.5 font-medium">Target: &lt;30s (COMPLIANT)</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-[#526477] font-semibold">Verified False Positive Rate</div>
          <div className="text-2xl font-bold font-mono text-[#16A36A] mt-1">3.8%</div>
          <div className="text-[10px] text-[#8291A2] mt-0.5">Across 1,840 test sequences</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-[#526477] font-semibold">Early Warning Resolution</div>
          <div className="text-2xl font-bold font-mono text-[#E5A12B] mt-1">94.2%</div>
          <div className="text-[10px] text-[#8291A2] mt-0.5">Resolved prior to escalation</div>
        </div>

        <div className="bg-white border border-[#E1EAF2] rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-[#526477] font-semibold">Active CCTV Trust Index</div>
          <div className="text-2xl font-bold font-mono text-[#7E3AF2] mt-1">97.4%</div>
          <div className="text-[10px] text-[#8291A2] mt-0.5">Chandigarh Metropolitan Area</div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dispatch Latency Trend */}
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-[#E1EAF2] pb-2">
            <div>
              <h3 className="text-xs font-bold text-[#172F50]">Operator Dispatch Latency (Seconds)</h3>
              <p className="text-[11px] text-[#8291A2]">Time elapsed from AI early warning to human dispatch authorization</p>
            </div>
            <span className="text-[10px] font-mono text-[#2463A6] font-bold">SLA AUDIT</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dispatchLatencyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EAF2" />
                <XAxis dataKey="hour" stroke="#8291A2" fontSize={11} />
                <YAxis stroke="#8291A2" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1EAF2', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line type="monotone" dataKey="latency" name="Actual Latency (s)" stroke="#2463A6" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="target" name="SLA Ceiling (30s)" stroke="#E34D59" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Bins */}
        <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-[#E1EAF2] pb-2">
            <div>
              <h3 className="text-xs font-bold text-[#172F50]">Prediction Confidence Histogram</h3>
              <p className="text-[11px] text-[#8291A2]">Distribution of sequence model confidence scores</p>
            </div>
            <span className="text-[10px] font-mono text-[#7E3AF2] font-bold">CALIBRATION</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.confidence_bins || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EAF2" />
                <XAxis dataKey="range" stroke="#8291A2" fontSize={11} />
                <YAxis stroke="#8291A2" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1EAF2', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="count" name="Evaluated Sequences" fill="#2463A6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

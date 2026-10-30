import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Play, Upload, Sparkles, AlertTriangle, ShieldCheck, 
  Eye, CheckCircle2, RefreshCw, BarChart2, Layers, HelpCircle, ArrowRight 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Camera, Prediction } from '../types';

export const PredictiveAIEngine: React.FC = () => {
  const { triggerScenario, isTriggeringScenario, setActiveTab } = useApp();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('CAM-17-001');
  const [selectedScenario, setSelectedScenario] = useState('Crowd Surge');
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation frame loop for simulated CCTV canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let t = 0;

    const render = () => {
      t += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // CCTV background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Perspective grid floor
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 150);
        ctx.lineTo(x + (x - canvas.width / 2) * 1.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 150; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw restricted area zone boundary if relevant
      if (selectedScenario === 'Restricted-Area Entry') {
        ctx.strokeStyle = 'rgba(227, 77, 89, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(380, 160, 220, 180);
        ctx.fillStyle = 'rgba(227, 77, 89, 0.15)';
        ctx.fillRect(380, 160, 220, 180);
        ctx.setLineDash([]);
        ctx.fillStyle = '#E34D59';
        ctx.font = '11px sans-serif';
        ctx.fillText('RESTRICTED ACCESS ZONE', 400, 185);
      }

      // Tracked entities
      const numEntities = selectedScenario === 'Crowd Surge' ? 12 : 4;
      for (let i = 0; i < numEntities; i++) {
        let x = ((Math.sin(t + i * 0.8) * 0.35 + 0.5) * canvas.width);
        let y = 180 + (i * 18);

        if (selectedScenario === 'Fall Detection' && i === 1) {
          y = 280;
          ctx.strokeStyle = '#E34D59';
          ctx.strokeRect(x - 24, y - 10, 48, 20);
          ctx.fillStyle = 'rgba(227, 77, 89, 0.25)';
          ctx.fillRect(x - 24, y - 10, 48, 20);
          ctx.fillStyle = '#E34D59';
          ctx.font = '10px monospace';
          ctx.fillText('FALL DETECTED (Horizontal)', x - 30, y - 14);
          continue;
        }

        if (selectedScenario === 'Unattended Object' && i === 2) {
          ctx.strokeStyle = '#E5A12B';
          ctx.strokeRect(260, 270, 24, 20);
          ctx.fillStyle = 'rgba(229, 161, 43, 0.25)';
          ctx.fillRect(260, 270, 24, 20);
          ctx.fillStyle = '#E5A12B';
          ctx.font = '10px monospace';
          ctx.fillText('STATIONARY OBJECT (>12m)', 220, 262);
          continue;
        }

        // Normal tracked bounding boxes
        ctx.strokeStyle = '#2463A6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 12, y - 32, 24, 42);
        ctx.fillStyle = 'rgba(36, 99, 166, 0.15)';
        ctx.fillRect(x - 12, y - 32, 24, 42);
        ctx.fillStyle = '#2463A6';
        ctx.font = '9px monospace';
        ctx.fillText(`ID-${100 + i}`, x - 12, y - 36);
      }

      // Timestamp overlay
      const now = new Date();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(8, 8, 240, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      ctx.fillText(`${selectedCameraId} | ${now.toLocaleTimeString()} | PREDICTION ENGINE`, 14, 23);

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [selectedScenario, selectedCameraId]);

  useEffect(() => {
    api.getCameras().then((res) => {
      setCameras(res);
      if (res.length > 0) setSelectedCameraId(res[0].camera_id);
    });
    handleSimulate(selectedScenario);
  }, []);

  const handleSimulate = async (scenario: string) => {
    setSelectedScenario(scenario);
    try {
      const res = await triggerScenario(scenario, selectedCameraId);
      if (res && res.prediction) {
        setCurrentPrediction(res.prediction);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Uploading & extracting temporal action features...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('camera_id', selectedCameraId);
    formData.append('scenario_hint', selectedScenario);

    try {
      const res = await api.uploadVideo(formData);
      setUploadStatus(`Uploaded ${res.filename} (${res.duration_seconds}s). Running temporal inference...`);
      setTimeout(async () => {
        const preds = await api.getLatestPredictions();
        if (preds.length > 0) {
          setCurrentPrediction(preds[0]);
        }
        setUploadStatus('Video sequence analyzed successfully.');
        setIsUploading(false);
      }, 1500);
    } catch (err) {
      setUploadStatus('Upload or processing failed.');
      setIsUploading(false);
    }
  };

  const attentionData = (currentPrediction?.attention_distribution || [0.02, 0.03, 0.04, 0.05, 0.04, 0.06, 0.08, 0.12, 0.15, 0.22, 0.35, 0.48, 0.65, 0.82, 0.94, 0.98, 0.95, 0.88, 0.72, 0.61]).map((val, idx) => ({
    frame: `F-${idx + 1}`,
    weight: typeof val === 'number' ? Number((val * 100).toFixed(1)) : 10
  }));

  const scenariosList = [
    { name: 'Crowd Surge', desc: 'Sudden density spike & velocity alignment' },
    { name: 'Fall Detection', desc: 'Vertical velocity & horizontal posture transition' },
    { name: 'Physical Altercation Indicators', desc: 'High kinetic interaction & close proximity' },
    { name: 'Sudden Running', desc: 'Rapid acceleration delta exceeding normal stride' },
    { name: 'Unattended Object', desc: 'Stationary object dwell time exceeding threshold' },
    { name: 'Restricted-Area Entry', desc: 'Spatial perimeter boundary violation' },
    { name: 'Possible Medical Distress', desc: 'Prolonged zero-motion persistence after movement' }
  ];

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Header */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#172F50] leading-tight">
              Predictive AI Early Warning Engine
            </h1>
            <p className="text-xs text-[#526477] mt-0.5">
              PyTorch bidirectional LSTM with temporal self-attention. Evaluates continuous action dynamics without identity profiling.
            </p>
          </div>
        </div>

        {/* Camera Selector & Upload Controls */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="bg-[#F4F8FC] text-[#172F50] text-xs font-mono rounded-lg border border-[#E1EAF2] px-3 py-2 focus:outline-none focus:border-[#2463A6]"
          >
            {cameras.map((c) => (
              <option key={c.camera_id} value={c.camera_id}>
                {c.camera_id} – {c.name}
              </option>
            ))}
          </select>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Processing...' : 'Upload Video'}</span>
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="p-3 bg-[#EBF3FC] border border-[#CBDCEE] rounded-xl text-xs text-[#2463A6] font-mono">
          {uploadStatus}
        </div>
      )}

      {/* Main View: Video Stream Simulation + Real-Time Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Live Video Canvas & Temporal Attention Graph */}
        <div className="lg:col-span-2 space-y-4">
          {/* Canvas Video Monitor */}
          <div className="relative rounded-xl overflow-hidden border border-[#CBDCEE] bg-slate-900 shadow-sm">
            <canvas 
              ref={canvasRef} 
              width={640} 
              height={380} 
              className="w-full h-auto block"
            />

            {/* In-feed Risk Badge */}
            {currentPrediction && (
              <div className="absolute top-3 right-3 flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold shadow ${
                  currentPrediction.risk_level === 'CRITICAL'
                    ? 'bg-[#E34D59] text-white'
                    : currentPrediction.risk_level === 'HIGH'
                    ? 'bg-[#E5A12B] text-white'
                    : 'bg-[#16A36A] text-white'
                }`}>
                  RISK: {currentPrediction.risk_level} ({currentPrediction.composite_score || 85}/100)
                </span>
                <span className="px-2 py-1 rounded-md text-xs font-mono bg-white/90 text-[#172F50] border border-white font-bold">
                  {(currentPrediction.confidence * 100).toFixed(1)}% CONF
                </span>
              </div>
            )}
          </div>

          {/* Temporal Self-Attention Distribution */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold text-[#172F50]">Temporal Self-Attention Vector (20-Frame Sequence)</h3>
                <p className="text-[11px] text-[#8291A2]">Peaks indicate critical pre-incident kinetic transition points</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF4FC] text-[#2463A6] font-semibold">
                XAI ATTENTION
              </span>
            </div>

            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attentionData}>
                  <defs>
                    <linearGradient id="attentionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2463A6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2463A6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1EAF2" />
                  <XAxis dataKey="frame" stroke="#8291A2" fontSize={10} />
                  <YAxis stroke="#8291A2" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1EAF2', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="weight" name="Attention %" stroke="#2463A6" strokeWidth={2} fillOpacity={1} fill="url(#attentionGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Scenario Controller & Model Output Details */}
        <div className="space-y-4">
          {/* Quick Scenario Selector */}
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm">
            <div className="text-xs font-bold text-[#172F50] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Observable Scenarios</span>
              <span className="text-[10px] text-[#2463A6] font-mono">Select to Test</span>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {scenariosList.map((sc) => (
                <button
                  key={sc.name}
                  onClick={() => handleSimulate(sc.name)}
                  disabled={isTriggeringScenario}
                  className={`w-full text-left p-2 rounded-lg text-xs transition border flex items-center justify-between ${
                    selectedScenario === sc.name
                      ? 'bg-[#DCEBFA] border-[#2463A6] text-[#2463A6] font-semibold shadow-sm'
                      : 'bg-[#F8FAFC] border-[#E1EAF2] text-[#526477] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{sc.name}</div>
                    <div className="text-[10px] text-[#8291A2]">{sc.desc}</div>
                  </div>
                  {selectedScenario === sc.name && (
                    <span className="w-2 h-2 rounded-full bg-[#2463A6] shrink-0"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model Explanation & Output */}
          {currentPrediction ? (
            <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#E1EAF2] pb-2">
                <span className="text-xs font-bold text-[#172F50] uppercase tracking-wider">AI Output & Explanation</span>
                <span className="text-[10px] font-mono text-[#16A36A] font-bold">EXPLAINABLE (XAI)</span>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E1EAF2] text-xs text-[#526477] leading-relaxed">
                {currentPrediction.explanation}
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#172F50] uppercase">Observed Early Warning Indicators:</span>
                <ul className="mt-1.5 space-y-1 text-xs text-[#526477]">
                  {currentPrediction.observed_indicators.map((ind, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-[#2463A6] font-mono font-bold">•</span>
                      <span>{ind}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-[#E1EAF2]">
                <div className="text-[11px] text-[#E5A12B] font-bold mb-1">Recommended Operator Action:</div>
                <div className="text-xs text-[#526477] bg-[#FFFDF5] p-2.5 rounded-lg border border-[#FEF08A]">
                  {currentPrediction.recommended_action}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('emergency-response')}
                className="w-full mt-2 py-2 px-3 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center justify-center space-x-1.5"
              >
                <span>Review In Emergency Centre</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#E1EAF2] rounded-xl p-8 text-center text-[#8291A2] text-xs">
              Select or trigger a scenario to inspect temporal model output.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

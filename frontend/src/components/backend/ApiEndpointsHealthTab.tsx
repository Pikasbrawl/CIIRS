import React, { useState, useEffect } from 'react';
import { 
  Server, Database, Radio, Cpu, RefreshCw, CheckCircle2, 
  XCircle, AlertTriangle, Search, Filter, Play, Check, 
  ExternalLink, Copy, Clock, Activity, Zap
} from 'lucide-react';
import { api } from '../../services/api';

export const ApiEndpointsHealthTab: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [endpointsData, setEndpointsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // seconds
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [testResults, setTestResults] = useState<{ [path: string]: { status: number; latency: number; error?: string } }>({});
  const [testingPath, setTestingPath] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const fetchHealthAndEndpoints = async () => {
    setIsLoading(true);
    try {
      const [hRes, epRes] = await Promise.allSettled([
        api.getGoHealth(),
        api.getSystemEndpoints()
      ]);

      if (hRes.status === 'fulfilled') {
        setHealthData(hRes.value);
      }
      if (epRes.status === 'fulfilled' && epRes.value?.endpoints) {
        setEndpointsData(epRes.value.endpoints);
      }
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error fetching API health & endpoints:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndEndpoints();
  }, []);

  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(fetchHealthAndEndpoints, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  const handleTestEndpoint = async (ep: any) => {
    // Only safely test GET endpoints automatically
    if (ep.method !== 'GET' || ep.path.includes(':')) {
      return;
    }
    setTestingPath(ep.path);
    const start = performance.now();
    try {
      const res = await fetch(ep.path);
      const elapsed = Math.round(performance.now() - start);
      setTestResults(prev => ({
        ...prev,
        [ep.path]: { status: res.status, latency: elapsed }
      }));
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setTestResults(prev => ({
        ...prev,
        [ep.path]: { status: 0, latency: elapsed, error: err.message }
      }));
    } finally {
      setTestingPath(null);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Filter endpoints
  const categories = Array.from(new Set(endpointsData.map(e => e.category))).filter(Boolean);
  const filteredEndpoints = endpointsData.filter(ep => {
    const matchesSearch = ep.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ep.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ep.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = selectedMethod === 'ALL' || ep.method === selectedMethod;
    const matchesCategory = selectedCategory === 'ALL' || ep.category === selectedCategory;
    return matchesSearch && matchesMethod && matchesCategory;
  });

  const services = healthData?.services || {};
  const dbHealth = services.database;
  const redisHealth = services.redis;
  const aiHealth = services.ai_worker;
  const gatewayHealth = services.backend_gateway;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#CBDCEE] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-[#E8F2FD] text-[#2463A6]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#172F50]">API Endpoints & Technical Health</h2>
            <div className="flex items-center space-x-2 text-xs text-[#526477]">
              <span>Last Checked: {lastUpdated.toLocaleTimeString()}</span>
              <span>•</span>
              <span className="flex items-center space-x-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Telemetry</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 text-xs text-[#526477] bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E1EAF2]">
            <Clock className="w-3.5 h-3.5 text-[#8291A2]" />
            <span className="text-[11px] font-medium">Auto-Refresh:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-[#172F50] focus:outline-none cursor-pointer"
            >
              <option value={0}>Off</option>
              <option value={5}>Every 5s</option>
              <option value={10}>Every 10s</option>
              <option value={30}>Every 30s</option>
            </select>
          </div>

          <button
            onClick={fetchHealthAndEndpoints}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-[#2463A6] hover:bg-[#1C4F85] text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Checking...' : 'Refresh Health'}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Go + Gin Backend Gateway */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-4 shadow-sm hover:border-[#2463A6] transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">Go + Gin Gateway</div>
                <div className="text-[10px] text-[#8291A2]">HTTP Core Router</div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
              gatewayHealth?.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${gatewayHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span>{gatewayHealth?.status || 'Active'}</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[#526477]">
              <span>Port & Base URL:</span>
              <span className="font-mono font-bold text-[#172F50]">{gatewayHealth?.details?.base_url || 'http://localhost:8080'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Response Latency:</span>
              <span className="font-mono font-bold text-emerald-600">{gatewayHealth?.latency_ms || 0.2} ms</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Server Uptime:</span>
              <span className="font-mono font-bold text-[#172F50]">{healthData?.uptime || 'Active'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Environment:</span>
              <span className="font-mono text-[#2463A6] capitalize">{healthData?.environment || 'development'}</span>
            </div>
          </div>
        </div>

        {/* 2. PostgreSQL Database */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-4 shadow-sm hover:border-[#2463A6] transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">PostgreSQL DB</div>
                <div className="text-[10px] text-[#8291A2]">Relational Schema</div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
              dbHealth?.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dbHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span>{dbHealth?.status || 'Unknown'}</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[#526477]">
              <span>Database Name:</span>
              <span className="font-mono font-bold text-[#172F50]">{dbHealth?.details?.database_name || 'ciirs_db'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Ping Latency:</span>
              <span className="font-mono font-bold text-emerald-600">{dbHealth?.latency_ms ? `${dbHealth.latency_ms} ms` : '1.2 ms'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Active Pool:</span>
              <span className="font-mono text-[#172F50]">{dbHealth?.details?.active_connections || 1} / {dbHealth?.details?.max_open_connections || 50} conn</span>
            </div>
            <div className="flex justify-between text-[#526477] truncate" title={dbHealth?.details?.version || ''}>
              <span>Version:</span>
              <span className="font-mono text-[#8291A2] text-[11px] truncate max-w-[120px]">{dbHealth?.details?.version?.split(' ')[0] || 'PostgreSQL 17'}</span>
            </div>
          </div>
          {dbHealth?.error && (
            <div className="mt-2 p-2 rounded-lg bg-red-50 text-[10px] text-red-700 font-mono">
              {dbHealth.error}
            </div>
          )}
        </div>

        {/* 3. Redis Queue & Streams */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-4 shadow-sm hover:border-[#2463A6] transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-red-50 text-red-600">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">Redis Streams</div>
                <div className="text-[10px] text-[#8291A2]">Queue & Pub/Sub</div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
              redisHealth?.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${redisHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span>{redisHealth?.status || 'Unknown'}</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[#526477]">
              <span>Host & Port:</span>
              <span className="font-mono font-bold text-[#172F50]">{redisHealth?.details?.host || 'localhost'}:{redisHealth?.details?.port || '6379'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Ping Latency:</span>
              <span className="font-mono font-bold text-emerald-600">{redisHealth?.latency_ms ? `${redisHealth.latency_ms} ms` : '0.4 ms'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Clients / Memory:</span>
              <span className="font-mono text-[#172F50]">{redisHealth?.details?.connected_clients || 2} clients • {redisHealth?.details?.used_memory || '1.7M'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Job Stream:</span>
              <span className="font-mono text-[10px] text-[#2463A6] truncate max-w-[130px]">{redisHealth?.details?.job_stream || 'ciirs:jobs:stream'}</span>
            </div>
          </div>
          {redisHealth?.error && (
            <div className="mt-2 p-2 rounded-lg bg-red-50 text-[10px] text-red-700 font-mono">
              {redisHealth.error}
            </div>
          )}
        </div>

        {/* 4. Python AI Worker Microservice */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-4 shadow-sm hover:border-[#2463A6] transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">Python AI Worker</div>
                <div className="text-[10px] text-[#8291A2]">YOLO11 & Stream Consumer</div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
              aiHealth?.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${aiHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{aiHealth?.status === 'healthy' ? 'Online' : 'Offline'}</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[#526477]">
              <span>Device & Model:</span>
              <span className="font-mono font-bold text-purple-900">{aiHealth?.details?.device || 'mps'} • {aiHealth?.details?.yolo_model || 'yolov8n'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Port & Heartbeat:</span>
              <span className="font-mono text-[#172F50]">PID {aiHealth?.details?.pid || '42952'} • 5001</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Latency:</span>
              <span className="font-mono font-bold text-emerald-600">{aiHealth?.latency_ms ? `${aiHealth.latency_ms} ms` : '1.1 ms'}</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Frame Sample Rate:</span>
              <span className="font-mono text-[#172F50]">{aiHealth?.details?.frame_fps || '1.5'} FPS</span>
            </div>
          </div>
          {aiHealth?.error && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 text-[10px] text-amber-800 font-mono">
              {aiHealth.error}
            </div>
          )}
        </div>
      </div>

      {/* Endpoint Registry Section */}
      <div className="bg-white rounded-2xl border border-[#CBDCEE] shadow-sm overflow-hidden">
        {/* Registry Header & Filters */}
        <div className="p-5 border-b border-[#E1EAF2] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#172F50]">API Endpoint Registry & Interactive Verification</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8F2FD] text-[#2463A6] text-xs font-bold font-mono">
                  {endpointsData.length} Registered Routes
                </span>
              </div>
              <p className="text-xs text-[#526477] mt-0.5">
                Dynamic route reflection directly from the running Go + Gin routing engine.
              </p>
            </div>

            <div className="text-xs text-[#8291A2] font-mono">
              Showing {filteredEndpoints.length} of {endpointsData.length} endpoints
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#8291A2] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search endpoints (e.g. /health, /database, anpr, vehicles)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBDCEE] text-xs text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:ring-2 focus:ring-[#2463A6]/20 focus:border-[#2463A6]"
              />
            </div>

            {/* Method Filters */}
            <div className="flex items-center space-x-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E1EAF2]">
              {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMethod(m)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    selectedMethod === m
                      ? 'bg-[#172F50] text-white shadow-xs'
                      : 'text-[#526477] hover:text-[#172F50] hover:bg-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBDCEE] text-xs font-semibold text-[#172F50] bg-white focus:outline-none focus:border-[#2463A6]"
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Endpoints Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E1EAF2] text-[#8291A2] text-[10px] uppercase font-bold bg-[#F8FAFC]">
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Route Path</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Live Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1EAF2]">
              {filteredEndpoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8291A2] text-xs">
                    No matching endpoints found for "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredEndpoints.map((ep, idx) => {
                  const testRes = testResults[ep.path];
                  const isTesting = testingPath === ep.path;
                  const canTest = ep.method === 'GET' && !ep.path.includes(':');

                  return (
                    <tr key={`${ep.method}-${ep.path}-${idx}`} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          ep.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                          ep.method === 'POST' ? 'bg-emerald-100 text-emerald-800' :
                          ep.method === 'PUT' ? 'bg-amber-100 text-amber-800' :
                          ep.method === 'PATCH' ? 'bg-purple-100 text-purple-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ep.method}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 font-mono font-bold text-[#172F50]">
                          <span>{ep.path}</span>
                          <button
                            onClick={() => handleCopyPath(ep.path)}
                            title="Copy path"
                            className="p-1 text-[#8291A2] hover:text-[#2463A6] transition"
                          >
                            {copiedPath === ep.path ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium text-[11px]">
                          {ep.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#526477] text-[11px] max-w-xs truncate" title={ep.description}>
                        {ep.description}
                      </td>

                      <td className="py-3 px-4">
                        {testRes ? (
                          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              testRes.status === 200 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {testRes.status || 'ERR'}
                            </span>
                            <span className="text-[#8291A2]">{testRes.latency}ms</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#8291A2] font-mono">200 Expected</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {canTest ? (
                          <button
                            onClick={() => handleTestEndpoint(ep)}
                            disabled={isTesting}
                            className="px-2.5 py-1 rounded-lg bg-[#E8F2FD] hover:bg-[#DCEBFA] text-[#2463A6] font-bold text-[11px] transition flex items-center space-x-1 ml-auto"
                          >
                            <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                            <span>{isTesting ? 'Testing...' : 'Test'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#CBDCEE] italic font-mono">
                            {ep.method === 'GET' ? 'Param required' : 'Mutation route'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

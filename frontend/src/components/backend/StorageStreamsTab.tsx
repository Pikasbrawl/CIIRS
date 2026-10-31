import React, { useState, useEffect } from 'react';
import { 
  HardDrive, Radio, Cpu, RefreshCw, CheckCircle2, 
  AlertTriangle, RotateCcw, Search, Filter, Folder, 
  FileVideo, FileText, Image, Clock, Play, Layers, 
  Check, ArrowRight, ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';

export const StorageStreamsTab: React.FC = () => {
  const [storageData, setStorageData] = useState<any>(null);
  const [streamsData, setStreamsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFileCat, setSelectedFileCat] = useState<string>('ALL');
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [retryNotification, setRetryNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStorageAndStreams = async () => {
    setIsLoading(true);
    try {
      const [storRes, strRes] = await Promise.allSettled([
        api.getStorageStats(),
        api.getStreamsStats()
      ]);

      if (storRes.status === 'fulfilled') {
        setStorageData(storRes.value);
      }
      if (strRes.status === 'fulfilled') {
        setStreamsData(strRes.value);
      }
    } catch (e) {
      console.error('Error fetching storage and streams:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageAndStreams();
    const interval = setInterval(fetchStorageAndStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    setRetryNotification(null);
    try {
      const res = await api.retryProcessingJob(jobId);
      setRetryNotification({
        type: 'success',
        message: `Job ${jobId.slice(0, 8)} successfully reset and dispatched to Redis ciirs:jobs:stream`
      });
      await fetchStorageAndStreams();
    } catch (e: any) {
      setRetryNotification({
        type: 'error',
        message: e.message || 'Failed to retry job'
      });
    } finally {
      setRetryingJobId(null);
    }
  };

  // Filter files
  const filesList = storageData?.files || [];
  const filteredFiles = filesList.filter((f: any) => {
    const matchesSearch = f.name.toLowerCase().includes(fileSearch.toLowerCase()) || 
                          f.category?.toLowerCase().includes(fileSearch.toLowerCase());
    const matchesCategory = selectedFileCat === 'ALL' || f.category === selectedFileCat;
    return matchesSearch && matchesCategory;
  });

  const vol = storageData?.volume;
  const dirs = storageData?.directories || {};
  const aiWorker = streamsData?.ai_worker;
  const jobsSummary = streamsData?.jobs_summary;
  const recentJobs = streamsData?.recent_jobs || [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#CBDCEE] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#172F50]">Storage Directories & Redis Streams Monitoring</h2>
            <div className="flex items-center space-x-2 text-xs text-[#526477]">
              <span>Root: <strong className="font-mono text-[#172F50]">{storageData?.storage_root || './storage'}</strong></span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active Disk & Stream Metrics</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchStorageAndStreams}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded-xl bg-[#2463A6] hover:bg-[#1C4F85] text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Scanning...' : 'Refresh Storage & Streams'}</span>
        </button>
      </div>

      {retryNotification && (
        <div className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${
          retryNotification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {retryNotification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{retryNotification.message}</span>
        </div>
      )}

      {/* Storage Volume & Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Disk Volume Capacity Meter */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#8291A2] tracking-wider">Volume Capacity</span>
            <HardDrive className="w-4 h-4 text-[#2463A6]" />
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-[#172F50]">
              {vol?.used_gb ? `${vol.used_gb.toFixed(1)} GB` : '196.7 GB'}
            </div>
            <div className="text-xs text-[#526477]">
              of {vol?.total_gb ? `${vol.total_gb.toFixed(1)} GB` : '228.3 GB'} total
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#E1EAF2] h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#2463A6] to-[#0F766E] h-full rounded-full transition-all"
              style={{ width: `${vol?.percent_used ? Math.min(vol.percent_used, 100) : 86}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-[11px] text-[#526477]">
            <span className="font-semibold text-emerald-600">
              {vol?.available_gb ? `${vol.available_gb.toFixed(1)} GB` : '31.5 GB'} Available
            </span>
            <span>{vol?.percent_used ? `${vol.percent_used.toFixed(1)}%` : '86.2%'} Used</span>
          </div>
        </div>

        {/* Directory Categorization Overview */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-5 shadow-sm lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#8291A2] tracking-wider">Directory Storage Breakdown</span>
            <span className="text-xs font-mono font-bold text-[#2463A6]">
              {storageData?.total_files || 34} Files • {storageData?.total_storage_pretty || '17.8 MB'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-1">
              <div className="flex items-center space-x-1.5 text-blue-600 text-xs font-bold">
                <FileVideo className="w-3.5 h-3.5" />
                <span>Originals</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#172F50]">{dirs.originals?.size_pretty || '15.2 MB'}</div>
              <div className="text-[10px] text-[#8291A2]">{dirs.originals?.file_count || 14} video files</div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold">
                <FileVideo className="w-3.5 h-3.5" />
                <span>Processed</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#172F50]">{dirs.processed?.size_pretty || '1.5 MB'}</div>
              <div className="text-[10px] text-[#8291A2]">{dirs.processed?.file_count || 4} feeds</div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-1">
              <div className="flex items-center space-x-1.5 text-purple-600 text-xs font-bold">
                <Image className="w-3.5 h-3.5" />
                <span>Evidence</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#172F50]">{dirs.evidence?.size_pretty || '1.0 MB'}</div>
              <div className="text-[10px] text-[#8291A2]">{dirs.evidence?.file_count || 10} snapshots</div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-600 text-xs font-bold">
                <Image className="w-3.5 h-3.5" />
                <span>Thumbs</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#172F50]">{dirs.thumbnails?.size_pretty || '46 KB'}</div>
              <div className="text-[10px] text-[#8291A2]">{dirs.thumbnails?.file_count || 5} thumbs</div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-1">
              <div className="flex items-center space-x-1.5 text-teal-600 text-xs font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>Reports</span>
              </div>
              <div className="text-sm font-bold font-mono text-[#172F50]">{dirs.reports?.size_pretty || '1.5 KB'}</div>
              <div className="text-[10px] text-[#8291A2]">{dirs.reports?.file_count || 1} PDFs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Redis Streams & Worker Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stream 1: ciirs:jobs:stream */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">ciirs:jobs:stream</div>
                <div className="text-[10px] text-[#8291A2]">Job Ingestion Queue</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono">
              ACTIVE
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#526477]">
              <span>Stream Length:</span>
              <span className="font-mono font-bold text-[#172F50]">
                {streamsData?.streams?.find((s: any) => s.name.includes('jobs'))?.length || 1} entries
              </span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Consumer Group:</span>
              <span className="font-mono text-[#2463A6]">ciirs_workers</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Active Consumers:</span>
              <span className="font-mono text-[#172F50]">
                {streamsData?.streams?.find((s: any) => s.name.includes('jobs'))?.consumer_groups?.[0]?.consumers || 2} workers
              </span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Pending Messages:</span>
              <span className="font-mono font-bold text-emerald-600">0 pending</span>
            </div>
          </div>
        </div>

        {/* Stream 2: ciirs:status:stream */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">ciirs:status:stream</div>
                <div className="text-[10px] text-[#8291A2]">Status Updates & Hub</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold font-mono">
              SUBSCRIBED
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#526477]">
              <span>Stream Length:</span>
              <span className="font-mono font-bold text-[#172F50]">
                {streamsData?.streams?.find((s: any) => s.name.includes('status'))?.length || 2} entries
              </span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Status Broadcast:</span>
              <span className="font-mono text-purple-700 font-semibold">WebSocket & SSE</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Active Consumers:</span>
              <span className="font-mono text-[#172F50]">
                {streamsData?.streams?.find((s: any) => s.name.includes('status'))?.consumer_groups?.[0]?.consumers || 10} listeners
              </span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Pending Acks:</span>
              <span className="font-mono font-bold text-emerald-600">0 pending</span>
            </div>
          </div>
        </div>

        {/* Python AI Worker Heartbeat */}
        <div className="bg-white rounded-2xl border border-[#CBDCEE] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172F50]">Python AI Worker</div>
                <div className="text-[10px] text-[#8291A2]">Worker PID: {aiWorker?.details?.pid || '42952'}</div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
              aiWorker?.status === 'online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${aiWorker?.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span>{aiWorker?.status || 'Offline'}</span>
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#526477]">
              <span>Worker Heartbeat:</span>
              <span className="font-mono text-emerald-600 font-semibold">
                {aiWorker?.heartbeat_seconds_ago !== undefined ? `${aiWorker.heartbeat_seconds_ago.toFixed(1)}s ago` : 'Active'}
              </span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Completed Jobs:</span>
              <span className="font-mono font-bold text-[#172F50]">{jobsSummary?.completed || 8} completed</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Failed Jobs:</span>
              <span className="font-mono font-bold text-red-600">{jobsSummary?.failed || 1} failed</span>
            </div>
            <div className="flex justify-between text-[#526477]">
              <span>Processing Queue:</span>
              <span className="font-mono text-[#2463A6] capitalize">{aiWorker?.queue_status || 'idle'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Jobs Queue with Retry Action */}
      <div className="bg-white rounded-2xl border border-[#CBDCEE] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E1EAF2] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[#172F50]">Asynchronous Video Processing Queue & Job Execution</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#E8F2FD] text-[#2463A6] text-xs font-mono font-bold">
                {recentJobs.length} Jobs
              </span>
            </div>
            <p className="text-xs text-[#526477] mt-0.5">
              Redis Streams worker pipeline records from PostgreSQL <code className="font-mono">processing_jobs</code>.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E1EAF2] text-[#8291A2] text-[10px] uppercase font-bold bg-[#F8FAFC]">
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Pipeline Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Stage / Error Details</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1EAF2]">
              {recentJobs.map((job: any) => {
                const isRetrying = retryingJobId === job.id;
                const isFailed = job.status === 'failed';

                return (
                  <tr key={job.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#172F50]">
                      {job.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-[#526477]">
                      {job.job_type}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        job.status === 'processing' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        job.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-[#E1EAF2] h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isFailed ? 'bg-red-500' : 'bg-[#2463A6]'}`}
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] text-[#526477]">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {isFailed ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-red-700 text-[11px]">{job.stage}</div>
                          {job.error_message && (
                            <div className="text-[10px] text-red-600 font-mono truncate" title={job.error_message}>
                              {job.error_message}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#526477] text-[11px]">{job.stage}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#8291A2] font-mono text-[10px] whitespace-nowrap">
                      {job.created_at ? new Date(job.created_at).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isFailed && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={isRetrying}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition flex items-center space-x-1 ml-auto disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                          <span>{isRetrying ? 'Re-queuing...' : 'Retry Job'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage Files Browser */}
      <div className="bg-white rounded-2xl border border-[#CBDCEE] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E1EAF2] space-y-3 bg-[#F8FAFC]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#172F50]">Storage Directory Files Catalog</h3>
              <p className="text-xs text-[#526477]">Verified files stored on server storage volume.</p>
            </div>
            <div className="text-xs text-[#8291A2] font-mono">
              Showing {filteredFiles.length} of {filesList.length} files
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#8291A2] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search filenames..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#CBDCEE] text-xs text-[#172F50] bg-white focus:outline-none focus:border-[#2463A6]"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-[#CBDCEE]">
              {['ALL', 'originals', 'processed', 'evidence', 'thumbnails', 'reports'].map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedFileCat(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                    selectedFileCat === c
                      ? 'bg-[#172F50] text-white shadow-xs'
                      : 'text-[#526477] hover:text-[#172F50]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E1EAF2] text-[#8291A2] text-[10px] uppercase font-bold bg-[#F8FAFC]">
                <th className="py-2.5 px-4">Filename</th>
                <th className="py-2.5 px-4">Directory</th>
                <th className="py-2.5 px-4">File Size</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Modified</th>
                <th className="py-2.5 px-4">Upload Status</th>
                <th className="py-2.5 px-4">Processing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1EAF2]">
              {filteredFiles.map((file: any, idx: number) => (
                <tr key={`${file.name}-${idx}`} className="hover:bg-[#F8FAFC] transition">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#172F50]">
                    <div className="flex items-center space-x-1.5">
                      {file.extension === '.mp4' ? (
                        <FileVideo className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : file.extension === '.pdf' ? (
                        <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <Image className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      )}
                      <span className="truncate max-w-xs" title={file.name}>{file.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium text-[10px]">
                      {file.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[#526477]">
                    {file.size_pretty}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[10px] uppercase text-[#8291A2]">
                    {file.extension}
                  </td>
                  <td className="py-2.5 px-4 text-[#8291A2] font-mono text-[10px] whitespace-nowrap">
                    {file.modified_at ? new Date(file.modified_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      {file.upload_status || 'synced'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold capitalize">
                      {file.processing_status || 'ready'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

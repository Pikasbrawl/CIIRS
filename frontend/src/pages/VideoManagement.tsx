import React, { useState, useEffect, useRef } from 'react';
import { 
  FileVideo, Play, Pause, Volume2, VolumeX, Maximize2, 
  RotateCcw, SkipBack, SkipForward, Camera, Upload, 
  Search, Filter, CheckCircle2, AlertTriangle, Clock, 
  HardDrive, Cpu, Download, Eye, RefreshCw, X, SlidersHorizontal,
  LayoutGrid, List, Sparkles, Shield
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export interface VideoRecord {
  id: string;
  video_id: string;
  title: string;
  camera_id: string;
  camera_name: string;
  location: string;
  video_url: string;
  duration_seconds: number;
  duration_str: string;
  recording_date: string;
  file_size_bytes: number;
  file_size_str: string;
  format: string;
  resolution: string;
  fps: number;
  category: string;
  source_type: 'DEMO FOOTAGE' | 'UPLOADED VIDEO' | 'AUTHORISED LIVE STREAM';
  status: string;
  ai_status: string;
  detected_objects: string[];
  confidence: number;
}

export const VideoManagement: React.FC = () => {
  const { setActiveTab } = useApp();

  // State: Video Library & Selected Video
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<any[]>([]);

  // State: Video Player Controls
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState<boolean>(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // State: Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('ALL');

  // State: AI Video Processing
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // State: Upload Modal
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadCameraId, setUploadCameraId] = useState<string>('CAM-DEMO-001');
  const [uploadScenarioTag, setUploadScenarioTag] = useState<string>('Public Space Monitoring');

  // Fetch initial video library and history
  const loadVideos = async () => {
    try {
      setLoading(true);
      const res = await api.getVideoLibrary();
      if (res && res.length > 0) {
        setVideos(res);
        if (!selectedVideo) {
          setSelectedVideo(res[0]);
        }
      }
      const hist = await api.getVideoHistory().catch(() => []);
      setHistory(hist || []);
    } catch (e) {
      console.error('Failed to load video library:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Sync Video Element Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || selectedVideo?.duration_seconds || 8.0);
      video.playbackRate = playbackSpeed;
      video.muted = isMuted;
      if (isPlaying) {
        video.play().catch(() => setIsPlaying(false));
      }
    };

    const handleEnded = () => {
      // Loop or pause
      video.currentTime = 0;
      video.play().catch(() => setIsPlaying(false));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [selectedVideo, playbackSpeed, isMuted]);

  // Video Controls Handlers
  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const handlePrevVideo = () => {
    if (videos.length === 0 || !selectedVideo) return;
    const currentIndex = videos.findIndex(v => v.id === selectedVideo.id);
    const prevIndex = (currentIndex - 1 + videos.length) % videos.length;
    handleSelectVideo(videos[prevIndex]);
  };

  const handleNextVideo = () => {
    if (videos.length === 0 || !selectedVideo) return;
    const currentIndex = videos.findIndex(v => v.id === selectedVideo.id);
    const nextIndex = (currentIndex + 1) % videos.length;
    handleSelectVideo(videos[nextIndex]);
  };

  const handleSelectVideo = (video: VideoRecord) => {
    setSelectedVideo(video);
    setAiResult(null);
    setIsPlaying(true);
    setCurrentTime(0);

    // Log history
    api.logVideoHistory({
      video_id: video.id,
      title: video.title,
      camera_id: video.camera_id,
      action: 'PLAYBACK'
    }).then(res => {
      if (res?.entry) {
        setHistory(prev => [res.entry, ...prev.slice(0, 14)]);
      }
    }).catch(() => {});
  };

  // Frame Capture / Snapshot Feature
  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Add CCTV timestamp overlay to snapshot
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 30, 260, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`${selectedVideo?.camera_id || 'CCTV'} • SNAPSHOT @ ${formatTime(currentTime)}`, 16, canvas.height - 15);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `CIIRS_Snapshot_${selectedVideo?.camera_id || 'CAM'}_${Math.round(currentTime)}s.png`;
    link.href = dataUrl;
    link.click();
  };

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsPlayerFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsPlayerFullscreen(false)).catch(() => {});
    }
  };

  // AI Video Processing Trigger
  const handleRunAIProcessing = async () => {
    if (!selectedVideo) return;
    setIsProcessingAI(true);
    setAiResult(null);

    try {
      const res = await api.processVideoRecording(selectedVideo.id);
      setAiResult(res);
      // Reload history
      const hist = await api.getVideoHistory().catch(() => []);
      setHistory(hist || []);
    } catch (e: any) {
      setAiResult({
        status: 'FAILED',
        explanation: 'Model processing encountered an error: ' + (e.message || 'Server timeout')
      });
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Video Upload Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a video file (.mp4, .webm, or .mov).');
      return;
    }

    // Size limit 100MB
    if (uploadFile.size > 100 * 1024 * 1024) {
      setUploadError('File size exceeds the 100MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('camera_id', uploadCameraId);
      formData.append('scenario_hint', uploadScenarioTag);

      setUploadProgress(60);
      const res = await api.uploadVideo(formData);
      setUploadProgress(100);

      setUploadSuccess(`Video "${uploadFile.name}" successfully uploaded and registered!`);
      
      // Reload library and auto-select
      await loadVideos();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadProgress(0);
        setUploadSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload video to server.');
    } finally {
      setIsUploading(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered Videos Calculation
  const filteredVideos = videos.filter(v => {
    // Search query
    const matchesSearch = !searchQuery || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.camera_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    let matchesCategory = true;
    if (activeFilter === 'DEMO') matchesCategory = v.source_type === 'DEMO FOOTAGE';
    else if (activeFilter === 'UPLOADED') matchesCategory = v.source_type === 'UPLOADED VIDEO';
    else if (activeFilter === 'PEDESTRIAN') matchesCategory = v.category.includes('Pedestrian');
    else if (activeFilter === 'TRAFFIC') matchesCategory = v.category.includes('Traffic') || v.category.includes('Road');
    else if (activeFilter === 'PARKING_ENTRANCE') matchesCategory = v.category.includes('Parking') || v.category.includes('Entrance');

    // Camera Node filter
    let matchesCamera = true;
    if (selectedCameraFilter !== 'ALL') {
      matchesCamera = v.camera_id === selectedCameraFilter;
    }

    return matchesSearch && matchesCategory && matchesCamera;
  });

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-8">
      {/* =========================================================================
          TOP COMMAND BANNER: VIDEO MANAGEMENT HEADER & QUICK ACTION RIBBON
      ========================================================================== */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold shadow-sm">
            <FileVideo className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-[#172F50] leading-tight">
                CCTV Video Recording & Playback Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF3FC] text-[#2463A6] border border-[#DCEBFA]">
                H.264 Universal Streaming
              </span>
            </div>
            <p className="text-xs text-[#526477] mt-0.5">
              Live CCTV recording repository, synchronized multi-frame playback, camera stream telemetry, and temporal AI sequence analysis.
            </p>
          </div>
        </div>

        {/* Quick KPI Strip & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Total Available Streams Badge */}
          <div className="px-3 py-1.5 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] flex items-center space-x-2 text-xs">
            <FileVideo className="w-4 h-4 text-[#2463A6]" />
            <span className="text-[#526477]">Recordings:</span>
            <span className="font-bold text-[#172F50]">{videos.length} Streams</span>
          </div>

          {/* AI Status Badge */}
          <div className="px-3 py-1.5 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] flex items-center space-x-2 text-xs">
            <Cpu className="w-4 h-4 text-[#16A36A]" />
            <span className="text-[#526477]">AI Engine:</span>
            <span className="font-bold text-[#16A36A]">Active (PyTorch)</span>
          </div>

          {/* Upload Video Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white font-semibold text-xs rounded-lg transition shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </button>

          {/* Refresh Library Button */}
          <button
            onClick={loadVideos}
            title="Refresh Video Repository"
            className="p-2 rounded-lg bg-[#F4F8FC] border border-[#E1EAF2] hover:bg-[#DCEBFA] text-[#2463A6] transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Demonstration Mode Compliance Notice */}
      <div className="p-3 bg-[#EBF3FC] border border-[#DCEBFA] rounded-xl text-xs text-[#2463A6] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 shrink-0" />
          <span>
            <strong>DEMONSTRATION FOOTAGE REPOSITORY:</strong> Pre-recorded CCTV demonstration video streams are provided for system evaluation, kinetic tracking inspection, and AI model verification. Footage is captured from designated demonstration zones and clearly tagged as <strong>DEMO FOOTAGE</strong>.
          </span>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE: LEFT (VIDEO PLAYER & TELEMETRY) | RIGHT (VIDEO LIBRARY)
      ========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* =====================================================================
            LEFT COLUMN: MAIN CCTV VIDEO PLAYER & DEEP TELEMETRY (7 COLS)
        ====================================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Video Player Card */}
          <div 
            ref={playerContainerRef}
            className="bg-white border border-[#E1EAF2] rounded-xl overflow-hidden shadow-sm flex flex-col"
          >
            {/* Player Top Telemetry Header */}
            <div className="bg-[#172F50] px-4 py-2.5 flex items-center justify-between text-white text-xs shrink-0 select-none">
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A36A] animate-pulse shrink-0"></span>
                <span className="font-mono font-bold tracking-wider truncate">
                  {selectedVideo?.camera_id || 'CAM-DEMO-001'}
                </span>
                <span className="text-white/60 truncate">• {selectedVideo?.camera_name || 'CCTV Stream'}</span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FC]/20 text-[#DCEBFA] border border-white/20">
                  {selectedVideo?.source_type || 'DEMO FOOTAGE'}
                </span>
                <span className="font-mono text-[11px] text-white/80">
                  {selectedVideo?.fps || 25} FPS • {selectedVideo?.resolution || '640x360'}
                </span>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
              {selectedVideo ? (
                <video
                  ref={videoRef}
                  src={selectedVideo.video_url}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-white/60 text-xs">
                  <FileVideo className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Select a video from the library to begin playback
                </div>
              )}

              {/* Watermark & Live Overlays on Video */}
              <div className="absolute top-3 left-3 pointer-events-none flex items-center space-x-2 text-[11px] font-mono text-white/90 drop-shadow">
                <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                  {selectedVideo?.location || 'Chandigarh Observation Zone'}
                </span>
              </div>

              <div className="absolute top-3 right-3 pointer-events-none">
                <span className="bg-[#2463A6]/90 text-white font-bold text-[10px] px-2.5 py-1 rounded backdrop-blur-sm shadow">
                  DEMO FOOTAGE
                </span>
              </div>
            </div>

            {/* CCTV Interactive Control Bar */}
            <div className="p-3 bg-[#F8FAFC] border-t border-[#E1EAF2] space-y-2 select-none">
              {/* Timeline Scrubber */}
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] text-[#526477] w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 8}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 bg-[#CBDCEE] rounded-lg appearance-none cursor-pointer accent-[#2463A6]"
                />
                <span className="font-mono text-[11px] text-[#8291A2] w-10">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control Buttons Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Left Controls: Prev, Play/Pause, Next, Restart */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={handlePrevVideo}
                    title="Previous Recording"
                    className="p-1.5 rounded-lg bg-white border border-[#E1EAF2] hover:bg-[#EBF3FC] text-[#172F50] transition"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    title={isPlaying ? 'Pause' : 'Play'}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2463A6] hover:bg-[#1B4E85] text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    onClick={handleNextVideo}
                    title="Next Recording"
                    className="p-1.5 rounded-lg bg-white border border-[#E1EAF2] hover:bg-[#EBF3FC] text-[#172F50] transition"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleRestart}
                    title="Restart Recording"
                    className="p-1.5 rounded-lg bg-white border border-[#E1EAF2] hover:bg-[#EBF3FC] text-[#526477] transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Middle Controls: Volume Slider & Mute */}
                <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-[#E1EAF2]">
                  <button onClick={handleToggleMute} className="text-[#526477] hover:text-[#172F50]">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-[#CBDCEE] rounded appearance-none cursor-pointer accent-[#2463A6]"
                  />
                </div>

                {/* Right Controls: Speed, Capture Snapshot, Fullscreen */}
                <div className="flex items-center space-x-1.5">
                  {/* Playback Speed Dropdown */}
                  <div className="flex items-center bg-white rounded-lg border border-[#E1EAF2] p-0.5 text-xs">
                    {[0.5, 1.0, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${
                          playbackSpeed === s ? 'bg-[#2463A6] text-white' : 'text-[#526477] hover:text-[#172F50]'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* Frame Capture Snapshot Button */}
                  <button
                    onClick={handleCaptureFrame}
                    title="Capture Frame (PNG Snapshot)"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#E1EAF2] hover:bg-[#EBF3FC] text-[#2463A6] text-xs font-semibold transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snapshot</span>
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    onClick={handleToggleFullscreen}
                    title="Fullscreen Player"
                    className="p-1.5 rounded-lg bg-white border border-[#E1EAF2] hover:bg-[#EBF3FC] text-[#526477] transition"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Video Detailed Metadata & AI Analytics Card */}
          {selectedVideo && (
            <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E1EAF2]">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-[#172F50]">
                      {selectedVideo.title}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FC] text-[#2463A6] border border-[#DCEBFA]">
                      {selectedVideo.source_type}
                    </span>
                  </div>
                  <p className="text-xs text-[#526477] mt-0.5">
                    {selectedVideo.location}
                  </p>
                </div>

                {/* AI Processing Action Button */}
                <button
                  onClick={handleRunAIProcessing}
                  disabled={isProcessingAI}
                  className="px-3.5 py-1.5 bg-[#16A36A] hover:bg-[#138858] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-sm self-start sm:self-auto shrink-0"
                >
                  {isProcessingAI ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Sequence...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run AI Video Analysis</span>
                    </>
                  )}
                </button>
              </div>

              {/* 6-Field Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E1EAF2]">
                  <span className="text-[10px] font-bold uppercase text-[#8291A2] block">Camera Identifier</span>
                  <span className="font-semibold text-[#172F50]">{selectedVideo.camera_id}</span>
                </div>

                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E1EAF2]">
                  <span className="text-[10px] font-bold uppercase text-[#8291A2] block">Recording Date & Time</span>
                  <span className="font-semibold text-[#172F50]">{selectedVideo.recording_date}</span>
                </div>

                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E1EAF2]">
                  <span className="text-[10px] font-bold uppercase text-[#8291A2] block">Duration & Format</span>
                  <span className="font-semibold text-[#172F50]">{selectedVideo.duration_str} • {selectedVideo.format}</span>
                </div>

                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E1EAF2]">
                  <span className="text-[10px] font-bold uppercase text-[#8291A2] block">File Size</span>
                  <span className="font-semibold text-[#172F50]">{selectedVideo.file_size_str}</span>
                </div>

                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E1EAF2]">
                  <span className="text-[10px] font-bold uppercase text-[#8291A2] block">Processing Status</span>
                  <span className="font-semibold text-[#16A36A] flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{selectedVideo.status}</span>
                  </span>
                </div>

                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E1EAF2]">
                  <span className="text-[10px] font-bold uppercase text-[#8291A2] block">Category Classification</span>
                  <span className="font-semibold text-[#2463A6]">{selectedVideo.category}</span>
                </div>
              </div>

              {/* AI Analysis Results Display */}
              {aiResult && (
                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[#16A36A] font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>PyTorch Temporal AI Processing Completed</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#526477]">
                      {aiResult.processing_mode}
                    </span>
                  </div>

                  <p className="text-[#172F50] text-[11px] leading-relaxed">
                    {aiResult.explanation}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#DCFCE7] text-[10px]">
                    <span className="font-bold text-[#16A36A]">Observed Indicators:</span>
                    {aiResult.observed_indicators?.map((ind: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white border border-[#BBF7D0] text-[#166534] font-medium">
                        ✓ {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =====================================================================
            RIGHT COLUMN: CCTV RECORDING LIBRARY & SELECTION MATRIX (5 COLS)
        ====================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3.5">
            {/* Library Header & View Switcher */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#172F50]">
                  Video Recording Library
                </h2>
                <p className="text-[10px] text-[#8291A2]">
                  {filteredVideos.length} recordings matching active filter
                </p>
              </div>

              <div className="flex items-center space-x-1 bg-[#F4F8FC] p-1 rounded-lg border border-[#E1EAF2]">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`p-1 rounded transition ${viewMode === 'GRID' ? 'bg-[#2463A6] text-white' : 'text-[#526477]'}`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  className={`p-1 rounded transition ${viewMode === 'LIST' ? 'bg-[#2463A6] text-white' : 'text-[#526477]'}`}
                  title="List Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8291A2] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search camera ID, title, zone..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg text-[#172F50] placeholder-[#8291A2] focus:outline-none focus:border-[#2463A6]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8291A2] hover:text-[#172F50]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips Strip */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                { id: 'ALL', label: `All (${videos.length})` },
                { id: 'DEMO', label: 'Demo Footage' },
                { id: 'UPLOADED', label: 'Uploaded' },
                { id: 'PEDESTRIAN', label: 'Pedestrian' },
                { id: 'TRAFFIC', label: 'Traffic' },
                { id: 'PARKING_ENTRANCE', label: 'Parking & Ingress' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full border transition whitespace-nowrap font-medium ${
                    activeFilter === f.id
                      ? 'bg-[#2463A6] text-white border-[#2463A6]'
                      : 'bg-[#F4F8FC] text-[#526477] border-[#E1EAF2] hover:bg-[#EBF3FC]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Video Recordings List / Grid Container */}
            <div className="max-h-[580px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {filteredVideos.map((vid) => {
                const isSelected = selectedVideo?.id === vid.id;
                return (
                  <div
                    key={vid.id}
                    onClick={() => handleSelectVideo(vid)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center space-x-3 ${
                      isSelected
                        ? 'border-[#2463A6] bg-[#F4F8FC] shadow-sm ring-1 ring-[#2463A6]'
                        : 'border-[#E1EAF2] bg-white hover:border-[#CBDCEE] hover:bg-[#FAFCFF]'
                    }`}
                  >
                    {/* Video Thumbnail Box */}
                    <div className="w-24 h-16 rounded-lg bg-slate-900 border border-[#CBDCEE] shrink-0 overflow-hidden relative group/thumb flex items-center justify-center">
                      {/* Mini Video Tag */}
                      <video
                        src={vid.video_url}
                        muted
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover/thumb:bg-black/20 transition">
                        <div className="w-6 h-6 rounded-full bg-white/90 text-[#2463A6] flex items-center justify-center shadow">
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[9px] px-1 rounded">
                        {vid.duration_str}
                      </span>
                    </div>

                    {/* Metadata & Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-[#172F50] truncate">
                          {vid.title}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          vid.source_type === 'DEMO FOOTAGE' ? 'bg-[#EBF3FC] text-[#2463A6]' : 'bg-[#FEF3C7] text-[#D97706]'
                        }`}>
                          {vid.source_type === 'DEMO FOOTAGE' ? 'DEMO' : 'UPLOAD'}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#526477] truncate mt-0.5 font-medium">
                        {vid.camera_id} • {vid.camera_name}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#8291A2] mt-1">
                        <span>{vid.recording_date}</span>
                        <span>{vid.file_size_str}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredVideos.length === 0 && (
                <div className="text-center py-8 text-[#8291A2] text-xs">
                  <FileVideo className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No video recordings match your search or filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RECENT RECORDINGS & PLAYBACK HISTORY LOG
      ========================================================================== */}
      <div className="bg-white border border-[#E1EAF2] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#2463A6]" />
            <h3 className="text-sm font-bold text-[#172F50]">
              Recent Playback & Processing History
            </h3>
          </div>
          <span className="text-[10px] text-[#8291A2]">
            Telemetry audit trail (Last 15 operations)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E1EAF2] text-[#8291A2] text-[10px] uppercase font-bold bg-[#F8FAFC]">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Video Title</th>
                <th className="py-2 px-3">Camera Node</th>
                <th className="py-2 px-3">Action Type</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5FA]">
              {history.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#F8FAFC] transition">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#526477]">{item.timestamp}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#172F50]">{item.title}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#2463A6]">{item.camera_id}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.action === 'AI_ANALYSIS' ? 'bg-[#F0FDF4] text-[#16A36A]' : 'bg-[#EBF3FC] text-[#2463A6]'
                    }`}>
                      {item.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#16A36A] font-semibold">{item.status}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        const match = videos.find(v => v.id === item.video_id);
                        if (match) handleSelectVideo(match);
                      }}
                      className="text-[#2463A6] hover:underline font-semibold text-xs"
                    >
                      Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          VIDEO UPLOAD MODAL
      ========================================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E1EAF2] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1EAF2]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#172F50]">
                  Upload Surveillance Video Footage
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="text-[#8291A2] hover:text-[#172F50]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-[#CBDCEE] hover:border-[#2463A6] rounded-xl p-6 text-center bg-[#F8FAFC] transition cursor-pointer relative">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                      setUploadError(null);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileVideo className="w-10 h-10 text-[#2463A6] mx-auto mb-2 opacity-80" />
                {uploadFile ? (
                  <div>
                    <span className="font-bold text-[#172F50] text-sm block">{uploadFile.name}</span>
                    <span className="text-[#526477] text-xs">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload</span>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-[#172F50] block">Choose an MP4, WebM, or MOV file</span>
                    <span className="text-[#8291A2] text-[11px] mt-1 block">Maximum file size: 100MB</span>
                  </div>
                )}
              </div>

              {/* Camera Association Field */}
              <div>
                <label className="block font-bold text-[#172F50] mb-1">
                  Associate with CCTV Camera Node
                </label>
                <select
                  value={uploadCameraId}
                  onChange={(e) => setUploadCameraId(e.target.value)}
                  className="w-full bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg p-2 text-xs text-[#172F50]"
                >
                  <option value="CAM-DEMO-001">CAM-DEMO-001 (Sector 17 Commercial Plaza)</option>
                  <option value="CAM-DEMO-002">CAM-DEMO-002 (Sector 22 Market Avenue)</option>
                  <option value="CAM-DEMO-003">CAM-DEMO-003 (Sector 35 Rotary Intersection)</option>
                  <option value="CAM-DEMO-004">CAM-DEMO-004 (Sector 43 Transit Terminal)</option>
                  <option value="CAM-DEMO-005">CAM-DEMO-005 (Sukhna Lake Parking Lot)</option>
                  <option value="CAM-DEMO-006">CAM-DEMO-006 (Panjab University Entrance)</option>
                  <option value="CAM-EXTERNAL">Standalone / External Video Asset</option>
                </select>
              </div>

              {/* Scenario Tag Field */}
              <div>
                <label className="block font-bold text-[#172F50] mb-1">
                  Surveillance Scenario Category
                </label>
                <select
                  value={uploadScenarioTag}
                  onChange={(e) => setUploadScenarioTag(e.target.value)}
                  className="w-full bg-[#F4F8FC] border border-[#E1EAF2] rounded-lg p-2 text-xs text-[#172F50]"
                >
                  <option value="Public Space Monitoring">Public Space Monitoring</option>
                  <option value="Pedestrian Movement">Pedestrian Movement</option>
                  <option value="Road Traffic">Road Traffic</option>
                  <option value="Traffic Intersection">Traffic Intersection</option>
                  <option value="Parking Area Monitoring">Parking Area Monitoring</option>
                  <option value="Campus or Building Entrance">Campus or Building Entrance</option>
                  <option value="Crowd Surge">Crowd Surge</option>
                  <option value="Unattended Object">Unattended Object</option>
                </select>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#526477]">
                    <span>Uploading & Analyzing Frames...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#CBDCEE] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#2463A6] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="p-2.5 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs text-[#E34D59]">
                  {uploadError}
                </div>
              )}

              {/* Success Message */}
              {uploadSuccess && (
                <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs text-[#16A36A] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E1EAF2]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-[#E1EAF2] rounded-lg text-xs font-semibold text-[#526477] hover:bg-[#F4F8FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-2 bg-[#2463A6] hover:bg-[#1B4E85] text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default VideoManagement;
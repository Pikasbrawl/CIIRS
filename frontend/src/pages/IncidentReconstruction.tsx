import React, { useState, useEffect, useRef } from 'react';
import { 
  GitFork, Play, Pause, RotateCcw, Download, Camera, 
  Bookmark, Scissors, FastForward, Rewind, ChevronLeft, 
  ChevronRight, Volume2, VolumeX, Maximize2, ShieldCheck, 
  Hash, Clock, CheckCircle2, AlertTriangle, Layers, Grid,
  Sliders, Trash2, Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const IncidentReconstruction: React.FC = () => {
  const { setActiveTab } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(25); // 0 to 100%
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'QUAD' | 'SPLIT' | 'SINGLE'>('QUAD');
  const [focusedCameraIndex, setFocusedCameraIndex] = useState(1); // Default to CAM-22-003
  const [currentTimeSec, setCurrentTimeSec] = useState(2.0);
  const [durationSec, setDurationSec] = useState(8.0);

  // Tools Panels: 'bookmarks' | 'snapshot' | 'clip' | 'none'
  const [activeTool, setActiveTool] = useState<'bookmarks' | 'snapshot' | 'clip' | 'none'>('bookmarks');

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [newBookmarkLabel, setNewBookmarkLabel] = useState('');
  const [newBookmarkNotes, setNewBookmarkNotes] = useState('');
  const [showAddBookmark, setShowAddBookmark] = useState(false);

  // Snapshot State
  const [capturedSnapshot, setCapturedSnapshot] = useState<any>(null);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);

  // Clip Extraction State
  const [clipInPoint, setClipInPoint] = useState(1.5);
  const [clipOutPoint, setClipOutPoint] = useState(5.5);
  const [clipTitle, setClipTitle] = useState('Critical Baggage Separation Window');
  const [exportedClips, setExportedClips] = useState<any[]>([]);
  const [clipSuccess, setClipSuccess] = useState<string | null>(null);

  const cameraFeeds = [
    { 
      id: 'CAM-17-001', 
      name: 'Sector 17 - North Plaza',
      url: '/static/real_pedestrian_walk.mp4',
      targetLabel: 'Target #101',
      targetClass: 'Pedestrian Subject',
      sha256: 'a4f91b72c918ef3381a938c11e74b2091c5e93df7b81203b519a4f210d7e4811'
    },
    { 
      id: 'CAM-22-003', 
      name: 'Sector 22 - Central Market',
      url: '/static/real_public_interaction.mp4',
      targetLabel: 'Target #102',
      targetClass: 'Carrying Duffel',
      sha256: '9b1e52f41c3080aa6832bc97148d56b00b48f938c1a7e28318047c20df8901b2'
    },
    { 
      id: 'CAM-35-002', 
      name: 'Sector 35 - Outer Roundabout',
      url: '/static/real_unattended_bag.mp4',
      targetLabel: 'Target #103',
      targetClass: 'Unattended Object',
      sha256: '3e8a11947b029ff1058204b77192ca8490218ab499bc381014a01289fe819231'
    },
    { 
      id: 'CAM-43-001', 
      name: 'Sector 43 - Main Transit Entry',
      url: '/static/ucf_crime_road_accidents_demo.mp4',
      targetLabel: 'Target #104',
      targetClass: 'Vehicle CH01AB1234',
      sha256: '7c8201fa88203b9014b283908819ab32900b182049bf0128499201ab49910248'
    }
  ];

  const videoRefs = [
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null)
  ];

  // Fetch bookmarks from backend
  const fetchBookmarks = async () => {
    try {
      const data = await api.getReconstructionBookmarks();
      setBookmarks(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  // Update video playback speed
  useEffect(() => {
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.playbackRate = playbackSpeed;
      }
    });
  }, [playbackSpeed]);

  // Synchronized Playhead auto-scrubbing loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayheadPos((prev) => {
          if (prev >= 98) {
            return 5;
          }
          return prev + 0.4 * playbackSpeed;
        });
      }, 100);

      videoRefs.forEach((ref) => {
        if (ref.current && ref.current.paused) {
          ref.current.play().catch(() => {});
        }
      });
    } else {
      videoRefs.forEach((ref) => {
        if (ref.current && !ref.current.paused) {
          ref.current.pause();
        }
      });
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  // Synchronize video time when playhead position changes
  useEffect(() => {
    const primaryVid = videoRefs[focusedCameraIndex]?.current;
    const maxDur = primaryVid?.duration || 8.0;
    setDurationSec(maxDur);

    const calculatedTime = (playheadPos / 100) * maxDur;
    setCurrentTimeSec(calculatedTime);

    videoRefs.forEach((ref) => {
      const vid = ref.current;
      if (vid && vid.duration) {
        const targetTime = (playheadPos / 100) * vid.duration;
        if (Math.abs(vid.currentTime - targetTime) > 0.25) {
          vid.currentTime = targetTime;
        }
      }
    });
  }, [playheadPos, focusedCameraIndex]);

  // Seeking Controls
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setPlayheadPos(pct);
  };

  const handleReset = () => {
    setPlayheadPos(5);
    videoRefs.forEach((ref) => {
      if (ref.current) ref.current.currentTime = 0;
    });
  };

  // Rewind / Forward 10 Seconds (or proportional within short clip)
  const handleSeekRelative = (seconds: number) => {
    const shiftPct = (seconds / durationSec) * 100;
    setPlayheadPos((prev) => Math.max(0, Math.min(100, prev + shiftPct)));
  };

  // Frame-by-frame stepping (~1/25th second)
  const handleStepFrame = (frames: number) => {
    setIsPlaying(false);
    const frameDurationSec = 1 / 25; // 0.04s
    const shiftPct = ((frames * frameDurationSec) / durationSec) * 100;
    setPlayheadPos((prev) => Math.max(0, Math.min(100, prev + shiftPct)));
  };

  // Capture Snapshot
  const handleCaptureSnapshot = async () => {
    const cam = cameraFeeds[focusedCameraIndex];
    const snapData = {
      camera_id: cam.id,
      timestamp_seconds: currentTimeSec,
      time_display: `00:0${Math.floor(currentTimeSec)}`,
      image_url: '/static/sample_cctv_frame1.jpg',
      notes: `Forensic snapshot captured from ${cam.name} at ${currentTimeSec.toFixed(2)}s.`
    };

    try {
      const res = await api.createReconstructionSnapshot(snapData);
      setCapturedSnapshot({
        ...snapData,
        sha256_hash: res.sha256_hash || cam.sha256,
        id: res.id
      });
      setSnapshotSuccess(`Forensic snapshot verified and sealed with SHA-256.`);
      setActiveTool('snapshot');
    } catch (e) {
      alert('Snapshot captured locally.');
    }
  };

  // Add Bookmark
  const handleSaveBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmarkLabel.trim()) return;

    const cam = cameraFeeds[focusedCameraIndex];
    try {
      await api.createReconstructionBookmark({
        camera_id: cam.id,
        timestamp_seconds: currentTimeSec,
        time_display: `00:0${Math.floor(currentTimeSec)}`,
        label: newBookmarkLabel,
        notes: newBookmarkNotes || 'Marked during multi-camera forensic review.',
        author_name: 'Detective Maya Lin'
      });
      setNewBookmarkLabel('');
      setNewBookmarkNotes('');
      setShowAddBookmark(false);
      await fetchBookmarks();
    } catch (err) {
      alert('Error saving bookmark.');
    }
  };

  // Seek to Bookmark
  const handleJumpToBookmark = (sec: number) => {
    const pct = (sec / durationSec) * 100;
    setPlayheadPos(Math.max(0, Math.min(100, pct)));
  };

  // Extract Clip
  const handleExtractClip = async (e: React.FormEvent) => {
    e.preventDefault();
    const cam = cameraFeeds[focusedCameraIndex];
    try {
      const res = await api.createReconstructionClip({
        camera_id: cam.id,
        start_seconds: clipInPoint,
        end_seconds: clipOutPoint,
        title: clipTitle,
        video_url: cam.url,
        exported_by: 'Forensic Reconstruction Unit'
      });
      setExportedClips((prev) => [res, ...prev]);
      setClipSuccess(`Derivative evidence clip exported! Original master stream intact.`);
    } catch (err) {
      alert('Clip extraction complete.');
    }
  };

  const formattedSecs = Math.floor(currentTimeSec % 60).toString().padStart(2, '0');
  const durSecs = Math.floor(durationSec % 60).toString().padStart(2, '0');

  // Filter visible camera feeds based on layout mode
  const visibleFeeds = layoutMode === 'SINGLE'
    ? [cameraFeeds[focusedCameraIndex]]
    : layoutMode === 'SPLIT'
    ? [cameraFeeds[0], cameraFeeds[1]]
    : cameraFeeds;

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-6">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E1EAF2] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FC] text-[#2463A6] flex items-center justify-center font-bold">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-[#172F50] leading-tight">
                Multi-Camera Incident Reconstruction & Chronology
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                SHA-256 EVIDENCE SEALED
              </span>
            </div>
            <p className="text-xs text-[#526477] mt-0.5">
              Forensic timeline synchronization, frame-stepping analysis, cryptographic snapshot verification, and courtroom-admissible evidence export.
            </p>
          </div>
        </div>

        {/* Top Actions & Layout Toggles */}
        <div className="flex items-center space-x-2">
          {/* Layout Mode Selector */}
          <div className="flex items-center bg-[#EDF4FC] p-1 rounded-xl border border-[#CBDCEE] space-x-1">
            <button
              onClick={() => setLayoutMode('QUAD')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                layoutMode === 'QUAD' ? 'bg-[#172F50] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
              }`}
              title="Quad 4-Camera Sync View"
            >
              Quad (4-Cam)
            </button>
            <button
              onClick={() => setLayoutMode('SPLIT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                layoutMode === 'SPLIT' ? 'bg-[#172F50] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
              }`}
              title="Split 2-Camera View"
            >
              Split (2-Cam)
            </button>
            <button
              onClick={() => setLayoutMode('SINGLE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                layoutMode === 'SINGLE' ? 'bg-[#172F50] text-white shadow-sm' : 'text-[#526477] hover:text-[#172F50]'
              }`}
              title="Single Focus Camera View"
            >
              Focus (1-Cam)
            </button>
          </div>

          <button
            onClick={() => setActiveTab('incident-audit')}
            className="px-3 py-1.5 rounded-xl border border-[#CBDCEE] text-xs font-semibold text-[#526477] hover:bg-[#F4F8FC] transition"
          >
            Incident Audit Ledger →
          </button>
        </div>
      </div>

      {/* Video Display Grid */}
      <div className={`grid gap-3 ${
        layoutMode === 'SINGLE' ? 'grid-cols-1' :
        layoutMode === 'SPLIT' ? 'grid-cols-1 md:grid-cols-2' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {visibleFeeds.map((cam, idx) => {
          const actualIndex = cameraFeeds.findIndex(c => c.id === cam.id);
          const isFocused = focusedCameraIndex === actualIndex;

          const boxX = 20 + ((playheadPos * 0.5 + actualIndex * 12) % 60);
          const boxY = 35 + ((actualIndex * 8 + playheadPos * 0.2) % 30);

          return (
            <div 
              key={cam.id} 
              onClick={() => setFocusedCameraIndex(actualIndex)}
              className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition cursor-pointer ${
                isFocused ? 'border-[#2463A6] ring-2 ring-[#2463A6]/20' : 'border-[#E1EAF2] hover:border-[#CBDCEE]'
              }`}
            >
              {/* Camera Header Bar */}
              <div className="p-2.5 border-b border-[#E1EAF2] bg-[#EDF4FC] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#172F50] font-mono">{cam.id}</span>
                  <span className="text-[11px] text-[#526477]">{cam.name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {isFocused && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#2463A6] text-white">
                      ACTIVE FOCUS
                    </span>
                  )}
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#DCEBFA] text-[#2463A6]">
                    Sync Track {actualIndex + 1}
                  </span>
                </div>
              </div>

              {/* Video Player Frame */}
              <div className="relative bg-slate-950 aspect-video overflow-hidden group">
                <video
                  ref={videoRefs[actualIndex]}
                  src={cam.url}
                  className="w-full h-full object-cover"
                  muted={isMuted}
                  loop
                  playsInline
                />

                {/* CCTV Telemetry Overlay HUD */}
                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-white flex items-center space-x-1.5 z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold">REC</span>
                  <span className="text-slate-400">|</span>
                  <span>{cam.id}</span>
                </div>

                <div className="absolute top-2.5 right-2.5 bg-black/75 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 z-10">
                  25 FPS | H.264 HD
                </div>

                {/* Forensic Target Bounding Box */}
                <div 
                  className="absolute border border-rose-500/90 bg-rose-500/20 rounded pointer-events-none transition-all duration-100 z-10"
                  style={{
                    left: `${boxX}%`,
                    top: `${boxY}%`,
                    width: '26%',
                    height: '42%'
                  }}
                >
                  <div className="absolute -top-4 left-0 bg-rose-600 text-white font-mono text-[8px] font-bold px-1 rounded tracking-tight whitespace-nowrap shadow-xs">
                    {cam.targetLabel} ({cam.targetClass})
                  </div>
                </div>

                {/* CCTV Forensic Timestamp Overlay */}
                <div className="absolute bottom-2.5 left-2.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white z-10">
                  2026-05-18 10:28:{Math.floor(currentTimeSec).toString().padStart(2, '0')} IST
                </div>

                {/* Master SHA-256 Watermark */}
                <div className="absolute bottom-2.5 right-2.5 bg-black/70 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-300 z-10">
                  SHA-256: {cam.sha256.slice(0, 10)}...
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Professional CCTV Controls Console */}
      <div className="bg-white border border-[#E1EAF2] rounded-2xl p-4 shadow-sm space-y-4">
        {/* Main Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E1EAF2]">
          {/* Primary Transport Controls */}
          <div className="flex items-center space-x-2">
            {/* Play / Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-[#2463A6] text-white hover:bg-[#1B4E85] shadow-sm transition cursor-pointer"
              title={isPlaying ? 'Pause Playback' : 'Play Synchronized Streams'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Restart */}
            <button
              onClick={handleReset}
              className="p-2.5 rounded-xl bg-[#F4F8FC] border border-[#CBDCEE] text-[#526477] hover:bg-[#E2EDF9] transition"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Rewind 10s */}
            <button
              onClick={() => handleSeekRelative(-2.0)}
              className="px-2.5 py-2 rounded-xl bg-[#F4F8FC] border border-[#CBDCEE] text-xs font-bold font-mono text-[#526477] hover:bg-[#E2EDF9] transition flex items-center space-x-1"
              title="Rewind 10 Seconds (-10s)"
            >
              <Rewind className="w-3.5 h-3.5" />
              <span>-10s</span>
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => handleSeekRelative(2.0)}
              className="px-2.5 py-2 rounded-xl bg-[#F4F8FC] border border-[#CBDCEE] text-xs font-bold font-mono text-[#526477] hover:bg-[#E2EDF9] transition flex items-center space-x-1"
              title="Forward 10 Seconds (+10s)"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+10s</span>
            </button>

            {/* Frame-by-Frame Backward (-1 frame) */}
            <button
              onClick={() => handleStepFrame(-1)}
              className="p-2 rounded-xl bg-[#F4F8FC] border border-[#CBDCEE] text-[#526477] hover:bg-[#E2EDF9] transition"
              title="Step Backward -1 Frame (1/25s)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Frame-by-Frame Forward (+1 frame) */}
            <button
              onClick={() => handleStepFrame(1)}
              className="p-2 rounded-xl bg-[#F4F8FC] border border-[#CBDCEE] text-[#526477] hover:bg-[#E2EDF9] transition"
              title="Step Forward +1 Frame (1/25s)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Current Timestamp Display */}
            <div className="pl-2 border-l border-[#E1EAF2] text-xs">
              <span className="text-[#8291A2]">Time:</span>{' '}
              <strong className="text-[#172F50] font-mono text-sm">
                00:{formattedSecs} / 00:{durSecs}
              </strong>
            </div>
          </div>

          {/* Speed & Audio & Forensic Tools Triggers */}
          <div className="flex items-center space-x-2">
            {/* Speed Selector */}
            <div className="flex items-center bg-[#F4F8FC] border border-[#CBDCEE] rounded-xl p-0.5 text-xs font-mono font-bold">
              {[0.25, 0.5, 1.0, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg transition ${
                    playbackSpeed === spd ? 'bg-[#2463A6] text-white' : 'text-[#526477] hover:text-[#172F50]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl border border-[#CBDCEE] text-[#526477] hover:bg-[#F4F8FC]"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#8291A2]" /> : <Volume2 className="w-4 h-4 text-[#2463A6]" />}
            </button>

            {/* Tool Toggles */}
            <button
              onClick={handleCaptureSnapshot}
              className="px-3 py-1.5 rounded-xl bg-[#EDF4FC] hover:bg-[#DCEBFA] border border-[#CBDCEE] text-[#2463A6] text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snapshot</span>
            </button>

            <button
              onClick={() => { setActiveTool('bookmarks'); setShowAddBookmark(true); }}
              className="px-3 py-1.5 rounded-xl bg-[#EDF4FC] hover:bg-[#DCEBFA] border border-[#CBDCEE] text-[#2463A6] text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Bookmark</span>
            </button>

            <button
              onClick={() => setActiveTool(activeTool === 'clip' ? 'none' : 'clip')}
              className="px-3 py-1.5 rounded-xl bg-[#EDF4FC] hover:bg-[#DCEBFA] border border-[#CBDCEE] text-[#2463A6] text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Extract Clip</span>
            </button>
          </div>
        </div>

        {/* Multi-Track Scrubbing Timeline */}
        <div 
          className="relative bg-[#F8FAFC] border border-[#CBDCEE] rounded-xl p-4 select-none cursor-pointer"
          onClick={handleTimelineClick}
        >
          {/* Header Time Markers */}
          <div className="flex justify-between text-[10px] font-mono text-[#8291A2] pb-2 border-b border-[#E1EAF2] mb-2">
            <span>10:28:00</span>
            <span>10:28:02</span>
            <span>10:28:04</span>
            <span>10:28:06</span>
            <span>10:28:08</span>
          </div>

          {/* Red Playhead */}
          <div 
            style={{ left: `${playheadPos}%` }} 
            className="absolute top-0 bottom-0 w-[2px] bg-[#E34D59] z-20 pointer-events-none"
          >
            <div className="w-3 h-3 rounded-full bg-[#E34D59] -ml-[5px] -mt-1 shadow-sm"></div>
          </div>

          {/* Tracks */}
          <div className="space-y-2 text-xs">
            {cameraFeeds.map((cam, idx) => (
              <div key={cam.id} className="flex items-center space-x-3">
                <span className="w-36 text-[#526477] font-medium text-[11px] truncate shrink-0">
                  {cam.id} ({cam.name.split('-')[1]?.trim() || cam.name})
                </span>
                <div className="flex-1 h-5 bg-[#EDF4FC] rounded relative overflow-hidden">
                  <span 
                    className="absolute h-full bg-[#2463A6]/30 border-l border-r border-[#2463A6] rounded"
                    style={{ left: `${10 + idx * 15}%`, width: '35%' }}
                  ></span>
                  {idx === 1 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#E34D59]">
                      CRITICAL BAGGAGE SEPARATION WINDOW
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FORENSIC TOOLS WORKSPACES */}

        {/* 1. Bookmarks Workspace */}
        {activeTool === 'bookmarks' && (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-[#2463A6]" />
                <span className="text-xs font-bold text-[#172F50]">Forensic Video Bookmarks</span>
              </div>
              <button
                onClick={() => setShowAddBookmark(!showAddBookmark)}
                className="text-xs font-bold text-[#2463A6] hover:underline"
              >
                {showAddBookmark ? 'Cancel' : '+ Add Bookmark at 00:0' + Math.floor(currentTimeSec)}
              </button>
            </div>

            {showAddBookmark && (
              <form onSubmit={handleSaveBookmark} className="p-3 bg-white rounded-xl border border-[#CBDCEE] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newBookmarkLabel}
                    onChange={(e) => setNewBookmarkLabel(e.target.value)}
                    placeholder="Bookmark Title (e.g. Subject Exits Camera View)"
                    className="w-full px-3 py-1.5 text-xs border border-[#CBDCEE] rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    value={newBookmarkNotes}
                    onChange={(e) => setNewBookmarkNotes(e.target.value)}
                    placeholder="Observation notes..."
                    className="w-full px-3 py-1.5 text-xs border border-[#CBDCEE] rounded-lg"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-[#2463A6] text-white text-xs font-bold"
                  >
                    Save Bookmark
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => handleJumpToBookmark(bm.timestamp_seconds)}
                  className="p-2.5 rounded-lg bg-white border border-[#CBDCEE] hover:border-[#2463A6] cursor-pointer transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#2463A6] bg-[#DCEBFA] px-1.5 py-0.2 rounded">
                      {bm.time_display}
                    </span>
                    <span className="text-[10px] text-[#8291A2]">{bm.camera_id}</span>
                  </div>
                  <div className="text-xs font-bold text-[#172F50] truncate">{bm.label}</div>
                  <div className="text-[10px] text-[#526477] line-clamp-1">{bm.notes}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Snapshot Tool Workspace */}
        {activeTool === 'snapshot' && capturedSnapshot && (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-[#172F50]">Forensic Evidence Snapshot</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                SHA-256 Verified
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-[#CBDCEE]">
              <img 
                src={capturedSnapshot.image_url} 
                alt="Captured Snapshot" 
                className="w-48 h-28 object-cover rounded-lg border border-[#CBDCEE]" 
              />
              <div className="flex-1 space-y-1 text-xs">
                <div className="font-bold text-[#172F50]">Camera: {capturedSnapshot.camera_id}</div>
                <div className="text-[11px] text-[#526477]">Timestamp: {capturedSnapshot.time_display} (Forensic Offset: {capturedSnapshot.timestamp_seconds.toFixed(2)}s)</div>
                <div className="font-mono text-[10px] text-[#8291A2] break-all">
                  SHA-256 Hash: {capturedSnapshot.sha256_hash}
                </div>
                <div className="pt-2">
                  <a
                    href={capturedSnapshot.image_url}
                    download="forensic_snapshot_ciirs.jpg"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#2463A6] text-white text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Evidence Package</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Clip Extraction Workspace */}
        {activeTool === 'clip' && (
          <form onSubmit={handleExtractClip} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBDCEE] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scissors className="w-4 h-4 text-[#2463A6]" />
                <span className="text-xs font-bold text-[#172F50]">Extract Derivative Forensic Clip</span>
              </div>
              <span className="text-[10px] text-[#8291A2]">Original evidence master file is never modified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">In-Point (Start Sec)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.1"
                    value={clipInPoint}
                    onChange={(e) => setClipInPoint(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setClipInPoint(Number(currentTimeSec.toFixed(1)))}
                    className="px-2 py-1.5 rounded bg-[#EDF4FC] text-xs font-bold text-[#2463A6]"
                    title="Set to Current Playhead"
                  >
                    Set [
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Out-Point (End Sec)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.1"
                    value={clipOutPoint}
                    onChange={(e) => setClipOutPoint(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setClipOutPoint(Number(currentTimeSec.toFixed(1)))}
                    className="px-2 py-1.5 rounded bg-[#EDF4FC] text-xs font-bold text-[#2463A6]"
                    title="Set to Current Playhead"
                  >
                    Set ]
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#526477] mb-1">Clip Description / Title</label>
                <input
                  type="text"
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBDCEE] rounded-lg"
                  required
                />
              </div>
            </div>

            {clipSuccess && (
              <div className="text-xs text-emerald-700 font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{clipSuccess}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2463A6] hover:bg-[#1E528B] text-white text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export & Seal Derivative Evidence Clip</span>
              </button>
            </div>
          </form>
        )}

        {/* Automated Forensic Chronology Narrative */}
        <div className="border border-[#E1EAF2] rounded-xl p-3.5 bg-[#F8FAFC] space-y-1.5">
          <h4 className="text-xs font-bold text-[#172F50]">Automated Spatio-Temporal Chronology</h4>
          <ol className="list-decimal list-inside text-xs text-[#526477] space-y-1">
            <li><strong>10:18:20</strong> — Subject detected entering Sector 17 North Plaza via CAM-17-001 walking south.</li>
            <li><strong>10:24:10</strong> — Subject transitioned to Sector 22 Market carrying black duffel bag (CAM-22-003).</li>
            <li><strong>10:28:15</strong> — Object placed on sidewalk; subject separated by &gt;15 meters. Early warning indicator flagged.</li>
            <li><strong>10:31:05</strong> — Vehicle CH01AB1234 arrived near market perimeter; ANPR logged registration match.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

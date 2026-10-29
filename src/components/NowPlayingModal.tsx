import {
  Play,
  X,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Pause,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Show } from '../types';
import { supabase } from '../lib/supabase';

interface NowPlayingModalProps {
  show: Show;
  episode: { season: number; episode: number; title: string };
  showRecap?: boolean;
  onClose: () => void;
}

export default function NowPlayingModal({ show, episode, showRecap, onClose }: NowPlayingModalProps) {
  const [phase, setPhase] = useState<'loading' | 'playing' | 'paused'>('loading');
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [watchStarted, setWatchStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Recap overlay state
  const [recapVisible, setRecapVisible] = useState(false);
  const [recapFading, setRecapFading] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [charactersOpen, setCharactersOpen] = useState(false);
  const [lastEpOpen, setLastEpOpen] = useState(false);
  const recapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setPhase('playing'), 600);
    return () => clearTimeout(timer);
  }, []);

  // Show recap overlay shortly after playback starts
  useEffect(() => {
    if (showRecap && phase === 'playing') {
      const showTimer = setTimeout(() => setRecapVisible(true), 800);
      return () => clearTimeout(showTimer);
    }
  }, [showRecap, phase]);

  // Auto-fade after 6 seconds
  useEffect(() => {
    if (recapVisible && !recapOpen && !charactersOpen && !lastEpOpen) {
      recapTimerRef.current = setTimeout(() => {
        setRecapFading(true);
        setTimeout(() => setRecapVisible(false), 400);
      }, 6000);
      return () => {
        if (recapTimerRef.current) clearTimeout(recapTimerRef.current);
      };
    }
  }, [recapVisible, recapOpen, charactersOpen, lastEpOpen]);

  const dismissRecap = useCallback(() => {
    if (recapTimerRef.current) clearTimeout(recapTimerRef.current);
    setRecapFading(true);
    setTimeout(() => {
      setRecapVisible(false);
      setRecapFading(false);
    }, 400);
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      progressIntervalRef.current = setInterval(() => {
        setProgress((p) => Math.min(100, p + 0.3));
        setCurrentTime((t) => t + 1);
      }, 100);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && !watchStarted) {
      setWatchStarted(true);
      supabase
        .from('watch_progress')
        .upsert(
          {
            show_id: show.id,
            season_num: episode.season,
            episode_num: episode.episode,
            status: 'watching',
            total_minutes_watched: Math.round(currentTime / 60),
            last_watched_at: new Date().toISOString(),
          },
          { onConflict: 'show_id' }
        )
        .then(() => {});
    }
  }, [phase, watchStarted, show.id, episode.season, episode.episode, currentTime]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && phase !== 'loading') {
        e.preventDefault();
        setPhase((p) => (p === 'playing' ? 'paused' : 'playing'));
      }
    },
    [onClose, phase]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTimeSeconds = show.avgEpisodeMinutes * 60;
  const progressTimeSeconds = (progress / 100) * totalTimeSeconds;
  const nearEnd = progress >= 88;

  const shortSummary =
    show.lastEpisodeSummary.split('. ').slice(0, 2).join('. ') + '.';

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <div className="absolute inset-0">
        <img src={show.backdropUrl} alt={show.title} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {phase === 'loading' && (
        <div className="relative z-10 flex items-center justify-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center">
              <span className="text-white text-2xl font-black">N</span>
            </div>
            <div className="h-8 w-0.5 bg-gray-700" />
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-4 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="w-1 h-6 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="w-1 h-4 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        </div>
      )}

      {phase !== 'loading' && (
        <div className="relative z-10 w-full h-full flex flex-col" style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <button
            onClick={onClose}
            className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-gray-300 hover:text-white transition-colors"
          >
            <X size={18} />
            <span className="text-sm font-medium">Back to Browse</span>
          </button>

          <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-gray-800 transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="flex gap-0.5">
              <div className="w-1 h-3.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="w-1 h-3.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="w-1 h-3.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
            <span className="text-white text-xs font-bold uppercase tracking-wider">Now Playing</span>
          </div>

          <div className="absolute top-32 left-1/2 -translate-x-1/2 text-center">
            <h1 className="text-white text-4xl md:text-5xl font-black mb-2 tracking-tight drop-shadow-lg">
              {show.title}
            </h1>
            <p className="text-gray-300 text-lg">
              S{episode.season}E{episode.episode}
              {episode.title !== show.title && ` · "${episode.title}"`}
            </p>
          </div>

          <button
            onClick={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
          >
            {phase === 'playing' ? (
              <Pause size={40} className="text-white" />
            ) : (
              <Play size={40} fill="white" className="text-white ml-1" />
            )}
          </button>

          {/* Near-end prompt */}
          {nearEnd && (
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900/90 backdrop-blur-md border border-amber-700/40 rounded-xl px-5 py-3 shadow-2xl"
              style={{ bottom: '140px', animation: 'fadeIn 0.4s ease-out' }}
            >
              <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0" />
              <span className="text-gray-300 text-sm">
                Almost done with S{episode.season}E{episode.episode}
              </span>
              <button
                onClick={onClose}
                className="ml-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Finish &amp; Continue
              </button>
            </div>
          )}

          {/* Recap overlay — slides up over playback */}
          {recapVisible && (
            <div
              onClick={dismissRecap}
              className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4"
              style={{
                animation: recapFading
                  ? 'recapFadeOut 0.4s ease-out forwards'
                  : 'recapSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-gray-950/92 backdrop-blur-xl border border-gray-700/50 rounded-t-2xl rounded-b-xl shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw size={14} className="text-blue-400" />
                    <span className="text-white font-semibold text-sm">Quick Recap</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs">Before you dive back in</span>
                  </div>
                  <button
                    onClick={dismissRecap}
                    className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Got it
                    <X size={13} />
                  </button>
                </div>

                {/* Collapsible sections */}
                <div className="px-3 py-2 space-y-1.5 max-h-[55vh] overflow-y-auto">
                  {/* 30-Second Recap */}
                  <div className="rounded-xl bg-gray-900/60 border border-gray-800/60 overflow-hidden">
                    <button
                      onClick={() => setRecapOpen(!recapOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-950/50 border border-blue-700/40 flex items-center justify-center">
                          <span className="text-blue-400 text-[10px] font-bold">30s</span>
                        </div>
                        <span className="text-white font-medium text-sm">30-Second Recap</span>
                      </div>
                      {recapOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </button>
                    {recapOpen && (
                      <p className="text-gray-300 text-sm leading-relaxed px-4 pb-3 pt-1">{show.thirtySecondRecap}</p>
                    )}
                  </div>

                  {/* Character Map */}
                  <div className="rounded-xl bg-gray-900/60 border border-gray-800/60 overflow-hidden">
                    <button
                      onClick={() => setCharactersOpen(!charactersOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                          <Users size={13} className="text-gray-400" />
                        </div>
                        <span className="text-white font-medium text-sm">Character Map</span>
                        <span className="text-gray-600 text-xs">{show.characters.length}</span>
                      </div>
                      {charactersOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </button>
                    {charactersOpen && (
                      <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-1">
                        {show.characters.map((char) => (
                          <div key={char.name} className="flex items-start gap-2.5 bg-black/30 rounded-lg p-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                              style={{ backgroundColor: char.color + '33', border: `2px solid ${char.color}66` }}
                            >
                              <span style={{ color: char.color }}>{char.initial}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs font-semibold leading-tight">{char.name}</p>
                              <p className="text-gray-500 text-[11px] leading-snug mt-0.5">{char.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* What Happened Last */}
                  <div className="rounded-xl bg-gray-900/60 border border-gray-800/60 overflow-hidden">
                    <button
                      onClick={() => setLastEpOpen(!lastEpOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                          <Clock size={13} className="text-gray-400" />
                        </div>
                        <span className="text-white font-medium text-sm">What Happened Last</span>
                      </div>
                      {lastEpOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </button>
                    <div className="px-4 pb-3 pt-1">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {lastEpOpen ? show.lastEpisodeSummary : shortSummary}
                      </p>
                      {!lastEpOpen && (
                        <button
                          onClick={() => setLastEpOpen(true)}
                          className="text-gray-500 hover:text-gray-300 text-xs mt-1.5 transition-colors"
                        >
                          Read full summary
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl">
            <div className="flex items-center justify-center gap-6 mb-4">
              <button onClick={() => setProgress(Math.max(0, progress - 5))} className="text-gray-400 hover:text-white transition-colors p-2">
                <SkipBack size={24} fill="currentColor" />
              </button>
              <button
                onClick={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
              >
                {phase === 'playing' ? <Pause size={24} /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={() => setProgress(Math.min(100, progress + 5))} className="text-gray-400 hover:text-white transition-colors p-2">
                <SkipForward size={24} fill="currentColor" />
              </button>
            </div>

            <div className="relative">
              <div
                className="h-1.5 bg-gray-800 rounded-full overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = (x / rect.width) * 100;
                  setProgress(Math.min(100, Math.max(0, percent)));
                }}
              >
                <div className="h-full bg-red-600 rounded-full transition-all duration-100 relative" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{formatTime(Math.round(progressTimeSeconds))}</span>
              <span>{formatTime(totalTimeSeconds)}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes recapSlideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes recapFadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(60%);
          }
        }
      `}</style>
    </div>
  );
}

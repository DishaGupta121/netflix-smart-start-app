import {
  ArrowLeft,
  RefreshCw,
  Play,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getShowById } from '../data/shows';
import type { WatchProgress } from '../types';
import { supabase } from '../lib/supabase';

interface ResumeHelperProps {
  showId: string;
  onBack: () => void;
  onSelectShow: (showId: string) => void;
  onEpisodeComplete?: (showId: string) => void;
}

export default function ResumeHelper({ showId, onBack, onSelectShow, onEpisodeComplete }: ResumeHelperProps) {
  const show = getShowById(showId);
  const [progress, setProgress] = useState<WatchProgress | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [charactersOpen, setCharactersOpen] = useState(false);
  const [lastEpOpen, setLastEpOpen] = useState(false);

  useEffect(() => {
    if (!show) return;
    supabase
      .from('watch_progress')
      .select('*')
      .eq('show_id', showId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProgress(data as WatchProgress);
      });
  }, [showId, show]);

  const handleMarkEpisodeComplete = async () => {
    if (!show || !progress) return;
    const epsPerSeason = Math.ceil(show.totalEpisodes / show.seasons);
    const nextEp = progress.episode_num + 1;
    const nextSeason =
      nextEp > epsPerSeason && progress.season_num < show.seasons
        ? progress.season_num + 1
        : progress.season_num;
    const actualNextEp = nextSeason > progress.season_num ? 1 : nextEp;
    const newTotal = Math.min(
      progress.total_minutes_watched + show.avgEpisodeMinutes,
      show.totalMinutes
    );
    const isDone = progress.season_num === show.seasons && nextEp > epsPerSeason;

    const { data, error } = await supabase
      .from('watch_progress')
      .update({
        season_num: nextSeason,
        episode_num: actualNextEp,
        total_minutes_watched: newTotal,
        last_watched_at: new Date().toISOString(),
        status: isDone ? 'completed' : 'watching',
      })
      .eq('show_id', showId)
      .select()
      .maybeSingle();

    if (!error && data) setProgress(data as WatchProgress);
    if (onEpisodeComplete) onEpisodeComplete(showId);
  };

  if (!show) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Show not found.</p>
      </div>
    );
  }

  const daysSince = progress
    ? Math.floor((Date.now() - new Date(progress.last_watched_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const progressPercent =
    progress && show.totalMinutes > 0
      ? Math.min(100, Math.round((progress.total_minutes_watched / show.totalMinutes) * 100))
      : 0;

  const difficultyInfo = {
    easy: { color: 'text-green-400', border: 'border-green-800/30', bg: 'bg-green-950/20', label: 'Easy to Resume' },
    medium: { color: 'text-yellow-400', border: 'border-yellow-800/30', bg: 'bg-yellow-950/20', label: 'Some Context Needed' },
    hard: { color: 'text-red-400', border: 'border-red-800/30', bg: 'bg-red-950/20', label: 'Hard to Resume' },
  };
  const diff = difficultyInfo[show.resumeDifficulty];

  const shortSummary = show.lastEpisodeSummary.split('. ').slice(0, 2).join('. ') + '.';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-white text-lg font-bold flex items-center gap-2">
                <RefreshCw size={15} className="text-blue-400" />
                Resume Helper
              </h1>
              <p className="text-gray-500 text-xs">{show.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-5">
        {/* Show Banner */}
        <div className="relative rounded-2xl overflow-hidden h-32">
          <img src={show.backdropUrl} alt={show.title} className="w-full h-full object-cover brightness-40" />
          <div className="absolute inset-0 flex items-center px-7 gap-6">
            <div className="flex-1">
              <h2 className="text-white text-2xl font-black">{show.title}</h2>
              {progress && (
                <p className="text-gray-400 text-xs mt-1">
                  S{progress.season_num}E{progress.episode_num}
                  {daysSince > 0 ? ` · ${daysSince} day${daysSince !== 1 ? 's' : ''} ago` : ' · Just now'}
                  {' · '}{progressPercent}% complete
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Dominant Resume Now button ── */}
        <button
          onClick={() => onSelectShow(show.id)}
          className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl text-base transition-all hover:scale-[1.01] shadow-lg shadow-red-900/40"
        >
          <Play size={20} fill="currentColor" />
          Resume Now
          {progress && (
            <span className="text-red-200/80 text-sm font-medium">S{progress.season_num}E{progress.episode_num}</span>
          )}
        </button>

        {/* Difficulty badge — compact */}
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${diff.bg} ${diff.border}`}>
          <RefreshCw size={12} className={diff.color} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${diff.color}`}>
            {diff.label}
          </span>
        </div>

        {/* Time Away Alert — compact */}
        {daysSince >= 7 && (
          <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-700/30 rounded-xl p-3.5">
            <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">
                {daysSince >= 30 ? `Over a month` : `${daysSince} days`} since your last episode
              </p>
              <p className="text-amber-400/60 text-xs mt-0.5">
                {show.resumeDifficulty === 'hard'
                  ? 'Strongly recommend reading the recap and character notes below.'
                  : 'A quick scan of the section below will have you caught up in seconds.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Collapsible sections (all collapsed by default) ── */}

        {/* 30-Second Recap */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
          <button
            onClick={() => setRecapOpen(!recapOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-950/50 border border-blue-700/40 flex items-center justify-center">
                <span className="text-blue-400 text-xs font-bold">30s</span>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">30-Second Recap</p>
                <p className="text-gray-500 text-xs">Everything you need to remember, fast</p>
              </div>
            </div>
            {recapOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          {recapOpen && (
            <div className="px-5 pb-4 border-t border-gray-800">
              <p className="text-gray-300 text-sm leading-relaxed pt-3">{show.thirtySecondRecap}</p>
            </div>
          )}
        </div>

        {/* Character Map */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
          <button
            onClick={() => setCharactersOpen(!charactersOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                <Users size={14} className="text-gray-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Character Map</p>
                <p className="text-gray-500 text-xs">{show.characters.length} characters</p>
              </div>
            </div>
            {charactersOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          {charactersOpen && (
            <div className="px-5 pb-4 border-t border-gray-800">
              <div className="grid grid-cols-2 gap-3 pt-3">
                {show.characters.map((char) => (
                  <div key={char.name} className="flex items-start gap-3 bg-black/30 rounded-xl p-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-black"
                      style={{ backgroundColor: char.color + '33', border: `2px solid ${char.color}66` }}
                    >
                      <span style={{ color: char.color }}>{char.initial}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold leading-tight">{char.name}</p>
                      <p className="text-gray-500 text-xs leading-snug mt-0.5">{char.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* What Happened Last */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
          <button
            onClick={() => setLastEpOpen(!lastEpOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                <Clock size={14} className="text-gray-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">What Happened Last</p>
                {progress && <p className="text-gray-500 text-xs">S{progress.season_num}E{progress.episode_num}</p>}
              </div>
            </div>
            {lastEpOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          <div className="px-5 pb-4 border-t border-gray-800">
            <p className="text-gray-300 text-sm leading-relaxed pt-3">
              {lastEpOpen ? show.lastEpisodeSummary : shortSummary}
            </p>
            {!lastEpOpen && (
              <button
                onClick={() => setLastEpOpen(true)}
                className="text-gray-500 hover:text-gray-300 text-xs mt-2 transition-colors"
              >
                Read full summary
              </button>
            )}
          </div>
        </div>

        {/* Progress bar — compact, secondary */}
        {progress && (
          <div className="rounded-xl bg-gray-900/50 border border-gray-800/50 px-5 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs">{progressPercent}% through the series</p>
              <button
                onClick={handleMarkEpisodeComplete}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                <CheckCircle2 size={12} />
                Mark episode done
              </button>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

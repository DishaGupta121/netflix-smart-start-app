import { Play, Clock, TrendingUp, Sparkles, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { Show } from '../types';
import { getShowById } from '../data/shows';

interface ContinueJourneyProps {
  showId: string;
  onContinueNow: () => void;
  onContinueTomorrow: () => void;
}

export default function ContinueJourney({ showId, onContinueNow, onContinueTomorrow }: ContinueJourneyProps) {
  const [show, setShow] = useState<Show | null>(null);

  useEffect(() => {
    setShow(getShowById(showId) || null);
  }, [showId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onContinueTomorrow();
  }, [onContinueTomorrow]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!show) return null;

  const epsPerSeason = Math.ceil(show.totalEpisodes / show.seasons);
  const episodesWatched = Math.max(1, Math.floor(show.totalEpisodes * 0.55));
  const episodesRemaining = Math.max(1, show.totalEpisodes - episodesWatched);
  const minutesWatched = episodesWatched * show.avgEpisodeMinutes;
  const minutesRemaining = Math.max(show.avgEpisodeMinutes, show.totalMinutes - minutesWatched);
  const remainingHours = Math.floor(minutesRemaining / 60);
  const remainingMins = minutesRemaining % 60;
  const watchedHours = Math.floor(minutesWatched / 60);
  const watchedMins = minutesWatched % 60;
  const seriesPercent = show.totalMinutes > 0 ? Math.round((minutesWatched / show.totalMinutes) * 100) : 0;

  const currentSeason = Math.min(show.seasons, Math.floor(episodesWatched / epsPerSeason) + 1);
  const currentEpisode = (episodesWatched % epsPerSeason) + 1;
  const nextSeason = currentEpisode >= epsPerSeason && currentSeason < show.seasons
    ? currentSeason + 1
    : currentSeason;
  const nextEpisode = currentEpisode >= epsPerSeason && currentSeason < show.seasons
    ? 1
    : currentEpisode + 1;

  const sessionMinutes = Math.min(show.avgEpisodeMinutes * 2, minutesRemaining || show.avgEpisodeMinutes);
  const sessionEpisodes = Math.floor(sessionMinutes / show.avgEpisodeMinutes);

  const nudgeMessage = show.resumeDifficulty === 'hard'
    ? `Pick up where you left off — S${nextSeason}E${nextEpisode}. A quick recap will help you re-engage.`
    : show.complexityLevel <= 2
    ? `S${nextSeason}E${nextEpisode} is ready when you are. ${sessionEpisodes} episode${sessionEpisodes !== 1 ? 's' : ''} in ${sessionMinutes} min — easy to fit in tonight.`
    : `S${nextSeason}E${nextEpisode} picks up the momentum. ${sessionEpisodes} episode${sessionEpisodes !== 1 ? 's' : ''} tonight keeps the story fresh.`;

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <img src={show.backdropUrl} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black" />
      </div>

      <div
        className="relative w-full max-w-lg"
        style={{ animation: 'panelSlideIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-600/20 rounded-full px-4 py-1.5 mb-4">
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-amber-400 text-[11px] font-semibold uppercase tracking-widest">
              Continue Your Journey
            </span>
          </div>
          <h1 className="text-white text-2xl font-black mb-1">{show.title}</h1>
          <p className="text-gray-500 text-sm">
            You just finished S{currentSeason}E{currentEpisode}
          </p>
        </div>

        {/* Progress panel */}
        <div className="rounded-2xl bg-gray-900/80 backdrop-blur-md border border-gray-800 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Season Progress</span>
            <span className="text-white text-sm font-bold">{seriesPercent}%</span>
          </div>

          <div className="h-2 bg-gray-800 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(2, seriesPercent)}%` }}
            />
          </div>

          <div className="grid grid-cols-3">
            <div className="text-center px-2">
              <CheckCircle2 size={14} className="text-amber-400 mx-auto mb-1.5" />
              <div className="text-white text-lg font-black leading-none">{episodesWatched}</div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider mt-1">Episodes Watched</div>
            </div>
            <div className="text-center px-2 border-x border-gray-800">
              <Clock size={14} className="text-amber-400 mx-auto mb-1.5" />
              <div className="text-white text-lg font-black leading-none">
                {watchedHours > 0 ? `${watchedHours}h ` : ''}{watchedMins}m
              </div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider mt-1">Time Watched</div>
            </div>
            <div className="text-center px-2">
              <TrendingUp size={14} className="text-amber-400 mx-auto mb-1.5" />
              <div className="text-white text-lg font-black leading-none">
                {remainingHours > 0 ? `${remainingHours}h ` : ''}{remainingMins}m
              </div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider mt-1">Time Remaining</div>
            </div>
          </div>
        </div>

        {/* Next session nudge */}
        <div className="mb-5">
          <h3 className="text-white text-sm font-bold mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            Next Session
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">{nudgeMessage}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onContinueNow}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl text-sm transition-all hover:scale-[1.02] shadow-lg shadow-red-900/40"
          >
            <Play size={16} fill="currentColor" />
            Continue Now
            <span className="text-red-200/70 text-xs font-medium ml-1">S{nextSeason}E{nextEpisode}</span>
          </button>
          <button
            onClick={onContinueTomorrow}
            className="flex items-center justify-center gap-2 bg-transparent hover:bg-gray-800/50 text-gray-400 font-semibold py-3.5 rounded-xl text-sm transition-all border border-gray-800"
          >
            <Calendar size={15} className="text-gray-500" />
            Continue Tomorrow
            <ArrowRight size={14} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

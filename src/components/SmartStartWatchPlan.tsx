import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Clock,
  Download,
  Bell,
  SkipForward,
  Repeat,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Check,
} from 'lucide-react';
import type { Show } from '../types';

interface SmartStartWatchPlanProps {
  show: Show;
  availableMinutes: number;
  onBack: () => void;
  onStart: () => void;
}

const TOGGLES = [
  { id: 'download', label: 'Download', Icon: Download },
  { id: 'reminder', label: 'Reminder', Icon: Bell },
  { id: 'skipIntro', label: 'Skip Intro', Icon: SkipForward },
  { id: 'autoplay', label: 'Autoplay', Icon: Repeat },
] as const;

export default function SmartStartWatchPlan({
  show,
  availableMinutes,
  onBack,
  onStart,
}: SmartStartWatchPlanProps) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    download: false,
    reminder: false,
    skipIntro: true,
    autoplay: true,
  });

  // Feedback loop — "Did we get it right?"
  const [feedbackStarted, setFeedbackStarted] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  const handleStart = () => {
    onStart();
    setFeedbackStarted(true);
  };

  const handleFeedback = (vote: 'up' | 'down') => {
    setFeedbackGiven(vote);
  };

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (overlayRef.current) {
      overlayRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  const epMin = show.avgEpisodeMinutes;
  const epsTonight = Math.max(1, Math.floor(availableMinutes / epMin));
  const epsToRecommend = Math.min(epsTonight, show.totalEpisodes);
  const estimatedDuration = epsToRecommend * epMin;

  const epRange =
    epsToRecommend === 1
      ? 'Episode 1'
      : `Episodes 1–${epsToRecommend}`;

  const remainingAfter = availableMinutes - estimatedDuration;
  const stoppingPoint =
    epsToRecommend === 1
      ? `Stop after Episode 1 — ${epMin} min fits your ${availableMinutes}-min window.`
      : remainingAfter >= epMin * 0.5
      ? `Stop after Episode ${epsToRecommend} — you'll have ${remainingAfter} min left, not quite enough for another full episode.`
      : `Stop after Episode ${epsToRecommend} — uses ${estimatedDuration} of your ${availableMinutes} min, a clean stopping point.`;

  const toggle = (id: string) =>
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2 ml-2">
          <Sparkles size={14} className="text-amber-400" />
          <h2 className="text-white text-sm font-bold uppercase tracking-widest">
            Tonight's Plan
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Show title + episode range */}
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-1">
              {show.title}
            </p>
            <h1 className="text-white text-2xl font-black">{epRange}</h1>
            <p className="text-gray-400 text-sm mt-1">
              Season 1 · {epsToRecommend} episode
              {epsToRecommend !== 1 ? 's' : ''} · {epMin} min each
            </p>
          </div>

          {/* Duration summary */}
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-300 text-sm">Estimated total</span>
              </div>
              <span className="text-white font-bold text-sm">{estimatedDuration} min</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
              <span className="text-gray-500 text-xs">Your time budget</span>
              <span className="text-gray-300 font-semibold text-xs">{availableMinutes} min</span>
            </div>
          </div>

          {/* Stopping point */}
          <div>
            <h3 className="text-white text-sm font-bold mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              Best Stopping Point
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {stoppingPoint}
            </p>
          </div>

          {/* Toggle buttons */}
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">
              Preferences
            </p>
            <div className="grid grid-cols-4 gap-3">
              {TOGGLES.map(({ id, label, Icon }) => {
                const active = toggles[id];
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                      active
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Watching button */}
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl text-base transition-all hover:scale-[1.02] shadow-lg shadow-red-900/40"
          >
            <Play size={16} fill="currentColor" />
            Start Watching
          </button>

          {/* Feedback loop — appears after starting */}
          {feedbackStarted && !feedbackGiven && (
            <div
              className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-800 bg-gray-900/60"
              style={{ animation: 'feedbackAckPop 0.4s ease-out' }}
            >
              <p className="text-gray-300 text-xs font-medium">Did we get it right?</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback('up')}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-700 hover:border-green-500 hover:bg-green-500/10 text-gray-400 hover:text-green-400 transition-all"
                >
                  <ThumbsUp size={15} />
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-700 hover:border-red-500 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
                >
                  <ThumbsDown size={15} />
                </button>
              </div>
            </div>
          )}
          {feedbackStarted && feedbackGiven && (
            <div
              className="mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-green-800/40 bg-green-950/20"
              style={{ animation: 'feedbackAckPop 0.4s ease-out' }}
            >
              <Check size={14} className="text-green-400" />
              <p className="text-green-300 text-xs font-medium">
                {feedbackGiven === 'up' ? 'Glad we nailed it — thanks, noted!' : 'Bummer — thanks, noted! We\u2019ll do better next time.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

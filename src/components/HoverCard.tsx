import { Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Show, WatchProgress } from '../types';

const CARD_WIDTH = 340;

interface HoverCardProps {
  show: Show;
  progress?: WatchProgress;
  anchorRect: DOMRect;
  onPlay: () => void;
  onMoreInfo: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function HoverCard({
  show,
  progress,
  anchorRect,
  onPlay,
  onMoreInfo,
  onMouseEnter,
  onMouseLeave,
}: HoverCardProps) {
  // Center the hover card over the anchor card; clamp to viewport edges
  const vpw = window.innerWidth;
  const cardHeight = CARD_WIDTH * (9 / 16) + 110; // preview height + info height
  const rawLeft = anchorRect.left + anchorRect.width / 2 - CARD_WIDTH / 2;
  const left = Math.max(8, Math.min(vpw - CARD_WIDTH - 8, rawLeft));

  // Always expand upward: bottom edge of preview stays aligned with bottom edge of poster
  const top = anchorRect.bottom - cardHeight;

  const progressPercent =
    progress && show.totalMinutes > 0
      ? Math.min(100, (progress.total_minutes_watched / show.totalMinutes) * 100)
      : 0;
  const hasProgress = !!progress && progress.total_minutes_watched > 0;
  const ageLabel = show.contentType === 'movie' ? 'U/A' : 'TV-MA';
  const totalH = Math.floor(show.totalMinutes / 60);
  const totalM = show.totalMinutes % 60;
  const durationLabel =
    show.contentType === 'movie'
      ? `${totalH}h ${totalM}m`
      : `${show.seasons} Season${show.seasons !== 1 ? 's' : ''}`;

  return createPortal(
    <div
      className="fixed z-[9999] rounded-lg overflow-hidden bg-gray-950"
      style={{
        left,
        top,
        width: CARD_WIDTH,
        animation: 'hoverCardIn 0.15s ease-out',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Preview image */}
      <div className="relative aspect-video">
        <img src={show.backdropUrl} alt={show.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="px-4 py-3">
        {/* Title */}
        <p className="text-white font-bold text-sm leading-tight mb-3">{show.title}</p>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white hover:bg-gray-200 transition-colors"
          >
            <Play size={16} fill="black" className="text-black ml-0.5" />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Plus size={18} className="text-white" />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <ThumbsUp size={16} className="text-white" />
          </button>
          {/* Spacer */}
          <div className="flex-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onMoreInfo(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            title="More info"
          >
            <ChevronDown size={18} className="text-white" />
          </button>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 text-xs mb-2">
          <span
            className="text-gray-300 px-1.5 py-0.5 text-[10px] leading-none rounded-sm"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {ageLabel}
          </span>
          <span className="text-gray-300 font-medium">{durationLabel}</span>
          <span
            className="text-gray-400 px-1 py-0.5 text-[10px] leading-none rounded-sm"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            HD
          </span>
          {show.worthItScore >= 85 && (
            <span className="text-green-500 font-semibold">{show.worthItScore}% Match</span>
          )}
        </div>

        {/* Genre tags */}
        <div className="flex flex-wrap gap-x-2 text-[11px] text-gray-400">
          {show.genres.slice(0, 3).map((g, i) => (
            <span key={g}>
              {i > 0 && <span className="mr-2">•</span>}
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

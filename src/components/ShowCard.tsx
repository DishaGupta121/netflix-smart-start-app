import type { Show, WatchProgress } from '../types';

interface ShowCardProps {
  show: Show;
  progress?: WatchProgress;
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  rank?: number; // for TOP 10 rows
  badge?: 'new-episode' | 'recently-added' | 'new-season' | 'watch-now' | 'top10';
}

const BADGE_STYLES: Record<string, { label: string; bg: string }> = {
  'new-episode': { label: 'New Episode', bg: 'bg-red-600' },
  'recently-added': { label: 'Recently added', bg: 'bg-red-700' },
  'new-season': { label: 'New Season', bg: 'bg-red-600' },
  'watch-now': { label: 'Watch Now', bg: 'bg-gray-700' },
  'top10': { label: 'TOP 10', bg: 'bg-red-600' },
};

export default function ShowCard({ show, progress, onMouseEnter, onMouseLeave, rank, badge }: ShowCardProps) {
  const progressPercent =
    progress && show.totalMinutes > 0
      ? Math.min(100, (progress.total_minutes_watched / show.totalMinutes) * 100)
      : 0;
  const hasProgress = !!progress && progress.total_minutes_watched > 0;

  if (rank !== undefined) {
    // TOP 10 layout — giant numeral dominant, small poster tucked into lower-right of numeral
    const POSTER_W = 110;
    const NUM_SIZE = 210;
    const TOTAL_W = NUM_SIZE * 0.72 + POSTER_W * 0.55; // overlap so poster covers right ~55% of numeral

    return (
      <div
        className="relative flex-shrink-0 cursor-pointer group"
        style={{ width: TOTAL_W, height: NUM_SIZE * 0.88 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Giant rank number — dominant visual */}
        <div
          className="absolute left-0 bottom-0 select-none pointer-events-none leading-none font-black"
          style={{
            fontSize: NUM_SIZE,
            lineHeight: 1,
            color: '#141414',
            WebkitTextStroke: `${rank >= 10 ? 3 : 4}px #3a3a3a`,
          }}
        >
          {rank}
        </div>

        {/* Poster — small, portrait, bottom-right of numeral */}
        <div
          className="absolute bottom-0 right-0 z-10 rounded-md overflow-hidden transition-transform duration-200 group-hover:scale-105"
          style={{ width: POSTER_W }}
        >
          <div className="aspect-[2/3]">
            <img
              src={show.imageUrl}
              alt={show.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
          {badge && (
            <div className="absolute bottom-1.5 left-1.5 flex gap-1 flex-wrap">
              <span className={`${BADGE_STYLES[badge]?.bg ?? 'bg-red-600'} text-white text-[9px] font-bold px-1 py-0.5 rounded-sm`}>
                {BADGE_STYLES[badge]?.label}
              </span>
            </div>
          )}
          {hasProgress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/80">
              <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex-shrink-0 rounded-md overflow-hidden cursor-pointer group transition-transform duration-200 hover:scale-105 hover:z-10"
      style={{ width: 165 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="aspect-[2/3] relative">
        <img
          src={show.imageUrl}
          alt={show.title}
          className="w-full h-full object-cover"
          draggable={false}
        />
        {badge && (
          <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
            <span className={`${BADGE_STYLES[badge]?.bg ?? 'bg-red-600'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm`}>
              {BADGE_STYLES[badge]?.label}
            </span>
          </div>
        )}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/80">
            <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

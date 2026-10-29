import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { Show, WatchProgress } from '../types';
import ShowCard from './ShowCard';
import HoverCard from './HoverCard';

interface HoverState {
  show: Show;
  rect: DOMRect;
}

type BadgeType = 'new-episode' | 'recently-added' | 'new-season' | 'watch-now' | 'top10';

interface ContentRowProps {
  title: string;
  shows: Show[];
  progressMap?: Record<string, WatchProgress>;
  onPressShow: (showId: string) => void;
  onMoreInfo: (showId: string) => void;
  subtitle?: string;
  variant?: 'default' | 'top10' | 'continue';
  badges?: Record<string, BadgeType>;
}

export default function ContentRow({
  title,
  shows,
  progressMap = {},
  onPressShow,
  onMoreInfo,
  subtitle,
  variant = 'default',
  badges = {},
}: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateScrollState = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  useEffect(() => {
    const dismiss = () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      setHovered(null);
    };
    window.addEventListener('scroll', dismiss, { passive: true });
    return () => window.removeEventListener('scroll', dismiss);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const handleCardEnter = useCallback((show: Show, e: React.MouseEvent<HTMLDivElement>) => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimerRef.current = setTimeout(() => {
      setHovered({ show, rect });
    }, 350);
  }, []);

  const handleCardLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    leaveTimerRef.current = setTimeout(() => setHovered(null), 200);
  }, []);

  const handleHoverCardEnter = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  }, []);

  const handleHoverCardLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setHovered(null), 150);
  }, []);

  if (shows.length === 0) return null;

  const isTop10 = variant === 'top10';

  return (
    <div className="relative mb-8 group/section">
      {/* Row header */}
      <div className="px-4 md:px-12 mb-3 flex items-baseline gap-3">
        <h2 className="text-white text-base md:text-lg font-bold hover:text-gray-200 transition-colors duration-200 cursor-default">
          {title}
        </h2>
        {subtitle && (
          <span className="text-gray-500 text-xs hidden md:inline">{subtitle}</span>
        )}
      </div>

      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-10 md:w-14 flex items-center justify-center bg-black/70 hover:bg-black/90 text-white transition-all duration-200 opacity-0 group-hover/section:opacity-100"
          >
            <ChevronLeft size={26} />
          </button>
        )}

        <div
          ref={rowRef}
          className="flex gap-1 overflow-x-auto px-4 md:px-12 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {shows.map((show, i) => (
            <ShowCard
              key={show.id}
              show={show}
              progress={progressMap[show.id]}
              rank={isTop10 ? i + 1 : undefined}
              badge={badges[show.id]}
              onMouseEnter={(e) => handleCardEnter(show, e)}
              onMouseLeave={handleCardLeave}
            />
          ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-10 md:w-14 flex items-center justify-center bg-black/70 hover:bg-black/90 text-white transition-all duration-200 opacity-0 group-hover/section:opacity-100"
          >
            <ChevronRight size={26} />
          </button>
        )}
      </div>

      {hovered && (
        <HoverCard
          show={hovered.show}
          progress={progressMap[hovered.show.id]}
          anchorRect={hovered.rect}
          onPlay={() => { setHovered(null); onPressShow(hovered.show.id); }}
          onMoreInfo={() => { setHovered(null); onMoreInfo(hovered.show.id); }}
          onMouseEnter={handleHoverCardEnter}
          onMouseLeave={handleHoverCardLeave}
        />
      )}
    </div>
  );
}

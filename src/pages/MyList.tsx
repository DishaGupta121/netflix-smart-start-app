import { Clock, TrendingUp, BookmarkPlus, Compass, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SHOWS } from '../data/shows';
import type { WatchProgress } from '../types';
import { supabase } from '../lib/supabase';

interface MyListProps {
  onSelectShow: (showId: string) => void;
  onBrowse?: () => void;
}

export default function MyList({ onSelectShow, onBrowse }: MyListProps) {
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress>>({});

  useEffect(() => {
    supabase
      .from('watch_progress')
      .select('*')
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, WatchProgress> = {};
        data.forEach((p) => {
          map[p.show_id] = p as WatchProgress;
        });
        setProgressMap(map);
      });
  }, []);

  const watchingShows = SHOWS.filter((s) => progressMap[s.id]?.status === 'watching');
  const completedShows = SHOWS.filter((s) => progressMap[s.id]?.status === 'completed');

  const allTracked = SHOWS.filter((s) => progressMap[s.id]);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 px-4 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-black">My List</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {allTracked.length} show{allTracked.length !== 1 ? 's' : ''} tracked
          </p>
        </div>

        {allTracked.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-6">
              <BookmarkPlus size={36} className="text-gray-600" />
            </div>
            <h2 className="text-white text-xl font-bold mb-3">Your list is empty</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Shows you start watching will appear here so you can pick up right where you left off.
            </p>
            <button
              onClick={() => (onBrowse ? onBrowse() : onSelectShow(SHOWS[0].id))}
              className="inline-flex items-center gap-2 bg-white hover:bg-white/85 text-black font-bold px-6 py-2.5 rounded transition-all duration-200 hover:scale-105 text-sm"
            >
              <Compass size={18} />
              Browse Shows
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {watchingShows.length > 0 && (
              <div>
                <h2 className="text-white text-base md:text-lg font-bold mb-4">Continue Watching</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {watchingShows.map((show) => {
                    const prog = progressMap[show.id];
                    const pct = Math.round((prog.total_minutes_watched / show.totalMinutes) * 100);
                    return (
                      <button
                        key={show.id}
                        onClick={() => onSelectShow(show.id)}
                        className="text-left group"
                      >
                        <div className="relative rounded overflow-hidden transition-transform duration-200 group-hover:scale-105">
                          <div className="aspect-[2/3]">
                            <img
                              src={show.imageUrl}
                              alt={show.title}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                          <span className="absolute top-2 left-2 bg-blue-950/80 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm">
                            Watching
                          </span>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/80">
                            <div className="h-full bg-red-600" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <h3 className="text-white text-sm font-medium truncate mt-2">{show.title}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">
                          S{prog.season_num}E{prog.episode_num} · {pct}%
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {completedShows.length > 0 && (
              <div>
                <h2 className="text-white text-base md:text-lg font-bold mb-4">Completed</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {completedShows.map((show) => (
                    <button
                      key={show.id}
                      onClick={() => onSelectShow(show.id)}
                      className="text-left group"
                    >
                      <div className="relative rounded overflow-hidden transition-transform duration-200 group-hover:scale-105">
                        <div className="aspect-[2/3]">
                          <img
                            src={show.imageUrl}
                            alt={show.title}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                        <span className="absolute top-2 left-2 bg-green-950/80 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm flex items-center gap-1">
                          <CheckCircle2 size={9} />
                          Completed
                        </span>
                      </div>
                      <h3 className="text-white text-sm font-medium truncate mt-2">{show.title}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

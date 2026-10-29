import { useState, useCallback, useEffect } from 'react';
import type { Page, WatchProgress } from './types';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import WatchPlan from './pages/WatchPlan';
import ResumeHelper from './pages/ResumeHelper';
import MyList from './pages/MyList';
import ShowDetailModal from './components/ShowDetailModal';
import NowPlayingModal from './components/NowPlayingModal';
import { getShowById } from './data/shows';
import { supabase } from './lib/supabase';

type AppPage = 'home' | 'watch-plan' | 'resume-helper' | 'my-list';

interface NavState {
  page: AppPage;
  showId: string | null;
}

export default function App() {
  const [nav, setNav] = useState<NavState>({ page: 'home', showId: null });
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    showId: string | null;
    initialTab?: 'smart-start';
  }>({
    open: false,
    showId: null,
  });
  const [nowPlaying, setNowPlaying] = useState<{
    open: boolean;
    showId: string | null;
    episode: { season: number; episode: number; title: string };
    showRecap?: boolean;
  } | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress>>({});

  const refreshProgress = useCallback(() => {
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

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const navigate = (page: AppPage, showId?: string) => {
    setNav({ page, showId: showId ?? null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectShow = (showId: string) => {
    setDetailModal({ open: true, showId });
  };

  const handleOpenSmartStartDiscovery = () => {
    setDetailModal({ open: true, showId: null, initialTab: 'smart-start' });
  };

  const handlePlayShow = async (showId: string) => {
    const show = getShowById(showId);
    if (show) {
      setDetailModal({ open: false, showId: null });

      const { data: existing } = await supabase
        .from('watch_progress')
        .select('*')
        .eq('show_id', showId)
        .maybeSingle();

      const season = existing?.season_num ?? 1;
      const episode = existing?.episode_num ?? 1;

      setNowPlaying({
        open: true,
        showId,
        episode: { season, episode, title: show.title },
        showRecap: !!existing,
      });
      supabase
        .from('watch_progress')
        .upsert(
          {
            show_id: showId,
            season_num: season,
            episode_num: episode,
            status: 'watching',
            total_minutes_watched: existing?.total_minutes_watched ?? Math.round(show.totalMinutes * 0.55),
            last_watched_at: new Date().toISOString(),
          },
          { onConflict: 'show_id' }
        )
        .then(() => refreshProgress());
    }
  };

  const handleSessionEnd = async (showId: string) => {
    setNowPlaying(null);
    navigate('home');
  };

  const showNavbar = nav.page === 'home' || nav.page === 'my-list';

  return (
    <div className="min-h-screen bg-black">
      {showNavbar && (
        <Navbar
          onNavigate={(page) => navigate(page as AppPage)}
          currentPage={nav.page as Page}
          onSmartStart={handleOpenSmartStartDiscovery}
          onSelectShow={handleSelectShow}
        />
      )}

      {nav.page === 'home' && (
        <Home
          onSelectShow={handleSelectShow}
          onPlayShow={handlePlayShow}
          onSmartStart={handleOpenSmartStartDiscovery}
          progressMap={progressMap}
        />
      )}

      {nav.page === 'watch-plan' && nav.showId && (
        <WatchPlan
          showId={nav.showId}
          onBack={() => navigate('home')}
        />
      )}

      {nav.page === 'resume-helper' && nav.showId && (
        <ResumeHelper
          showId={nav.showId}
          onBack={() => navigate('home')}
          onSelectShow={handlePlayShow}
        />
      )}

      {nav.page === 'my-list' && (
        <MyList onSelectShow={handleSelectShow} onBrowse={() => navigate('home')} />
      )}

      {/* Detail Modal */}
      {detailModal.open && (
        <ShowDetailModal
          showId={detailModal.showId}
          initialTab={detailModal.initialTab}
          onPlay={(showId: string) => {
            handlePlayShow(showId);
          }}
          onOpenResumeHelper={(showId) => {
            setDetailModal({ open: false, showId: null });
            handlePlayShow(showId);
          }}
          onClose={() => setDetailModal({ open: false, showId: null })}
          onSelectShow={(id) => setDetailModal({ open: true, showId: id })}
          onProgressChanged={refreshProgress}
        />
      )}

      {/* Now Playing Modal */}
      {nowPlaying && nowPlaying.open && nowPlaying.showId && (
        <NowPlayingModal
          show={getShowById(nowPlaying.showId)!}
          episode={nowPlaying.episode}
          showRecap={nowPlaying.showRecap}
          onClose={() => handleSessionEnd(nowPlaying.showId!)}
        />
      )}
    </div>
  );
}

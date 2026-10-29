import { Play, Info, Sparkles, Clock, Brain, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SHOWS, getFeaturedShow } from '../data/shows';
import type { Show } from '../types';
import type { WatchProgress } from '../types';
import ContentRow from '../components/ContentRow';
import { searchContent, fetchMovieDetails, fetchTVDetails } from '../lib/tmdb';
import { FEATURED_SHOW } from '../config/featured';

interface HomeProps {
  onSelectShow: (showId: string) => void;
  onPlayShow: (showId: string) => void;
  onSmartStart: () => void;
  progressMap: Record<string, WatchProgress>;
}

interface TmdbHero {
  title: string;
  description: string;
  year: string;
  voteAverage: number;
  genres: string[];
}

export default function Home({ onSelectShow, onPlayShow, onSmartStart, progressMap }: HomeProps) {
  const featured = getFeaturedShow();
  const [tmdbHero, setTmdbHero] = useState<TmdbHero | null>(null);

  useEffect(() => {
    async function loadFeatured() {
      const { results } = await searchContent(FEATURED_SHOW.title);
      const match = results.find(
        (r) =>
          (r.title ?? r.name ?? '').toLowerCase() === FEATURED_SHOW.title.toLowerCase() &&
          r.backdrop_path,
      ) ?? results.find((r) => r.backdrop_path);
      if (!match) return;
      const details =
        (match.media_type === 'tv' || FEATURED_SHOW.type === 'tv')
          ? await fetchTVDetails(match.id)
          : await fetchMovieDetails(match.id);
      setTmdbHero({
        title: details.title ?? details.name ?? '',
        description: details.overview,
        year: (details.release_date ?? details.first_air_date ?? '').slice(0, 4),
        voteAverage: details.vote_average,
        genres: details.genres?.map((g: { name: string }) => g.name) ?? [],
      });
    }
    loadFeatured().catch(() => {});
  }, []);

  const NEW_TITLE_IDS = [
    'f1', 'mickey-17', 'sinners', 'mission-impossible-final-reckoning',
    'jurassic-world-rebirth', 'superman-2025', 'saiyaara', 'metro-in-dino',
    'bhool-chuk-maaf', 'fantastic-four-first-steps', 'final-destination-bloodlines',
    'carry-on', 'ctrl', 'do-patti', 'the-gorge', 'havoc', 'my-oxford-year',
    'bridgerton', 'xo-kitty', 'one-day', 'the-royals', 'black-warrant',
    'anyone-but-you', 'the-idea-of-you', 'la-la-land', 'past-lives', 'purple-hearts',
    'yeh-jawaani-hai-deewani', 'dear-zindagi', 'tamasha', 'bajirao-mastani', 'padmaavat',
    'kalank', 'mimi', 'made-in-heaven', 'sanju', 'gully-boy', 'chandigarh-kare-aashiqui',
    'moulin-rouge', 'the-great-gatsby', 'crazy-rich-asians', 'john-wick-4',
    'mission-impossible-dead-reckoning', 'top-gun-maverick', 'the-gray-man',
    'dune-part-two', 'mad-max-fury-road',
  ];

  function prioritizeNew(shows: Show[]): Show[] {
    const newShows = NEW_TITLE_IDS
      .map((id) => shows.find((s) => s.id === id))
      .filter((s): s is Show => !!s);
    const existingShows = shows.filter((s) => !NEW_TITLE_IDS.includes(s.id));
    return [...newShows, ...existingShows];
  }

  const continueWatching = SHOWS.filter((s) => progressMap[s.id]?.status === 'watching')
    .sort((a, b) => {
      const aTime = progressMap[a.id]?.updated_at ? new Date(progressMap[a.id].updated_at).getTime() : 0;
      const bTime = progressMap[b.id]?.updated_at ? new Date(progressMap[b.id].updated_at).getTime() : 0;
      return bTime - aTime;
    });
  const quickWatches = prioritizeNew(SHOWS.filter((s) => s.avgEpisodeMinutes <= 35));
  const highlyRated = prioritizeNew([...SHOWS].sort((a, b) => b.rating - a.rating).slice(0, 15));
  const topWorthIt = prioritizeNew([...SHOWS].sort((a, b) => b.worthItScore - a.worthItScore).slice(0, 15));
  const relaxedPicks = prioritizeNew(SHOWS.filter((s) => s.moodTags.includes('relaxed')));
  const thrillerPicks = prioritizeNew(SHOWS.filter((s) =>
    s.genres.some((g) => ['Thriller', 'Crime', 'Mystery', 'Psychological Thriller', 'Tech Thriller', 'Survival'].includes(g))
  ).sort((a, b) => b.rating - a.rating));
  const squidGameRowOrder = [
    'alice-in-borderland',
    'money-heist',
    'parasite',
    'extraction',
    'the-glory',
    'knives-out',
    'andhadhun',
  ];
  const squidGamePicks = prioritizeNew([
    ...squidGameRowOrder
      .map((id) => SHOWS.find((s) => s.id === id))
      .filter((s): s is Show => !!s),
    ...SHOWS.filter((s) =>
      s.genres.some((g) => ['Thriller', 'Crime', 'Mystery', 'Psychological Thriller', 'Tech Thriller', 'Survival'].includes(g))
    ).sort((a, b) => b.rating - a.rating).filter((s) => !squidGameRowOrder.includes(s.id)),
  ].slice(0, 20));
  const miniseries = prioritizeNew(SHOWS.filter((s) => s.contentType === 'miniseries' || s.totalEpisodes <= 8));
  const hindiShows = prioritizeNew(SHOWS.filter((s) => s.language === 'hi'));

  const top10Badges: Record<string, 'top10'> = {};
  topWorthIt.forEach((s) => { top10Badges[s.id] = 'top10'; });

  const newBadges: Record<string, 'recently-added'> = {};
  SHOWS.filter((s) => s.releaseYear >= 2023).forEach((s) => { newBadges[s.id] = 'recently-added'; });

  const durationLabel =
    featured.contentType === 'movie'
      ? `${Math.floor(featured.totalMinutes / 60)}h ${featured.totalMinutes % 60}m`
      : `${featured.seasons} Season${featured.seasons !== 1 ? 's' : ''}`;

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <div className="relative w-full" style={{ height: '95vh', minHeight: 580 }}>
        <img
          src="/assets/images/squid-game-banner.png"
          alt={tmdbHero ? tmdbHero.title : featured.title}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Left-to-right gradient: dark left for readability, transparent middle, vignette right */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(77deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 25%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.45) 100%)',
          }}
        />
        {/* Top-to-bottom: subtle dark at top blending into navbar, strong bottom fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 18%, transparent 50%, rgba(0,0,0,0.3) 72%, rgba(0,0,0,0.7) 88%, #000 100%)',
          }}
        />
        {/* Right-edge vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(270deg, rgba(0,0,0,0.55) 0%, transparent 35%)',
          }}
        />

        <div
          className="absolute bottom-0 left-0 right-0 max-w-2xl"
          style={{ paddingLeft: 'clamp(16px, 4vw, 60px)', paddingBottom: 'clamp(80px, 10vh, 140px)' }}
        >
          {/* Show logo-style title */}
          <h1
            className="text-white font-black tracking-tight"
            style={{
              fontSize: 'clamp(36px, 6.5vw, 88px)',
              lineHeight: 0.9,
              marginBottom: '1.25rem',
              textShadow: '0 2px 16px rgba(0,0,0,0.7)',
            }}
          >
            {(tmdbHero ? tmdbHero.title : featured.title).toUpperCase()}
          </h1>

          {/* Match + Year + Duration + Rating */}
          <div className="flex items-center gap-3 text-sm" style={{ marginBottom: '1rem' }}>
            <span className="text-green-500 font-bold">
              {tmdbHero ? `${Math.round(tmdbHero.voteAverage * 10)}% Match` : `${featured.worthItScore}% Match`}
            </span>
            <span className="text-gray-300">{tmdbHero ? tmdbHero.year : featured.releaseYear}</span>
            <span
              className="text-gray-300 px-1.5 py-0.5 text-[10px] leading-none rounded-sm"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {featured.contentType === 'movie' ? 'U/A 16+' : featured.id === 'squid-game' ? 'TV-MA' : 'A'}
            </span>
            <span className="text-gray-300">{durationLabel}</span>
            <span
              className="text-gray-300 px-1.5 py-0.5 text-[10px] leading-none rounded-sm"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            >
              HD
            </span>
          </div>

          {/* Description */}
          <p
            className="text-gray-200 text-sm md:text-base max-w-xl line-clamp-3"
            style={{ marginBottom: '1.25rem', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
          >
            {tmdbHero ? tmdbHero.description : featured.description}
          </p>

          {/* Genres */}
          {tmdbHero && tmdbHero.genres.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '1.75rem' }}>
              {tmdbHero.genres.map((genre, i) => (
                <span key={genre} className="flex items-center gap-2 text-gray-300 text-xs">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-gray-500 inline-block" />}
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onPlayShow(featured.id)}
              className="flex items-center gap-2 bg-white hover:bg-white/85 text-black font-bold rounded-md transition-all duration-200 hover:scale-105"
              style={{ padding: '0.6rem 1.75rem', fontSize: 'clamp(14px, 1.4vw, 18px)' }}
            >
              <Play size={20} fill="currentColor" />
              Play
            </button>
            <button
              onClick={() => onSelectShow(featured.id)}
              className="flex items-center gap-2 bg-gray-500/50 hover:bg-gray-500/40 text-white font-semibold rounded-md transition-all duration-200 hover:scale-105 backdrop-blur-sm"
              style={{ padding: '0.6rem 1.75rem', fontSize: 'clamp(14px, 1.4vw, 18px)' }}
            >
              <Info size={20} />
              More Info
            </button>
          </div>
        </div>

        {/* Age rating bottom-right */}
        <div
          className="absolute right-0 hidden md:block"
          style={{ bottom: 'clamp(80px, 12vh, 140px)', borderLeft: '2px solid rgba(255,255,255,0.3)', paddingLeft: 8, paddingRight: 32 }}
        >
          <span className="text-gray-200 text-sm font-semibold">
            {featured.contentType === 'movie' ? 'U/A 16+' : featured.id === 'squid-game' ? 'TV-MA' : 'A'}
          </span>
        </div>

        {/* Maturity rating tab bottom-right */}
        <div
          className="absolute hidden md:flex items-center gap-2 text-gray-300 text-xs"
          style={{ bottom: 'clamp(80px, 12vh, 140px)', right: 48 }}
        >
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Smart Start Discovery Banner - ALWAYS visible, PROTECTED */}
      <div
        className="relative z-10 mx-4 md:mx-12 -mt-8 mb-10 rounded-xl overflow-hidden backdrop-blur-md"
        style={{
          background: 'linear-gradient(to right, rgba(120,53,15,0.5), rgba(17,24,39,0.85))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between px-5 md:px-7 py-4">
          <div className="flex items-center gap-4">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Sparkles size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm md:text-base">Not sure what to watch tonight?</h3>
              <p className="text-gray-400 text-xs md:text-sm">
                Tell us your mood, time, and who you're with — we'll find the perfect match.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden lg:flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-amber-400" />
                Fits your schedule
              </span>
              <span className="flex items-center gap-1.5">
                <Brain size={12} className="text-amber-400" />
                Matches your mood
              </span>
            </div>
            <button
              onClick={onSmartStart}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-sm transition-all duration-200 hover:scale-105 whitespace-nowrap shadow-lg shadow-amber-900/30"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              Start Now
            </button>
          </div>
        </div>
      </div>

      {/* Content Rows */}
      <div className="pb-20">
        <ContentRow
          title={`Because you watched ${featured.title}`}
          shows={squidGamePicks}
          progressMap={progressMap}
          onPressShow={onPlayShow}
          onMoreInfo={onSelectShow}
          badges={newBadges}
        />
        {continueWatching.length > 0 && (
          <ContentRow
            title="Continue Watching"
            shows={continueWatching}
            progressMap={progressMap}
            onPressShow={onPlayShow}
            onMoreInfo={onSelectShow}
          />
        )}
        <ContentRow
          title="Today's Top 10"
          shows={topWorthIt}
          progressMap={progressMap}
          onPressShow={onPlayShow}
          onMoreInfo={onSelectShow}
          variant="top10"
          badges={top10Badges}
        />
        <ContentRow
          title="Quick Watches"
          subtitle="Episodes under 35 minutes"
          shows={quickWatches}
          progressMap={progressMap}
          onPressShow={onPlayShow}
          onMoreInfo={onSelectShow}
          badges={newBadges}
        />
        <ContentRow
          title="Hindi Movies & Shows"
          subtitle="Family drama, action, comedy & more"
          shows={hindiShows}
          progressMap={progressMap}
          onPressShow={onPlayShow}
          onMoreInfo={onSelectShow}
          badges={newBadges}
        />
        <ContentRow
          title="Highly Rated"
          shows={highlyRated}
          progressMap={progressMap}
          onPressShow={onPlayShow}
          onMoreInfo={onSelectShow}
        />
        <ContentRow
          title="Mini-Series"
          subtitle="Complete stories — no open-ended commitments"
          shows={miniseries}
          progressMap={progressMap}
          onPressShow={onPlayShow}
          onMoreInfo={onSelectShow}
        />
        <ContentRow
          title="Wind Down"
          subtitle="Low-stress picks for relaxed evenings"
          shows={relaxedPicks}
          progressMap={progressMap}
          onPressShow={onPlayShow}
          onMoreInfo={onSelectShow}
        />
      </div>

      {/* Footer */}
      <footer className="px-4 md:px-12 py-8 border-t border-gray-900">
        <p className="text-gray-600 text-xs text-center">
          This product uses the TMDb API but is not endorsed or certified by TMDb.
        </p>
      </footer>
    </div>
  );
}

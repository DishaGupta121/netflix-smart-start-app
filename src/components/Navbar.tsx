import { Bell, Search, ChevronDown, Sparkles, X, Film, SearchX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SHOWS } from '../data/shows';
import type { Show } from '../types';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onSmartStart: () => void;
  onSelectShow: (showId: string) => void;
}

export default function Navbar({ onNavigate, currentPage, onSmartStart, onSelectShow }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [searchOpen]);

  const trimmed = query.trim().toLowerCase();
  const searchResults: Show[] = trimmed
    ? SHOWS.filter(
        (s) =>
          s.title.toLowerCase().includes(trimmed) ||
          s.genres.some((g) => g.toLowerCase().includes(trimmed)),
      ).slice(0, 8)
    : [];

  const handleSelectResult = (showId: string) => {
    onSelectShow(showId);
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between transition-all duration-300"
      style={{
        height: 68,
        paddingLeft: 'clamp(16px, 4vw, 60px)',
        paddingRight: 'clamp(16px, 4vw, 60px)',
        backgroundColor: scrolled ? '#141414' : 'transparent',
        backgroundImage: scrolled
          ? 'none'
          : 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.45)' : 'none',
      }}
    >
      {/* Left: Logo + Nav Links */}
      <div className="flex items-center" style={{ gap: 'clamp(20px, 2.5vw, 40px)' }}>
        <button
          onClick={() => onNavigate('home')}
          className="flex-shrink-0 leading-none hover:opacity-90 transition-opacity duration-200"
          style={{ lineHeight: 1 }}
          aria-label="Netflix"
        >
          <svg
            viewBox="0 0 210 52"
            xmlns="http://www.w3.org/2000/svg"
            style={{ height: 32, display: 'block', overflow: 'visible' }}
            aria-hidden="true"
          >
            <defs>
              {/* Main cinematic red gradient — dark top, bright mid, deep bottom */}
              <linearGradient id="nf-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d0000" />
                <stop offset="28%" stopColor="#b80a0a" />
                <stop offset="52%" stopColor="#e8100e" />
                <stop offset="75%" stopColor="#c40c0c" />
                <stop offset="100%" stopColor="#7a0303" />
              </linearGradient>

              {/* Highlight sheen across upper third */}
              <linearGradient id="nf-sheen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,180,180,0.18)" />
                <stop offset="40%" stopColor="rgba(255,100,100,0.06)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </linearGradient>

              {/* 3-D depth: drop shadow + inner shadow via feComponentTransfer */}
              <filter id="nf-depth" x="-4%" y="-10%" width="108%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.85" result="shadow" />
                {/* inner top shadow */}
                <feFlood floodColor="#000" floodOpacity="0.45" result="innerFlood" />
                <feComposite in="innerFlood" in2="SourceAlpha" operator="in" result="innerMask" />
                <feOffset dx="0" dy="2" in="innerMask" result="innerOffset" />
                <feComposite in="SourceGraphic" in2="innerOffset" operator="over" />
              </filter>
            </defs>

            {/* Depth layer — slightly offset dark clone for 3-D thickness */}
            <text
              x="105" y="46"
              textAnchor="middle"
              fontFamily="'Oswald', 'Arial Narrow', Arial, sans-serif"
              fontWeight="700"
              fontSize="50"
              letterSpacing="3"
              fill="#1a0000"
              style={{ userSelect: 'none' }}
              dy="2"
              dx="1.5"
            >
              NETFLIX
            </text>

            {/* Main text with gradient + depth filter */}
            <text
              x="105" y="46"
              textAnchor="middle"
              fontFamily="'Oswald', 'Arial Narrow', Arial, sans-serif"
              fontWeight="700"
              fontSize="50"
              letterSpacing="3"
              fill="url(#nf-grad)"
              filter="url(#nf-depth)"
              style={{ userSelect: 'none' }}
            >
              NETFLIX
            </text>

            {/* Sheen overlay for highlight */}
            <text
              x="105" y="46"
              textAnchor="middle"
              fontFamily="'Oswald', 'Arial Narrow', Arial, sans-serif"
              fontWeight="700"
              fontSize="50"
              letterSpacing="3"
              fill="url(#nf-sheen)"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              NETFLIX
            </text>
          </svg>
        </button>
        <div
          className="hidden md:flex items-center text-gray-300"
          style={{ fontSize: 14, fontWeight: 500, gap: 'clamp(20px, 2vw, 36px)' }}
        >
          <button
            onClick={() => onNavigate('home')}
            className={`hover:text-white transition-colors duration-200 whitespace-nowrap ${
              currentPage === 'home' ? 'text-white' : ''
            }`}
            style={{ fontWeight: currentPage === 'home' ? 600 : 500 }}
          >
            Home
          </button>
          <button className="hover:text-white transition-colors duration-200 whitespace-nowrap">Shows</button>
          <button className="hover:text-white transition-colors duration-200 whitespace-nowrap">Movies</button>
          <button className="hover:text-white transition-colors duration-200 whitespace-nowrap hidden lg:block">
            New &amp; Popular
          </button>
          <button
            onClick={() => onNavigate('my-list')}
            className={`hover:text-white transition-colors duration-200 whitespace-nowrap ${
              currentPage === 'my-list' ? 'text-white' : ''
            }`}
            style={{ fontWeight: currentPage === 'my-list' ? 600 : 500 }}
          >
            My List
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center" style={{ gap: 'clamp(12px, 1.5vw, 22px)' }}>
        <button
          onClick={onSmartStart}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-full transition-all duration-200 hover:scale-105 whitespace-nowrap"
          style={{ height: 40, paddingLeft: 'clamp(12px, 1vw, 16px)', paddingRight: 'clamp(12px, 1vw, 16px)', fontSize: 12, fontWeight: 700 }}
        >
          <Sparkles size={12} />
          <span className="hidden sm:inline">Smart Start</span>
          <span className="sm:hidden">AI</span>
        </button>

        <div className="relative" ref={searchContainerRef}>
          {searchOpen ? (
            <div
              className="flex items-center rounded-md overflow-hidden transition-all duration-200"
              style={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Search size={16} className="text-gray-500 ml-2.5 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Titles, genres"
                className="bg-transparent text-white px-2 py-1.5 w-40 sm:w-56 outline-none placeholder:text-gray-600"
                style={{ fontSize: 14 }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setQuery('');
                  }
                }}
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
                className="text-gray-500 hover:text-white px-2 shrink-0 transition-colors"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="text-gray-200 hover:text-white transition-colors duration-200"
              aria-label="Search"
            >
              <Search size={17} />
            </button>
          )}

          {searchOpen && trimmed && (
            <div
              className="absolute top-full right-0 mt-2 w-72 sm:w-80 rounded-lg shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
              style={{ backgroundColor: 'rgba(20,20,20,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {searchResults.length > 0 ? (
                <ul className="max-h-[60vh] overflow-y-auto">
                  {searchResults.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => handleSelectResult(s.id)}
                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors duration-200 group"
                      >
                        <div className="w-10 h-14 rounded overflow-hidden bg-gray-800 shrink-0">
                          <img
                            src={s.imageUrl}
                            alt={s.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate group-hover:text-white">
                            {s.title}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {s.genres.slice(0, 2).join(' · ')} · {s.releaseYear}
                          </p>
                        </div>
                        <Film size={14} className="text-gray-600 group-hover:text-gray-300 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center text-center px-6 py-8">
                  <div className="w-14 h-14 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                    <SearchX size={24} className="text-gray-600" />
                  </div>
                  <p className="text-gray-300 text-sm font-medium mb-1">No results for "{query.trim()}"</p>
                  <p className="text-gray-600 text-xs mb-5">
                    Try a different title or genre.
                  </p>
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery('');
                      onNavigate('home');
                    }}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-white/85 text-black font-bold px-4 py-2 rounded text-xs transition-all duration-200 hover:scale-105"
                  >
                    <Sparkles size={13} />
                    Browse All Shows
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="text-gray-200 hover:text-white transition-colors duration-200 relative">
          <Bell size={17} />
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
            3
          </span>
        </button>

        <button className="flex items-center gap-1.5 text-gray-200 hover:text-white transition-colors duration-200 group">
          <div
            className="rounded overflow-hidden bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ width: 32, height: 32 }}
          >
            U
          </div>
          <ChevronDown size={13} className="transition-transform group-hover:rotate-180 duration-200" />
        </button>
      </div>
    </nav>
  );
}

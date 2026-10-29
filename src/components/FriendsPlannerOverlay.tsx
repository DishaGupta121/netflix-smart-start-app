import { useState, useEffect } from 'react';
import { X, Send, Clock, Check, ArrowRight, MessageCircle, Plus } from 'lucide-react';
import type { Show } from '../types';
import { SHOWS } from '../data/shows';

interface FriendsPlannerOverlayProps {
  candidates: Show[];
  accentText: string;
  accentBorder: string;
  accentBg: string;
  onClose: () => void;
  onReveal: () => void;
}

type Phase = 'compose' | 'sending' | 'waiting' | 'replied';

const MOCK_FRIEND = 'Alex';
const MOCK_MESSAGES = [
  'Yo! I\'m down. Added a couple I\'ve been wanting to watch too 👀',
  'Perfect timing! Just sent over 2 picks I\'ve been hyped about.',
  'Let\'s gooo. I threw in some options — check them out!',
];

export default function FriendsPlannerOverlay({
  candidates,
  accentText,
  accentBorder,
  accentBg,
  onClose,
  onReveal,
}: FriendsPlannerOverlayProps) {
  const [phase, setPhase] = useState<Phase>('compose');
  const [waitDots, setWaitDots] = useState(0);
  const [messageIdx] = useState(() => Math.floor(Math.random() * MOCK_MESSAGES.length));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(candidates.map((s) => s.id))
  );
  const [friendPicks, setFriendPicks] = useState<Show[]>([]);

  const toggleShow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedShows = candidates.filter((s) => selectedIds.has(s.id));

  // Animated dots during the "waiting" phase
  useEffect(() => {
    if (phase !== 'waiting') return;
    setWaitDots(0);
    const dotIv = setInterval(() => setWaitDots((d) => (d + 1) % 4), 400);
    const doneTimer = setTimeout(() => setPhase('replied'), 2600);
    return () => { clearInterval(dotIv); clearTimeout(doneTimer); };
  }, [phase]);

  const handleSend = () => {
    const remaining = SHOWS.filter((s) => !selectedIds.has(s.id));
    const shuffled = [...remaining].sort(() => Math.random() - 0.5).slice(0, 3);
    setFriendPicks(shuffled);
    setPhase('sending');
    setTimeout(() => setPhase('waiting'), 900);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden"
        style={{ animation: 'modalFadeIn 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* COMPOSE */}
        {phase === 'compose' && (
          <div className="px-6 pt-10 pb-8">
            <div className="text-center mb-5">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
              >
                <Send size={22} style={{ color: accentText }} />
              </div>
              <h3 className="text-white text-lg font-black uppercase tracking-widest mb-1">Movie Night Planner</h3>
              <p className="text-gray-400 text-xs px-4">
                Build your shortlist, then send it to a friend. They'll add their picks — all right here, no links.
              </p>
            </div>

            {/* Shortlist builder */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest">
                  Suggested picks
                </p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ color: accentText, background: accentBg, border: `1px solid ${accentBorder}` }}
                >
                  {selectedShows.length} selected
                </span>
              </div>
              <p className="text-gray-600 text-[10px] mb-2.5">
                Tap to add or remove from your shortlist
              </p>
              <div className="space-y-1.5">
                {candidates.map((show) => {
                  const isSelected = selectedIds.has(show.id);
                  return (
                    <button
                      key={show.id}
                      onClick={() => toggleShow(show.id)}
                      className="w-full flex items-center gap-2 rounded-lg p-1.5 transition-all"
                      style={{
                        background: isSelected ? accentBg : 'transparent',
                        border: `1px solid ${isSelected ? accentBorder : '#1f2937'}`,
                      }}
                    >
                      <img src={show.imageUrl} alt={show.title} className="w-9 h-6 object-cover rounded flex-shrink-0" />
                      <span
                        className="text-xs truncate flex-1 text-left"
                        style={{ color: isSelected ? '#e5e7eb' : '#6b7280' }}
                      >
                        {show.title}
                      </span>
                      {isSelected ? (
                        <Check size={12} className="flex-shrink-0" style={{ color: accentText }} />
                      ) : (
                        <Plus size={12} className="flex-shrink-0 text-gray-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Your shortlist preview */}
            {selectedShows.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 mb-4">
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-2">
                  Your shortlist
                </p>
                <div className="space-y-1.5">
                  {selectedShows.map((show, i) => (
                    <div key={show.id} className="flex items-center gap-2">
                      <img src={show.imageUrl} alt={show.title} className="w-9 h-6 object-cover rounded flex-shrink-0" />
                      <span className="text-gray-300 text-xs truncate flex-1">{show.title}</span>
                      {i === 0 && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: accentText, background: accentBg, border: `1px solid ${accentBorder}` }}
                        >
                          Top
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={selectedShows.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed"
              style={selectedShows.length === 0 ? undefined : { background: accentText, color: '#111827' }}
            >
              <Send size={14} />
              Send to {MOCK_FRIEND}
            </button>
            <p className="text-center text-gray-600 text-[10px] mt-2">
              Same-device demo — nothing actually gets sent
            </p>
          </div>
        )}

        {/* SENDING */}
        {phase === 'sending' && (
          <div className="px-6 pt-16 pb-16 text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
            >
              <Send
                size={24}
                style={{ color: accentText, animation: 'friendSend 0.8s ease-in-out infinite' }}
              />
            </div>
            <p className="text-gray-300 text-sm font-semibold">Sending to {MOCK_FRIEND}…</p>
          </div>
        )}

        {/* WAITING */}
        {phase === 'waiting' && (
          <div className="px-6 pt-16 pb-16 text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
            >
              <Clock size={24} style={{ color: accentText }} className="animate-pulse" />
            </div>
            <p className="text-gray-300 text-sm font-semibold mb-1">
              Waiting for {MOCK_FRIEND} to reply{'.'.repeat(waitDots)}
            </p>
            <p className="text-gray-600 text-xs">They're checking out your list</p>
          </div>
        )}

        {/* REPLIED */}
        {phase === 'replied' && (
          <div className="px-6 pt-8 pb-8">
            <div className="text-center mb-5">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
              >
                <MessageCircle size={20} style={{ color: accentText }} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accentText }}>
                {MOCK_FRIEND} replied
              </p>
            </div>

            {/* Friend's message bubble */}
            <div
              className="rounded-2xl rounded-bl-md border p-3 mb-4"
              style={{
                borderColor: accentBorder,
                background: `linear-gradient(135deg, ${accentBg}, rgba(17,24,39,0.6))`,
                animation: 'feedbackAckPop 0.4s ease-out',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: accentText, color: '#111827' }}
                >
                  {MOCK_FRIEND[0]}
                </div>
                <span className="text-gray-300 text-xs font-semibold">{MOCK_FRIEND}</span>
                <span className="text-gray-600 text-[10px]">just now</span>
              </div>
              <p className="text-gray-200 text-xs leading-relaxed">{MOCK_MESSAGES[messageIdx]}</p>
            </div>

            {/* Friend's added picks */}
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-2">
              {MOCK_FRIEND} added these to tonight's list
            </p>
            <div className="space-y-2 mb-5">
              {friendPicks.map((show, i) => (
                <div
                  key={show.id}
                  className="flex items-center gap-3 rounded-xl border p-2.5"
                  style={{
                    borderColor: i === 0 ? accentBorder : '#1f2937',
                    background: i === 0 ? accentBg : 'rgba(17,24,39,0.6)',
                    animation: `friendCardIn 0.4s ease-out ${i * 0.12}s both`,
                  }}
                >
                  <img src={show.imageUrl} alt={show.title} className="w-12 h-9 object-cover rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{show.title}</p>
                    <p className="text-gray-500 text-[10px]">{show.genres[0]} · {show.avgEpisodeMinutes}m</p>
                  </div>
                  {i === 0 && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1"
                      style={{ color: accentText, background: accentBg, border: `1px solid ${accentBorder}` }}
                    >
                      <Check size={8} /> Top
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={onReveal}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: accentText, color: '#111827' }}
            >
              See your matches <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Users, Check, Star, ArrowRight, RotateCw } from 'lucide-react';
import type { Show } from '../types';

interface FamilyVotingOverlayProps {
  candidates: Show[];
  accentText: string;
  accentBorder: string;
  accentBg: string;
  onClose: () => void;
  onReveal: () => void;
}

const FAMILY_MEMBERS = ['Dad', 'Mom', 'Kid'];

export default function FamilyVotingOverlay({
  candidates,
  accentText,
  accentBorder,
  accentBg,
  onClose,
  onReveal,
}: FamilyVotingOverlayProps) {
  const [phase, setPhase] = useState<'setup' | 'voting' | 'tally' | 'done'>('setup');
  const [voterIndex, setVoterIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, ('yes' | 'no' | null)[]>>({});
  const [tallyNum, setTallyNum] = useState(3);

  useEffect(() => {
    if (phase !== 'tally') return;
    setTallyNum(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setPhase('done');
      } else {
        setTallyNum(n);
      }
    }, 600);
    return () => clearInterval(iv);
  }, [phase]);

  const startVoting = () => {
    const init: Record<string, ('yes' | 'no' | null)[]> = {};
    FAMILY_MEMBERS.forEach((m) => { init[m] = candidates.map(() => null); });
    setVotes(init);
    setVoterIndex(0);
    setPhase('voting');
  };

  const castVote = (showIdx: number, vote: 'yes' | 'no') => {
    const member = FAMILY_MEMBERS[voterIndex];
    setVotes((prev) => {
      const next = { ...prev, [member]: [...prev[member]] };
      next[member][showIdx] = vote;
      return next;
    });
  };

  const allVoted = (member: string) => votes[member]?.every((v) => v !== null) ?? false;

  const nextVoter = () => {
    if (voterIndex < FAMILY_MEMBERS.length - 1) {
      setVoterIndex(voterIndex + 1);
    } else {
      setPhase('tally');
    }
  };

  const yesCounts = candidates.map((_, i) =>
    FAMILY_MEMBERS.reduce((acc, m) => acc + (votes[m]?.[i] === 'yes' ? 1 : 0), 0)
  );
  const winnerIdx = yesCounts.indexOf(Math.max(...yesCounts));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
      <div
        className="relative w-full max-w-lg bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden"
        style={{ animation: 'modalFadeIn 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* SETUP */}
        {phase === 'setup' && (
          <div className="px-6 pt-10 pb-8 text-center">
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
            >
              <Users size={24} style={{ color: accentText }} />
            </div>
            <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2">Family Vote</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 px-2">
              Everyone gets a say. {FAMILY_MEMBERS.length} family members vote on {candidates.length} titles. The most-loved pick wins the night.
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              {FAMILY_MEMBERS.map((m) => (
                <div key={m} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentText }}
                  >
                    {m[0]}
                  </div>
                  <span className="text-gray-500 text-[10px]">{m}</span>
                </div>
              ))}
            </div>
            <button
              onClick={startVoting}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: accentText, color: '#111827' }}
            >
              Start the vote
            </button>
          </div>
        )}

        {/* VOTING */}
        {phase === 'voting' && (
          <div className="px-6 pt-8 pb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: accentText, color: '#111827' }}
              >
                {voterIndex + 1}
              </div>
              <p className="text-white text-sm font-bold uppercase tracking-widest">
                {FAMILY_MEMBERS[voterIndex]}'s turn
              </p>
            </div>

            {/* Voter progress dots */}
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {FAMILY_MEMBERS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === voterIndex ? 24 : 8,
                    background: i <= voterIndex ? accentText : '#374151',
                  }}
                />
              ))}
            </div>

            <div className="space-y-2 mb-5">
              {candidates.map((show, i) => {
                const myVote = votes[FAMILY_MEMBERS[voterIndex]]?.[i];
                return (
                  <div
                    key={show.id}
                    className="flex items-center gap-3 rounded-xl border p-2.5 transition-all"
                    style={{
                      borderColor: myVote ? accentBorder : '#1f2937',
                      background: myVote === 'yes' ? accentBg : myVote === 'no' ? 'rgba(239,68,68,0.05)' : 'rgba(17,24,39,0.6)',
                    }}
                  >
                    <img src={show.imageUrl} alt={show.title} className="w-12 h-9 object-cover rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{show.title}</p>
                      <p className="text-gray-500 text-[10px]">{show.genres[0]} · {show.avgEpisodeMinutes}m</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => castVote(i, 'yes')}
                        className="w-8 h-8 rounded-full flex items-center justify-center border transition-all"
                        style={{
                          borderColor: myVote === 'yes' ? accentBorder : '#374151',
                          background: myVote === 'yes' ? accentText : 'transparent',
                          color: myVote === 'yes' ? '#111827' : '#9ca3af',
                        }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => castVote(i, 'no')}
                        className="w-8 h-8 rounded-full flex items-center justify-center border transition-all"
                        style={{
                          borderColor: myVote === 'no' ? 'rgba(239,68,68,0.5)' : '#374151',
                          background: myVote === 'no' ? 'rgba(239,68,68,0.15)' : 'transparent',
                          color: myVote === 'no' ? '#f87171' : '#9ca3af',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={nextVoter}
              disabled={!allVoted(FAMILY_MEMBERS[voterIndex])}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: accentText, color: '#111827' }}
            >
              {voterIndex < FAMILY_MEMBERS.length - 1 ? (
                <>Pass to {FAMILY_MEMBERS[voterIndex + 1]} <ArrowRight size={14} /></>
              ) : (
                <>Tally the votes <ArrowRight size={14} /></>
              )}
            </button>
          </div>
        )}

        {/* TALLY */}
        {phase === 'tally' && (
          <div className="px-6 pt-16 pb-16 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 animate-pulse">Counting votes</p>
            <div
              key={tallyNum}
              className="text-6xl font-black"
              style={{ color: accentText, animation: 'vetoCountdownPulse 0.6s ease-out' }}
            >
              {tallyNum}
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div className="px-6 pt-8 pb-8">
            <div className="text-center mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: accentText }}>
                Family's pick
              </p>
              <h3 className="text-white text-lg font-black uppercase tracking-widest">
                {candidates[winnerIdx]?.title ?? 'No winner'}
              </h3>
            </div>

            <div
              className="rounded-2xl border-2 p-4 mb-4"
              style={{
                borderColor: accentBorder,
                background: `linear-gradient(135deg, ${accentBg}, rgba(17,24,39,0.7))`,
                animation: 'vetoSurvivorReveal 0.6s ease-out',
              }}
            >
              <div className="flex items-center gap-3">
                <img src={candidates[winnerIdx].imageUrl} alt={candidates[winnerIdx].title} className="w-16 h-24 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star size={13} style={{ color: accentText }} />
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accentText }}>Winner</p>
                  </div>
                  <p className="text-white text-base font-black leading-tight mb-1">{candidates[winnerIdx].title}</p>
                  <p className="text-gray-300 text-xs">{candidates[winnerIdx].genres[0]} · {candidates[winnerIdx].avgEpisodeMinutes}m</p>
                  <p className="text-gray-400 text-[11px] mt-1 italic">"{candidates[winnerIdx].tagline}"</p>
                </div>
              </div>
            </div>

            {/* Vote breakdown */}
            <div className="space-y-1.5 mb-5">
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest">Vote breakdown</p>
              {candidates.map((show, i) => (
                <div key={show.id} className="flex items-center gap-2">
                  <span className="text-gray-400 text-[11px] flex-1 truncate">{show.title}</span>
                  <div className="flex gap-0.5">
                    {FAMILY_MEMBERS.map((m, mi) => (
                      <div
                        key={mi}
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{
                          background: votes[m]?.[i] === 'yes' ? accentText : votes[m]?.[i] === 'no' ? 'rgba(239,68,68,0.2)' : '#1f2937',
                        }}
                      >
                        {votes[m]?.[i] === 'yes' && <Check size={9} className="text-gray-900" />}
                      </div>
                    ))}
                  </div>
                  <span className="text-white text-[11px] font-bold w-5 text-right">{yesCounts[i]}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onReveal}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 mb-2"
              style={{ background: accentText, color: '#111827' }}
            >
              See your matches <ArrowRight size={14} />
            </button>
            <button
              onClick={() => { setPhase('setup'); setVoterIndex(0); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <RotateCw size={12} /> Vote again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

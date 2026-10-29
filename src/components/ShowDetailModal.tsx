import {
  Play,
  Plus,
  ThumbsUp,
  ThumbsDown,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Star,
  Check,
  CheckCircle2,
  Users,
  User,
  Heart,
  Smile,
  ArrowRight,
  Brain,
    TrendingUp,
  Download,
  Bell,
  SkipForward,
  Repeat,
  ArrowLeft,
  Shuffle,
  Wand2,
  PartyPopper,
  Image as ImageIcon,
  UserPlus,
  Send,
  Mail,
  Share2,
  Link2 as Link2Icon,
  Calendar,
  CalendarDays,
  Clock3,
  Check as CheckIcon,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Show, Mood, WatchingWith, WatchProgress } from '../types';
import { SHOWS, getShowById, computeFitScore } from '../data/shows';
import WorthItMeter from './WorthItMeter';
import SmartStartWatchPlan from './SmartStartWatchPlan';
import ComplexityBar from './ComplexityBar';
import WatchCard from './WatchCard';
import Confetti from './Confetti';
import FamilyVotingOverlay from './FamilyVotingOverlay';
import FriendsPlannerOverlay from './FriendsPlannerOverlay';
import { supabase } from '../lib/supabase';

type Tab = 'overview' | 'episodes' | 'more-like-this' | 'smart-start';

interface ShowDetailModalProps {
  showId: string | null; // null = discovery mode
  onPlay: (showId: string) => void;
  onClose: () => void;
  onSelectShow: (showId: string) => void;
  onProgressChanged?: () => void;
  onOpenResumeHelper?: (showId: string) => void;
  initialTab?: Tab; // For discovery mode, default to smart-start
}

function RingFillCalculating({
  targetScore,
  progress,
}: {
  targetScore: number;
  progress: number;
}) {
  const dim = 120;
  const stroke = 8;
  const radius = (dim - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const currentScore = targetScore * progress;
  const offset = ((100 - currentScore) / 100) * circumference;

  const phrases = [
    'Checking your mood…',
    'Checking your time…',
    "Checking who's with you…",
  ];
  const phraseIndex = Math.min(
    phrases.length - 1,
    Math.floor(progress * phrases.length),
  );

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="#1A1D2E"
            strokeWidth={stroke}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-black text-white tabular-nums">
            {Math.round(currentScore)}
          </span>
        </div>
      </div>
      <p
        key={phraseIndex}
        className="mt-3 text-gray-400 text-sm animate-[fadeScaleIn_0.25s_ease-out]"
      >
        {phrases[phraseIndex]}
      </p>
    </div>
  );
}

const MOOD_LABELS: Record<string, string> = {
  relaxed: 'Relaxed',
  excited: 'Thrilling',
  sad: 'Emotional',
  focused: 'Cerebral',
  adventurous: 'Adventurous',
  romantic: 'Romantic',
  anxious: 'Easy Watch',
  social: 'Social',
};

const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'relaxed', label: 'Relaxed', emoji: '😌' },
  { id: 'excited', label: 'Excited', emoji: '🔥' },
  { id: 'sad', label: 'Emotional', emoji: '🌧️' },
  { id: 'focused', label: 'Focused', emoji: '🧠' },
  { id: 'adventurous', label: 'Adventurous', emoji: '🌍' },
  { id: 'romantic', label: 'Romantic', emoji: '✨' },
  { id: 'anxious', label: 'Light & Easy', emoji: '🌿' },
  { id: 'social', label: 'Social', emoji: '🎉' },
];

const TIME_OPTIONS = [
  { minutes: 20, label: '20 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 90, label: '90 min' },
  { minutes: 180, label: '3 hrs' },
  { minutes: 360, label: 'All night' },
];

const WATCHING_WITH: { id: WatchingWith; label: string; Icon: typeof User }[] = [
  { id: 'alone', label: 'Alone', Icon: User },
  { id: 'partner', label: 'One other person', Icon: Heart },
  { id: 'family', label: 'Family', Icon: Users },
  { id: 'friends', label: 'Friends', Icon: Smile },
];

const RESUME_CONFIG = {
  easy: { color: 'text-green-400', bg: 'bg-green-950/30 border-green-800/40', label: 'Easy to Resume' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-950/30 border-yellow-800/40', label: 'Some Context Needed' },
  hard: { color: 'text-red-400', bg: 'bg-red-950/30 border-red-800/40', label: 'Hard to Resume' },
};

const CAST_MAP: Record<string, string[]> = {
  'midnight-protocol': ['Elena Vasquez', 'Marcus Webb', 'Dr. Priya Shen', 'Agent Cole'],
  'the-last-borough': ['James Nora', 'Hale Connors', 'Mara Lindt', 'Sgt. Pryce'],
  'deep-current': ['Sora Takahashi', 'Dr. Riku Endo', 'Kenji', 'Leona Cruz'],
  'afterglow': ['Yael Adler', 'Tom Brennan', 'Daria', 'Prosper'],
  'run-point': ['Coach Daria', 'Leon Mbeki', 'Zara Fox', 'Marcus'],
  'pale-signal': ['Agent Faye', 'Director Obi', 'The Courier', 'PRISM'],
  'roots-and-routes': ['Maya', 'Victor', 'Lila', 'Armand'],
  'the-quiet-engine': ['Dr. Hana', 'VELA', 'Cmdr. Rei', 'Pascal'],
};

function getMockEpisodes(show: Show) {
  const episodes = [];
  let epNum = 1;
  for (let s = 1; s <= show.seasons; s++) {
    const epsPerSeason = Math.round(show.totalEpisodes / show.seasons);
    for (let e = 1; e <= epsPerSeason && epNum <= show.totalEpisodes; e++) {
      episodes.push({
        season: s,
        episode: e,
        title: `Episode ${e}`,
        duration: show.avgEpisodeMinutes,
      });
      epNum++;
    }
  }
  return episodes;
}

export default function ShowDetailModal({
  showId,
  onPlay,
  onClose,
  onSelectShow,
  onProgressChanged,
  onOpenResumeHelper,
  initialTab,
}: ShowDetailModalProps) {
  const isDiscoveryMode = !showId;
  const [currentShowId, setCurrentShowId] = useState<string | null>(showId);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || (isDiscoveryMode ? 'smart-start' : 'overview'));
  const [isMuted, setIsMuted] = useState(true);

  // Smart Start state
  const [mood, setMood] = useState<Mood | null>(null);
  const [minutes, setMinutes] = useState<number | null>(90);
  const [watchingWith, setWatchingWith] = useState<WatchingWith | null>(null);

  // Invite flow — when watching with others, send/share an invite
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteToast, setInviteToast] = useState<string | null>(null);

  // Detect whether we're running inside an iframe (e.g. Bolt preview) where
  // navigator.share is blocked by the sandbox regardless of device capability.
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Shared share/invite helper — native share sheet is the primary path.
  // In an iframe navigator.share throws NotAllowedError, so we detect that and
  // fall back to clipboard. User cancellation (AbortError) is a no-op — no toast.
  const shareMovieNight = async (shareText: string) => {
    const shareData = {
      title: 'Movie Night',
      text: shareText,
      url: typeof window !== 'undefined' ? window.location.origin : undefined,
    };

    if (navigator.share && !inIframe) {
      try {
        await navigator.share(shareData);
        setInviteToast('Shared!');
        setTimeout(() => setInviteToast(null), 3000);
        return;
      } catch (err: unknown) {
        const name = (err as DOMException)?.name;
        if (name === 'AbortError') return; // user dismissed the sheet — no toast
        // NotAllowedError or other failure — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setInviteToast('Copied to clipboard!');
    } catch {
      setInviteToast(shareText);
    }
    setTimeout(() => setInviteToast(null), 3000);
  };

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?join=${watchingWith ?? 'friends'}&t=${Date.now().toString(36)}`
    : '';

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    const subject = encodeURIComponent('Join me for a watch session on Smart Start');
    const body = encodeURIComponent(
      `Hey! I'm picking something to watch tonight and want you in.\n\nOpen the invite here: ${inviteLink}\n\nSee you on the couch!`
    );
    window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 3500);
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setInviteCopied(false);
    }
  };

  const handleShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my watch session',
          text: 'I\u2019m picking something for us to watch tonight — come help me choose!',
          url: inviteLink,
        });
      } catch {
        // user cancelled — no-op
      }
    } else {
      handleCopyInvite();
    }
  };
  const [smartStartResult, setSmartStartResult] = useState<{
    fitScore: number;
    alternatives: Show[];
  } | null>(null);
  const [watchPlanOpen, setWatchPlanOpen] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);

  // Discovery mode: Veto Round interactive moment (front-end only)
  const [vetoOpen, setVetoOpen] = useState(false);
  const [vetoPhase, setVetoPhase] = useState<'intro' | 'person1' | 'handoff' | 'person2' | 'countdown' | 'revealed'>('intro');
  const [vetoStack, setVetoStack] = useState<Show[]>([]);
  const [person1Votes, setPerson1Votes] = useState<('keep' | 'veto')[]>([]);
  const [person2Votes, setPerson2Votes] = useState<('keep' | 'veto')[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentSwipeDir, setCurrentSwipeDir] = useState<'left' | 'right' | null>(null);
  const [countdownNum, setCountdownNum] = useState(3);

  // Watch Card (shareable mini-poster)
  const [watchCardOpen, setWatchCardOpen] = useState(false);
  const [watchCardData, setWatchCardData] = useState<{
    show: Show;
    fitScore: number;
    verdict: string;
    mood: Mood | null;
    minutes: number | null;
    watchingWith: WatchingWith | null;
  } | null>(null);

  // Surprise Me
  const [surprisePhase, setSurprisePhase] = useState<'idle' | 'spinning' | 'revealed'>('idle');
  const [surprisePick, setSurprisePick] = useState<Show | null>(null);

  // Feedback loop ("Did we get it right?")
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [feedbackAck, setFeedbackAck] = useState(false);

  // Milestone micro-celebration (one-time, persisted in localStorage)
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [milestoneBadge, setMilestoneBadge] = useState<string | null>(null);
  const milestoneFiredRef = useRef<{ highFit: boolean; firstVeto: boolean }>({
    highFit: localStorage.getItem('milestone_high_fit') === '1',
    firstVeto: localStorage.getItem('milestone_first_veto') === '1',
  });

  const fireMilestone = (key: 'highFit' | 'firstVeto', label: string) => {
    if (milestoneFiredRef.current[key]) return;
    milestoneFiredRef.current[key] = true;
    localStorage.setItem(key === 'highFit' ? 'milestone_high_fit' : 'milestone_first_veto', '1');
    setMilestoneBadge(label);
    setConfettiTrigger((t) => t + 1);
    setTimeout(() => setMilestoneBadge(null), 3500);
  };

  const openWatchCard = (
    show: Show,
    fitScore: number,
    verdict: string,
    moodVal: Mood | null,
    minutesVal: number | null,
    watchingWithVal: WatchingWith | null
  ) => {
    setWatchCardData({ show, fitScore, verdict, mood: moodVal, minutes: minutesVal, watchingWith: watchingWithVal });
    setWatchCardOpen(true);
  };

  const closeWatchCard = () => setWatchCardOpen(false);

  // Surprise Me — pick a random show with a fun spin reveal
  const runSurpriseMe = () => {
    setSurprisePhase('spinning');
    setSurprisePick(null);
    let cycles = 0;
    const iv = setInterval(() => {
      setSurprisePick(SHOWS[Math.floor(Math.random() * SHOWS.length)]);
      cycles += 1;
      if (cycles > 12) {
        clearInterval(iv);
        const final = SHOWS[Math.floor(Math.random() * SHOWS.length)];
        setSurprisePick(final);
        setSurprisePhase('revealed');
      }
    }, 80);
  };

  // Discovery mode: list of recommended shows
  const [discoveryRecs, setDiscoveryRecs] = useState<Show[]>([]);

  // Discovery mode: four-card sequential flow (1=basics, 2=decision, 3=schedule, 4=results)
  const [discoveryCard, setDiscoveryCard] = useState<1 | 2 | 3 | 4>(1);
  const [familyVotingOpen, setFamilyVotingOpen] = useState(false);
  const [friendsPlannerOpen, setFriendsPlannerOpen] = useState(false);

  // Schedule It state (mocked, local only)
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);



  // The show picked from the live preview (Together path advances to Schedule It with this title)
  const [pickedShow, setPickedShow] = useState<Show | null>(null);

  // Ring-fill calculating moment: animate 0 → 1 over ~1.6s
  useEffect(() => {
    if (!smartStartResult) {
      setRevealProgress(0);
      return;
    }
    setRevealProgress(0);
    const start = performance.now();
    const duration = 1600;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setRevealProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [smartStartResult]);

  const [progress, setProgress] = useState<WatchProgress | null>(null);
  const [inContinueWatching, setInContinueWatching] = useState(false);
  const [watchHistory, setWatchHistory] = useState<WatchProgress[]>([]);

  const show = currentShowId ? getShowById(currentShowId) : null;

  const similar = show
    ? SHOWS.filter((s) => s.id !== show.id && s.genres.some((g) => show.genres.includes(g))).slice(0, 12)
    : [];

  const episodes = show ? getMockEpisodes(show) : [];
  const cast = show ? CAST_MAP[show.id] || show.characters.map((c) => c.name) : [];
  const moodLabel = show ? show.moodTags.slice(0, 2).map((m) => MOOD_LABELS[m] || m).join(', ') : '';

  const totalH = show ? Math.floor(show.totalMinutes / 60) : 0;
  const totalM = show ? show.totalMinutes % 60 : 0;
  const durationLabel = show
    ? show.contentType === 'movie'
      ? `${totalH}h ${totalM}m`
      : `${show.seasons} Season${show.seasons !== 1 ? 's' : ''}`
    : '';
  const ageLabel = show ? (show.contentType === 'movie' ? 'U/A' : 'TV-MA') : '';
  const diffConfig = show ? RESUME_CONFIG[show.resumeDifficulty] : null;

  useEffect(() => {
    if (!show) return;
    supabase
      .from('watch_progress')
      .select('*')
      .eq('show_id', show.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProgress(data as WatchProgress);
          setInContinueWatching(true);
        } else {
          setInContinueWatching(false);
        }
      });
  }, [show]);

  useEffect(() => {
    supabase
      .from('watch_progress')
      .select('*')
      .order('last_watched_at', { ascending: false })
      .then(({ data }) => {
        if (data) setWatchHistory(data as WatchProgress[]);
      });
  }, []);

  const handleAddToContinueWatching = useCallback(async () => {
    if (!show || inContinueWatching) return;
    const minutesWatched = Math.round(show.totalMinutes * 0.55);
    const { data } = await supabase
      .from('watch_progress')
      .upsert(
        {
          show_id: show.id,
          season_num: 1,
          episode_num: Math.max(1, Math.floor(show.totalEpisodes * 0.55)),
          status: 'watching',
          total_minutes_watched: minutesWatched,
          last_watched_at: new Date().toISOString(),
        },
        { onConflict: 'show_id' }
      )
      .select()
      .maybeSingle();
    if (data) {
      setProgress(data as WatchProgress);
      setInContinueWatching(true);
      if (onProgressChanged) onProgressChanged();
    }
  }, [show, inContinueWatching, onProgressChanged]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const switchShow = (id: string) => {
    setCurrentShowId(id);
    setActiveTab('overview');
    setSmartStartResult(null);
    setMood(null);
    setMinutes(null);
    setWatchingWith(null);
  };

  // Smart Start handlers
  const canSubmitSmartStart = mood !== null && watchingWith !== null;

  // Veto Round — two people swipe through the same stack; survivors become the pick.
  const VETO_STACK_SIZE = 5;

  const startVetoRound = () => {
    if (!watchingWith || watchingWith === 'alone') return;
    const moodMatches = mood
      ? SHOWS.filter((s) => s.moodTags.includes(mood))
      : SHOWS;
    const pool = moodMatches.length >= VETO_STACK_SIZE ? moodMatches : SHOWS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, VETO_STACK_SIZE);
    setVetoStack(shuffled);
    setPerson1Votes([]);
    setPerson2Votes([]);
    setCurrentCardIndex(0);
    setCurrentSwipeDir(null);
    setVetoPhase('intro');
    setVetoOpen(true);
  };

  const closeVetoRound = () => {
    setVetoOpen(false);
    setVetoPhase('intro');
    setCurrentCardIndex(0);
    setCurrentSwipeDir(null);
  };

  // Discovery flow: advance to the live preview card (card 4)
  // Both Alone and Together go to live preview first. Schedule It (card 3)
  // happens after the user picks a title, only on the Together path.
  const goToRevealCard = () => {
    setFamilyVotingOpen(false);
    setFriendsPlannerOpen(false);
    setVetoOpen(false);
    handleSmartStartSubmit();
    setDiscoveryCard(4);
  };

  // Open a show's detail page directly from the discovery flow (primary action).
  const openShowDetail = (id: string) => {
    setCurrentShowId(id);
    setActiveTab('overview');
    setDiscoveryRecs([]);
    setSmartStartResult(null);
    setDiscoveryCard(1);
    setMood(null);
    setWatchingWith(null);
    setScheduledDate('');
    setScheduledTime('');
    setScheduleConfirmed(false);
  };

  // Schedule a show for later (secondary action) — opens the Schedule It card.
  const scheduleShow = (rec: Show) => {
    setPickedShow(rec);
    setScheduledDate('');
    setScheduledTime('');
    setScheduleConfirmed(false);
    setDiscoveryCard(3);
  };

  // Just Show the Best Match — instant top result, no game
  const showBestMatch = () => {
    const recs = SHOWS.slice().sort((a, b) =>
      computeFitScore(b, mood ?? 'relaxed', minutes ?? 90, watchingWith ?? 'alone') -
      computeFitScore(a, mood ?? 'relaxed', minutes ?? 90, watchingWith ?? 'alone')
    );
    const best = recs[0] ?? null;
    if (best) setPickedShow(best);
    setScheduledDate('');
    setScheduledTime('');
    setScheduleConfirmed(false);
    handleSmartStartSubmit(best);
    setDiscoveryCard(4);
  };


  const undoLastSwipe = () => {
    if (currentSwipeDir) return;
    const isPerson1 = vetoPhase === 'person1';
    const votes = isPerson1 ? person1Votes : person2Votes;
    if (votes.length === 0) return;
    const voteSetter = isPerson1 ? setPerson1Votes : setPerson2Votes;
    voteSetter((prev) => prev.slice(0, -1));
    setCurrentCardIndex((prev) => Math.max(0, prev - 1));
  };

  const castVote = (vote: 'keep' | 'veto') => {
    if (currentSwipeDir || currentCardIndex >= vetoStack.length) return;
    setCurrentSwipeDir(vote === 'keep' ? 'right' : 'left');
    const isPerson1 = vetoPhase === 'person1';
    const voteSetter = isPerson1 ? setPerson1Votes : setPerson2Votes;
    voteSetter((prev) => [...prev, vote]);
    const nextIndex = currentCardIndex + 1;
    setTimeout(() => {
      setCurrentSwipeDir(null);
      if (nextIndex < vetoStack.length) {
        setCurrentCardIndex(nextIndex);
      } else if (isPerson1) {
        setCurrentCardIndex(0);
        setVetoPhase('handoff');
      } else {
        setVetoPhase('countdown');
      }
    }, 320);
  };

  const startPerson2 = () => {
    setCurrentCardIndex(0);
    setVetoPhase('person2');
  };

  // Countdown effect: 3 → 2 → 1 → reveal
  useEffect(() => {
    if (vetoPhase !== 'countdown') return;
    setCountdownNum(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setVetoPhase('revealed');
      } else {
        setCountdownNum(n);
      }
    }, 700);
    return () => clearInterval(iv);
  }, [vetoPhase]);

  // Fire first-Veto-Round milestone when the reveal happens
  useEffect(() => {
    if (vetoPhase === 'revealed') {
      fireMilestone('firstVeto', 'First Veto Round complete!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vetoPhase]);

  // Fire high-fit-score milestone when discovery results show a 95+ top match
  useEffect(() => {
    if (discoveryRecs.length > 0 && mood && minutes && watchingWith) {
      const topFit = computeFitScore(discoveryRecs[0], mood, minutes, watchingWith);
      if (topFit >= 95) {
        fireMilestone('highFit', '95+ fit score!');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveryRecs]);

  const handleSmartStartSubmit = (pickedOverride?: Show | null) => {
    if (!canSubmitSmartStart) return;

    if (show) {
      // Show-specific mode
      const fitScore = computeFitScore(show, mood!, minutes!, watchingWith!);
      const alternatives = SHOWS.filter((s) => s.id !== show.id)
        .sort((a, b) => computeFitScore(b, mood!, minutes!, watchingWith!) - computeFitScore(a, mood!, minutes!, watchingWith!))
        .slice(0, 4);

      setSmartStartResult({ fitScore, alternatives });

      supabase
        .from('mood_sessions')
        .insert({
          mood,
          available_minutes: minutes,
          show_ids_recommended: [show.id, ...alternatives.map((s) => s.id)],
        })
        .then(() => {});
    } else {
      // Discovery mode — rank all shows by computeFitScore so mood,
      // time, and who each visibly affect the displayed scores.
      const picked = pickedOverride ?? pickedShow;
      const recs = SHOWS.slice()
        .sort((a, b) =>
          computeFitScore(b, mood!, minutes!, watchingWith!) -
          computeFitScore(a, mood!, minutes!, watchingWith!)
        )
        .slice(0, 8);

      // Guarantee the picked show (from Veto Round) is
      // present and first in the list, deduped.
      if (picked) {
        const deduped = recs.filter((s) => s.id !== picked.id);
        deduped.unshift(picked);
        setDiscoveryRecs(deduped);
      } else {
        setDiscoveryRecs(recs);
      }

      supabase
        .from('mood_sessions')
        .insert({
          mood,
          available_minutes: minutes,
          show_ids_recommended: (picked ? [picked.id] : []).concat(recs.map((s) => s.id).filter((id) => id !== picked?.id)),
        })
        .then(() => {});
    }
  };

  const epsTonight = minutes && show ? Math.max(0, Math.floor(minutes / show.avgEpisodeMinutes)) : 0;
  const moodMatch = show && mood ? show.moodTags.includes(mood) : false;
  const timeMatch = show && minutes ? show.avgEpisodeMinutes <= minutes : false;
  const groupMatch = show && watchingWith ? show.watchingWithTags.includes(watchingWith) : false;

  const fitVerdict = smartStartResult
    ? smartStartResult.fitScore >= 80
      ? { label: 'Perfect for tonight', color: 'text-amber-400' }
      : smartStartResult.fitScore >= 55
      ? { label: 'Mostly a match', color: 'text-amber-300' }
      : { label: 'Better saved for later', color: 'text-gray-400' }
    : null;

  // Personalized reasoning referencing the user's actual selections, tier-aware
  const selectedMoodLabel = mood ? MOOD_LABELS[mood] ?? mood : '';
  const selectedWithLabel = watchingWith
    ? WATCHING_WITH.find((w) => w.id === watchingWith)?.label ?? watchingWith
    : '';
  const selectedTimeLabel = minutes
    ? TIME_OPTIONS.find((t) => t.minutes === minutes)?.label ?? `${minutes} min`
    : '';
  const fitScore = smartStartResult?.fitScore ?? 0;
  const personalizedReasoning =
    selectedMoodLabel && selectedTimeLabel && selectedWithLabel && show
      ? fitScore >= 80
        ? `Because you're feeling ${selectedMoodLabel} and have ${selectedTimeLabel} with your ${selectedWithLabel}, ${show.title} hits the sweet spot.`
        : fitScore >= 55
        ? `You're feeling ${selectedMoodLabel} with ${selectedTimeLabel} and your ${selectedWithLabel} — ${show.title} is a decent match, though not a perfect one.`
        : `Honestly, ${show.title} isn't the ideal match for feeling ${selectedMoodLabel} with ${selectedTimeLabel} and your ${selectedWithLabel}, but here's why it's still worth considering.`
      : '';

  // Discovery mode: render Smart Start discovery UI
  if (isDiscoveryMode && !show) {
    const livePreview = mood || minutes || watchingWith
      ? SHOWS.slice()
          .sort((a, b) =>
            computeFitScore(b, mood ?? 'relaxed', minutes ?? 90, watchingWith ?? 'alone') -
            computeFitScore(a, mood ?? 'relaxed', minutes ?? 90, watchingWith ?? 'alone')
          )
          .slice(0, 3)
      : [];
    const accentText = '#e50914';
    const accentBorder = 'rgba(229,9,20,0.55)';
    const accentBg = 'rgba(229,9,20,0.12)';
    const accentGlow = 'rgba(229,9,20,0.22)';
    const selectionsMade = !!(mood && watchingWith);

    const companionNightLabel: Record<WatchingWith, string> = {
      alone: '',
      partner: 'Watching together',
      family: 'Family night',
      friends: 'Friends night',
    };

    const companionPhrase: Record<WatchingWith, string> = {
      alone: '',
      partner: 'watching together',
      family: 'family night',
      friends: 'movie night with friends',
    };

    const matchReason = (rec: Show): string => {
      const parts: string[] = [];
      if (mood && rec.moodTags.includes(mood)) {
        const moodLabel = MOOD_LABELS[mood]?.toLowerCase() ?? mood;
        parts.push(`Matches your ${moodLabel} mood`);
      }
      if (watchingWith && rec.watchingWithTags.includes(watchingWith) && companionPhrase[watchingWith]) {
        parts.push(`perfect for ${companionPhrase[watchingWith]}`);
      }
      if (parts.length === 0) parts.push('A solid pick for tonight');
      return parts.join(' · ');
    };

    return (
      <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        onClick={onClose}
      >
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" />

        <div
          className="relative w-full max-w-2xl rounded-lg shadow-2xl flex flex-col"
          style={{
            animation: 'panelSlideIn 0.22s ease-out',
            maxHeight: '88vh',
            background: 'linear-gradient(180deg, #0E1016 0%, #0B0D17 100%)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — always visible */}
          <div className="flex-shrink-0 flex items-center justify-between px-7 py-5 border-b border-[#1A1D2E]">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg border transition-all duration-500"
                style={{ background: accentBg, borderColor: accentBorder }}
              >
                <Sparkles size={16} style={{ color: accentText }} />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Not sure what to watch tonight?</h2>
                <p className="text-gray-500 text-xs">Pick any option — matches update live below</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1A1D2E] text-gray-400 hover:text-white transition-colors flex-shrink-0" style={{ background: 'rgba(14,16,22,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            className={`${discoveryCard === 4 ? 'flex flex-col flex-1 min-h-0' : 'overflow-y-auto px-7 py-6 space-y-5'}`}
          >
            {/* ───────────────── CARD 1: The Basics ───────────────── */}
            {discoveryCard === 1 && (
              <div style={{ animation: 'cardEnterUp 0.4s ease-out' }}>
                {/* Who are you watching with? — Alone / Together */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 transition-colors duration-500" style={{ color: accentText }}>
                    Who are you watching with?
                  </p>
                  <div className="flex gap-2">
                    {/* Alone */}
                    <button
                      onClick={() => setWatchingWith('alone')}
                      className="flex items-center gap-2 px-5 py-3 rounded-lg border text-sm font-medium transition-all flex-1 justify-center hover:border-[#2A2D42]"
                      style={watchingWith === 'alone'
                        ? { borderColor: accentBorder, background: accentBg, color: accentText }
                        : { borderColor: '#1A1D2E', background: 'rgba(11,13,23,0.7)', color: '#9ca3af' }}
                    >
                      <User size={14} />
                      Just me
                    </button>
                    {/* Together */}
                    <button
                      onClick={() => setWatchingWith('partner')}
                      className="flex items-center gap-2 px-5 py-3 rounded-lg border text-sm font-medium transition-all flex-1 justify-center hover:border-[#2A2D42]"
                      style={watchingWith !== 'alone' && watchingWith
                        ? { borderColor: accentBorder, background: accentBg, color: accentText }
                        : { borderColor: '#1A1D2E', background: 'rgba(11,13,23,0.7)', color: '#9ca3af' }}
                    >
                      <Users size={14} />
                      Together
                    </button>
                  </div>
                </div>

                {/* Mood */}
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 transition-colors duration-500" style={{ color: accentText }}>
                    Pick your vibe
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MOODS.map((m) => {
                      const selected = mood === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMood(m.id)}
                          className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border text-center transition-all hover:border-[#2A2D42]"
                          style={selected
                            ? { borderColor: accentBorder, background: accentBg, transform: 'scale(1.02)', boxShadow: `0 0 18px ${accentGlow}` }
                            : { borderColor: '#1A1D2E', background: 'rgba(11,13,23,0.7)' }}
                        >
                          <span className="text-xl leading-none">{m.emoji}</span>
                          <span className="text-[10px] font-medium" style={{ color: selected ? accentText : '#9ca3af' }}>
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (watchingWith === 'alone') {
                      goToRevealCard();
                    } else {
                      setDiscoveryCard(2);
                    }
                  }}
                  disabled={!canSubmitSmartStart}
                  className="w-full flex items-center justify-center gap-2 disabled:text-gray-600 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-all text-sm hover:opacity-90 mt-6" style={!canSubmitSmartStart ? { background: '#1A1D2E', color: '#4B5563', cursor: 'not-allowed' } : undefined}
                  style={!canSubmitSmartStart ? undefined : { backgroundColor: accentText, boxShadow: `0 4px 20px ${accentGlow}` }}
                >
                  <Sparkles size={14} />
                  {watchingWith === 'alone' ? 'Find my match' : 'Continue'}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* ───────────────── CARD 2: Decision Moment (Together only) ───────────────── */}
            {discoveryCard === 2 && (
              <div style={{ animation: 'cardEnterRight 0.4s ease-out' }}>
                {/* Back button */}
                <button
                  onClick={() => setDiscoveryCard(1)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors mb-4"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                {/* Intro */}
                {mood && (
                  <div
                    className="rounded-xl border p-3.5 mb-4 text-center"
                    style={{
                      borderColor: `${accentBorder}80`,
                      background: `linear-gradient(135deg, ${accentBg}, rgba(17,24,39,0.5))`,
                      animation: 'cardEnterUp 0.4s ease-out',
                    }}
                  >
                    <p className="text-white text-sm font-bold">
                      Together · {MOOD_LABELS[mood]} vibes
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {MOODS.find((m) => m.id === mood)?.emoji} Let's find the perfect pick for tonight
                    </p>
                  </div>
                )}

                {/* Two decision-mode feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Decide Together */}
                  <button
                    onClick={startVetoRound}
                    className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(229,9,20,0.18)]"
                    style={{ background: '#0E1016', border: '1px solid #1A1D2E' }}
                  >
                    {/* Cinematic illustration */}
                    <div
                      className="relative h-36 flex items-center justify-center overflow-hidden"
                      style={{ background: 'linear-gradient(160deg, rgba(229,9,20,0.14), rgba(229,9,20,0.02) 70%)' }}
                    >
                      {/* Two poster columns */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-2">
                          <div className="w-10 h-14 rounded-md border group-hover:translate-y-[-2px] transition-transform" style={{ background: '#1A1D2E', borderColor: '#252838' }} />
                          <div className="w-10 h-14 rounded-md border group-hover:translate-y-[2px] transition-transform" style={{ background: '#1A1D2E', borderColor: '#252838' }} />
                        </div>
                        {/* Swipe indicators */}
                        <div className="flex flex-col gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'rgba(78,224,138,0.15)', border: '1.5px solid #4ee08a', boxShadow: '0 0 10px rgba(78,224,138,0.3)' }}>
                            <Check size={14} strokeWidth={3} style={{ color: '#4ee08a' }} />
                          </div>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'rgba(229,9,20,0.15)', border: '1.5px solid #e50914', boxShadow: '0 0 10px rgba(229,9,20,0.3)' }}>
                            <X size={14} strokeWidth={3} style={{ color: '#e50914' }} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="w-10 h-14 rounded-md border group-hover:translate-y-[-2px] transition-transform" style={{ background: '#1A1D2E', borderColor: '#252838' }} />
                          <div className="w-10 h-14 rounded-md border group-hover:translate-y-[2px] transition-transform" style={{ background: '#1A1D2E', borderColor: '#252838' }} />
                        </div>
                      </div>
                      {/* Subtle scanline overlay */}
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)' }} />
                    </div>
                    {/* Text */}
                    <div className="p-3.5 flex flex-col flex-1">
                      <h3 className="text-white text-sm font-bold mb-1">Decide Together</h3>
                      <p className="text-gray-500 text-[11px] leading-relaxed mb-3 flex-1">
                        Both people swipe through recommendations. Anything vetoed is removed until one perfect match remains.
                      </p>
                      <div className="flex items-center gap-1.5 text-gray-500 group-hover:text-white text-xs font-semibold transition-colors">
                        Start swiping
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>

                  {/* Just Show the Best Match */}
                  <button
                    onClick={showBestMatch}
                    className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(229,9,20,0.22)]"
                    style={{ background: '#0E1016', border: '1px solid #1A1D2E' }}
                  >
                    {/* Cinematic illustration */}
                    <div
                      className="relative h-36 flex items-center justify-center overflow-hidden"
                      style={{ background: 'linear-gradient(160deg, rgba(229,9,20,0.14), rgba(229,9,20,0.02) 70%)' }}
                    >
                      {/* Spotlight on top rec */}
                      <div className="relative flex flex-col items-center">
                        {/* Spotlight cone */}
                        <div
                          className="absolute -top-10 w-20 h-16 pointer-events-none"
                          style={{ background: 'radial-gradient(ellipse at top, rgba(229,9,20,0.35), transparent 70%)' }}
                        />
                        {/* Top rec medallion */}
                        <div
                          className="relative w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{ background: 'rgba(229,9,20,0.12)', border: '1.5px solid #e50914', boxShadow: '0 0 22px rgba(229,9,20,0.4)', animation: 'pulseGlow 2.4s ease-in-out infinite' }}
                        >
                          <Star size={26} fill="#e50914" style={{ color: '#e50914' }} />
                        </div>
                        {/* AI badge */}
                        <span
                          className="mt-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white"
                          style={{ background: 'rgba(229,9,20,0.85)', boxShadow: '0 2px 8px rgba(229,9,20,0.4)' }}
                        >
                          AI Top Pick
                        </span>
                      </div>
                    </div>
                    {/* Text */}
                    <div className="p-3.5 flex flex-col flex-1">
                      <h3 className="text-white text-sm font-bold mb-1">Just Show the Best Match</h3>
                      <p className="text-gray-500 text-[11px] leading-relaxed mb-3 flex-1">
                        Skip the process and instantly get the single highest-scoring recommendation for your mood and time.
                      </p>
                      <div className="flex items-center gap-1.5 text-gray-500 group-hover:text-white text-xs font-semibold transition-colors">
                        Reveal top pick
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ───────────────── CARD 3: Schedule It (Together only, after live preview) ───────────────── */}
            {discoveryCard === 3 && watchingWith && watchingWith !== 'alone' && (
              <div style={{ animation: 'cardEnterRight 0.4s ease-out' }}>
                {/* Back button */}
                <button
                  onClick={() => setDiscoveryCard(4)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors mb-4"
                >
                  <ArrowLeft size={14} />
                  Back to matches
                </button>

                {/* Schedule It card */}
                <div
                  className="rounded-xl border p-5 transition-all"
                  style={{
                    borderColor: `${accentBorder}80`,
                    background: `linear-gradient(135deg, ${accentBg}, rgba(11,13,23,0.6))`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="p-2.5 rounded-lg flex-shrink-0"
                      style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                    >
                      <CalendarDays size={20} style={{ color: accentText }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold">Schedule your movie night</p>
                      <p className="text-gray-400 text-xs leading-snug">
                        Lock in a date and time so everyone shows up.
                      </p>
                    </div>
                    {pickedShow && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <img src={pickedShow.imageUrl} alt={pickedShow.title} className="w-10 h-14 object-cover rounded-lg" />
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate max-w-[100px]">{pickedShow.title}</p>
                          <p className="text-gray-500 text-[10px]">{pickedShow.genres[0]}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!scheduleConfirmed ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: accentText }}>
                            Date
                          </label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors" style={{ background: 'rgba(10,12,20,0.9)', border: '1px solid #1A1D2E' }}
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: accentText }}>
                            Time
                          </label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors" style={{ background: 'rgba(10,12,20,0.9)', border: '1px solid #1A1D2E' }}
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setScheduleConfirmed(true)}
                          disabled={!scheduledDate || !scheduledTime}
                          className="flex-1 flex items-center justify-center gap-2 disabled:text-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all text-sm hover:opacity-90"  style={scheduledDate && scheduledTime ? undefined : { background: '#1A1D2E', color: '#4B5563', cursor: 'not-allowed' }}
                          style={scheduledDate && scheduledTime ? { backgroundColor: accentText } : undefined}
                        >
                          <CheckIcon size={14} />
                          Lock it in
                        </button>
                        <button
                          onClick={async () => {
                            const movieTitle = pickedShow?.title ?? discoveryRecs[0]?.title ?? 'Movie night';
                            let dateStr = '';
                            if (scheduledDate && scheduledTime) {
                              const d = new Date(scheduledDate + 'T' + scheduledTime);
                              dateStr = d.toLocaleDateString('en-US', { weekday: 'long' }) +
                                ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                            }
                            const shareText = `Movie night${dateStr ? ', ' + dateStr : ''} 🍿${(pickedShow || discoveryRecs[0]) ? ' — ' + movieTitle : ''}`;
                            await shareMovieNight(shareText);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all hover:opacity-90"
                          style={{
                            borderColor: accentBorder,
                            background: accentBg,
                            color: accentText,
                          }}
                        >
                          <Share2 size={14} />
                          Invite
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ animation: 'cardEnterUp 0.4s ease-out' }} className="text-center py-2">
                      <div
                        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                        style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                      >
                        <CheckCircle2 size={24} style={{ color: accentText }} />
                      </div>
                      <p className="text-white text-sm font-bold mb-1">Movie night scheduled!</p>
                      <p className="text-gray-400 text-xs mb-4">
                        {new Date(scheduledDate + 'T' + scheduledTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        {' at '}
                        {new Date(scheduledDate + 'T' + scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <div
                        className="rounded-lg p-3 mb-4 text-left" style={{ background: 'rgba(10,12,20,0.8)', border: '1px solid #1A1D2E' }}
                        style={{ animation: 'cardEnterUp 0.3s ease-out 0.1s both' }}
                      >
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar size={12} style={{ color: accentText }} />
                          <span className="font-medium">Calendar entry created</span>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-1 ml-5">
                          {pickedShow?.title ?? 'Your pick'} · Together · {MOOD_LABELS[mood!] ?? ''} vibes
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const movieTitle = pickedShow?.title ?? discoveryRecs[0]?.title ?? 'Movie night';
                          const d = new Date(scheduledDate + 'T' + scheduledTime);
                          const dateStr = d.toLocaleDateString('en-US', { weekday: 'long' }) +
                            ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          const shareText = `Movie night, ${dateStr} 🍿${(pickedShow || discoveryRecs[0]) ? ' — ' + movieTitle : ''}`;
                          await shareMovieNight(shareText);
                        }}
                        className="w-full flex items-center justify-center gap-2 text-black font-bold py-3 rounded-xl transition-all text-sm hover:opacity-90"
                        style={{ backgroundColor: accentText, boxShadow: `0 4px 20px ${accentGlow}` }}
                      >
                        <Share2 size={14} />
                        Invite friends to movie night
                      </button>
                    </div>
                  )}
                </div>

                {/* Skip scheduling — open the picked show's detail page */}
                {!scheduleConfirmed && (
                  <button
                    onClick={() => {
                      const target = pickedShow ?? discoveryRecs[0];
                      if (target) {
                        setCurrentShowId(target.id);
                        setActiveTab('overview');
                        setDiscoveryRecs([]);
                        setSmartStartResult(null);
                        setDiscoveryCard(1);
                        setMood(null);
                        setWatchingWith(null);
                        setScheduledDate('');
                        setScheduledTime('');
                        setScheduleConfirmed(false);
                      } else {
                        setDiscoveryCard(4);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-xs font-medium py-2 transition-colors mt-4"
                  >
                    Skip scheduling <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}

            {/* ───────────────── CARD 4: Live Preview Reveal ───────────────── */}
            {discoveryCard === 4 && (
              <div className="flex flex-col flex-1 min-h-0" style={{ animation: 'cardEnterUp 0.5s ease-out' }}>
                {/* Fixed sub-header: back + matched-for-you label */}
                <div className="flex-shrink-0 px-7 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(26,29,46,0.8)' }}>
                  <button
                    onClick={() => watchingWith && watchingWith !== 'alone' ? setDiscoveryCard(2) : setDiscoveryCard(1)}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors mb-3"
                  >
                    <ArrowLeft size={14} />
                    {watchingWith && watchingWith !== 'alone' ? 'Back to Veto Round' : 'Start over'}
                  </button>
                  <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ animation: 'feedbackAckPop 0.5s ease-out' }}>
                    Matched for you
                  </p>
                  <p className="text-gray-500 text-xs">
                    {MOODS.find((m) => m.id === mood)?.emoji} {MOODS.find((m) => m.id === mood)?.label}
                    {' · '}{WATCHING_WITH.find((w) => w.id === watchingWith)?.label}
                  </p>
                </div>

                {/* Scrollable rec list */}
                <div className="flex-1 overflow-y-auto px-7 py-2 space-y-1.5">
                  {[...discoveryRecs].sort((a, b) => {
                    if (pickedShow) {
                      if (a.id === pickedShow.id) return -1;
                      if (b.id === pickedShow.id) return 1;
                    }
                    return 0;
                  }).map((rec, i) => {
                    const recFit = computeFitScore(rec, mood!, minutes ?? 90, watchingWith!);
                    const recEps = Math.floor((minutes ?? 90) / rec.avgEpisodeMinutes);
                    const isTop = i === 0;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => openShowDetail(rec.id)}
                        className="w-full flex overflow-hidden cursor-pointer transition-all rounded-xl"
                        style={{
                          animation: `cardEnterUp 0.4s ease-out ${i * 0.08}s both`,
                          background: isTop ? '#171A24' : '#131620',
                          border: isTop ? '1px solid rgba(185,28,28,0.4)' : '1px solid #1E2130',
                          boxShadow: isTop
                            ? '0 2px 16px rgba(0,0,0,0.4), 0 0 0 0 transparent'
                            : '0 1px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {/* Poster */}
                        <div className="relative flex-shrink-0" style={{ width: 130, height: isTop ? 92 : 82 }}>
                          <img
                            src={rec.imageUrl}
                            alt={rec.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-y-0 right-0 w-8 pointer-events-none" style={{ background: isTop ? 'linear-gradient(to right, transparent, #171A24)' : 'linear-gradient(to right, transparent, #131620)' }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between px-2.5" style={{ paddingTop: isTop ? 7 : 6, paddingBottom: isTop ? 7 : 6 }}>
                          <div>
                            {isTop && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Trophy size={10} className="text-red-500 flex-shrink-0" />
                                <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">Top Match</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-white font-bold truncate leading-tight ${isTop ? 'text-[13px]' : 'text-[12px]'}`}>{rec.title}</p>
                              {isTop && (
                                <span className="flex-shrink-0 text-amber-400 text-[10px] font-semibold border border-amber-500/50 px-1.5 py-0.5 rounded-full leading-none">
                                  Best match
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-[10px] mt-0.5">
                              {rec.genres[0]} · {rec.avgEpisodeMinutes}m ep
                              {recEps > 0 && ` · ${recEps} ep${recEps !== 1 ? 's' : ''} tonight`}
                            </p>
                            <p className="text-gray-400 text-[10px] italic mt-0.5 leading-snug line-clamp-1">
                              {matchReason(rec)}
                            </p>
                          </div>

                          {/* Inline CTAs */}
                          <div className="flex items-center mt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); openShowDetail(rec.id); }}
                              className="flex items-center gap-1.5 text-white hover:text-gray-200 transition-colors"
                            >
                              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                <Play size={9} fill="#000" className="text-black ml-px" />
                              </span>
                              <span className="text-[11px] font-bold">Watch Now</span>
                            </button>
                            <div className="w-px h-2.5 mx-2 flex-shrink-0" style={{ background: '#2A2D42' }} />
                            <button
                              onClick={(e) => { e.stopPropagation(); scheduleShow(rec); }}
                              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                            >
                              <CalendarDays size={10} className="flex-shrink-0" />
                              <span className="text-[11px] font-medium">Plan for Later</span>
                            </button>
                          </div>
                        </div>

                        {/* Score ring */}
                        <div className="flex-shrink-0 flex items-center pr-2.5 pl-1">
                          <WorthItMeter score={recFit} size="sm" showLabel={false} smartStart />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer: always visible below the list */}
                <div className="flex-shrink-0 px-7 py-3 space-y-1" style={{ borderTop: '1px solid rgba(26,29,46,0.8)' }}>
                  <button
                    onClick={() => {
                      setDiscoveryRecs([]);
                      setDiscoveryCard(1);
                      setMood(null);
                      setWatchingWith(null);
                      setScheduledDate('');
                      setScheduledTime('');
                      setScheduleConfirmed(false);
                    }}
                    className="w-full text-center text-gray-500 hover:text-gray-300 text-xs transition-colors"
                  >
                    Change my answers
                  </button>
                  {discoveryRecs[0] && mood && minutes && watchingWith === 'alone' && (() => {
                    const topFit = computeFitScore(discoveryRecs[0], mood, minutes, watchingWith);
                    const topVerdict = topFit >= 80 ? 'Worth it tonight' : topFit >= 55 ? 'Solid pick' : 'Maybe skip';
                    return (
                      <button
                        onClick={() => openWatchCard(discoveryRecs[0], topFit, topVerdict, mood, minutes, watchingWith)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-amber-300 transition-colors"
                      >
                        <ImageIcon size={12} />
                        Make a Watch Card
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Veto Round — swipe-and-reveal panel */}
      {vetoOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={closeVetoRound}
        >
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #0E1016 0%, #0B0D17 100%)', border: '1px solid #1A1D2E' }}
            style={{ animation: 'modalFadeIn 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeVetoRound}
              className="absolute top-3 right-3 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* INTRO */}
            {vetoPhase === 'intro' && (
              <div className="px-6 pt-10 pb-8 text-center">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                >
                  <Shuffle size={24} style={{ color: accentText }} />
                </div>
                <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2">Veto Round</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6 px-2">
                  Two people. One stack of 5 titles. Swipe right to keep, left to veto. Whatever survives both vetoes is tonight's pick.
                </p>
                <div className="flex items-center justify-center gap-4 mb-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><Check size={12} className="text-green-400" /> Keep</span>
                  <span className="flex items-center gap-1.5"><X size={12} className="text-red-400" /> Veto</span>
                </div>
                <button
                  onClick={() => setVetoPhase('person1')}
                  className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: accentText, color: '#111827' }}
                >
                  Person 1, start swiping
                </button>
              </div>
            )}

            {/* PERSON 1 / PERSON 2 SWIPING */}
            {(vetoPhase === 'person1' || vetoPhase === 'person2') && vetoStack[currentCardIndex] && (
              <div className="px-6 pt-10 pb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: accentText, color: '#111827' }}
                  >
                    {vetoPhase === 'person1' ? '1' : '2'}
                  </div>
                  <p className="text-white text-sm font-bold uppercase tracking-widest">
                    {vetoPhase === 'person1'
                      ? (watchingWith === 'partner' ? 'You' : 'Person 1')
                      : (watchingWith === 'partner' ? 'Player 2' : 'Person 2')}
                  </p>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-5">
                  {vetoStack.map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: i === currentCardIndex ? 24 : 8,
                        background: i <= currentCardIndex ? accentText : '#374151',
                        opacity: i < currentCardIndex ? 0.5 : 1,
                      }}
                    />
                  ))}
                </div>

                {/* Card stack */}
                <div className="relative mx-auto mb-6" style={{ width: 220, height: 320 }}>
                  {/* Behind cards for depth */}
                  {vetoStack.slice(currentCardIndex + 1, currentCardIndex + 3).map((card, i) => (
                    <div
                      key={card.id}
                      className="absolute inset-0 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900"
                      style={{
                        transform: `translateY(${(i + 1) * 12}px) scale(${1 - (i + 1) * 0.05})`,
                        opacity: 0.4 - i * 0.15,
                        zIndex: 5 - i,
                      }}
                    >
                      <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {/* Front card */}
                  <div
                    key={vetoStack[currentCardIndex].id}
                    className="absolute inset-0 rounded-2xl overflow-hidden border-2 shadow-2xl bg-gray-900 flex flex-col"
                    style={{
                      borderColor: accentBorder,
                      zIndex: 10,
                      transform: currentSwipeDir === 'right'
                        ? 'translateX(150%) rotate(20deg)'
                        : currentSwipeDir === 'left'
                        ? 'translateX(-150%) rotate(-20deg)'
                        : 'none',
                      transition: currentSwipeDir ? 'transform 0.32s ease-out' : 'none',
                      animation: currentSwipeDir ? undefined : 'vetoCardDeal 0.3s ease-out',
                    }}
                  >
                    <img src={vetoStack[currentCardIndex].imageUrl} alt={vetoStack[currentCardIndex].title} className="w-full h-44 object-cover" />
                    <div className="p-3 flex-1 flex flex-col justify-center">
                      <p className="text-white text-sm font-black leading-tight mb-1">{vetoStack[currentCardIndex].title}</p>
                      <p className="text-gray-400 text-[11px] mb-1">{vetoStack[currentCardIndex].genres[0]} · {vetoStack[currentCardIndex].avgEpisodeMinutes}m ep</p>
                      <p className="text-gray-500 text-[11px] italic leading-snug">"{vetoStack[currentCardIndex].tagline}"</p>
                    </div>
                  </div>
                </div>

                {/* Swipe buttons */}
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => castVote('veto')}
                    disabled={!!currentSwipeDir}
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-red-500/60 hover:border-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  >
                    <X size={24} className="text-red-400" />
                  </button>
                  <button
                    onClick={() => castVote('keep')}
                    disabled={!!currentSwipeDir}
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-green-500/60 hover:border-green-400 hover:bg-green-500/10 transition-all disabled:opacity-40"
                  >
                    <Check size={24} className="text-green-400" />
                  </button>
                </div>
                <p className="text-center text-gray-600 text-[10px] mt-3">
                  {currentCardIndex + 1} of {vetoStack.length}
                </p>
                {/* Undo last swipe */}
                {((vetoPhase === 'person1' && person1Votes.length > 0) ||
                  (vetoPhase === 'person2' && person2Votes.length > 0)) && !currentSwipeDir && (
                  <button
                    onClick={undoLastSwipe}
                    className="mx-auto mt-2 flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-[11px] transition-colors"
                  >
                    <ArrowLeft size={11} />
                    Undo last swipe
                  </button>
                )}
              </div>
            )}

            {/* HANDOFF */}
            {vetoPhase === 'handoff' && (
              <div className="px-6 pt-12 pb-10 text-center">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                >
                  <Users size={24} style={{ color: accentText }} />
                </div>
                <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2">Pass the device</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6 px-2">
                  {watchingWith === 'partner'
                    ? "Your turn is done. Hand the device to the next person. Their choices stay hidden until the final reveal."
                    : 'Person 1 is done. Hand the device to Person 2. Their votes stay hidden until the reveal.'}
                </p>
                <button
                  onClick={startPerson2}
                  className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: accentText, color: '#111827' }}
                >
                  {watchingWith === 'partner' ? 'Next person, start swiping' : 'Person 2, start swiping'}
                </button>
              </div>
            )}

            {/* COUNTDOWN */}
            {vetoPhase === 'countdown' && (
              <div className="px-6 pt-16 pb-16 text-center">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 animate-pulse">Tallying vetoes</p>
                <div
                  key={countdownNum}
                  className="text-6xl font-black"
                  style={{ color: accentText, animation: 'vetoCountdownPulse 0.7s ease-out' }}
                >
                  {countdownNum}
                </div>
              </div>
            )}

            {/* REVEALED */}
            {vetoPhase === 'revealed' && (() => {
              const survivors = vetoStack.filter((_, i) => person1Votes[i] === 'keep' && person2Votes[i] === 'keep');
              const finalPick = survivors[0] ?? null;
              return (
                <div className="flex flex-col min-h-0" style={{ animation: 'modalFadeIn 0.3s ease-out' }}>
                  {/* Close X */}
                  <button
                    onClick={closeVetoRound}
                    className="absolute top-3 right-3 z-[60] w-9 h-9 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>

                  {finalPick ? (
                    <div className="px-5 pt-5 pb-4 space-y-3">
                      {/* Header */}
                      <div className="text-center">
                        <p
                          className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5"
                          style={{ color: accentText }}
                        >
                          Survived Both Vetoes
                        </p>
                        <h3 className="text-white font-black uppercase tracking-tight" style={{ fontSize: 'clamp(24px, 6vw, 32px)' }}>
                          Your Pick
                        </h3>
                      </div>

                      {/* Hero winner card */}
                      <div
                        className="rounded-2xl border-2 overflow-hidden relative"
                        style={{
                          borderColor: accentBorder,
                          background: 'linear-gradient(160deg, #1a0a0a 0%, #111 100%)',
                          boxShadow: `0 0 40px ${accentGlow}`,
                          animation: 'vetoSurvivorReveal 0.55s ease-out',
                        }}
                      >
                        {/* Subtle red glow top-right */}
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 10%, rgba(229,9,20,0.18) 0%, transparent 60%)' }} />
                        <div className="flex p-3 gap-3 relative">
                          {/* Poster */}
                          <div className="relative flex-shrink-0">
                            <img
                              src={finalPick.imageUrl}
                              alt={finalPick.title}
                              className="w-24 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ aspectRatio: '2/3' }}
                              onClick={() => { closeVetoRound(); openShowDetail(finalPick.id); }}
                            />
                            {/* Netflix N badge */}
                            <div
                              className="absolute top-2 left-2 w-5 h-5 flex items-center justify-center rounded-sm font-black text-white text-xs leading-none"
                              style={{ background: '#e50914', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}
                            >
                              N
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Trophy size={12} style={{ color: accentText }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentText }}>The Winner</span>
                              </div>
                              <p className="text-white font-black leading-tight mb-0.5" style={{ fontSize: 'clamp(16px, 4vw, 22px)' }}>
                                {finalPick.title}
                              </p>
                              <p className="text-gray-400 text-xs mb-1">
                                {finalPick.genres[0]} · {finalPick.avgEpisodeMinutes}m · {finalPick.totalSeasons ? 'Episode' : 'Movie'}
                              </p>
                              {finalPick.tagline && (
                                <p className="text-gray-400 text-[11px] italic leading-snug">
                                  "{finalPick.tagline}"
                                </p>
                              )}
                            </div>

                            {/* Watch Now CTA */}
                            <div className="mt-2 space-y-1.5">
                              <button
                                onClick={() => { closeVetoRound(); openShowDetail(finalPick.id); }}
                                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 active:scale-[0.98]"
                                style={{ background: 'linear-gradient(90deg, #b91c1c, #e50914)', boxShadow: '0 4px 16px rgba(229,9,20,0.35)' }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Play size={13} fill="white" className="ml-0.5" />
                                  </div>
                                  <span>Watch Now</span>
                                </div>
                                <ChevronRight size={16} className="opacity-70" />
                              </button>

                              {/* Secondary row: My List + Plan for Later */}
                              <div className="flex items-stretch gap-0 rounded-xl border border-gray-700/60 overflow-hidden bg-gray-900/40">
                                <button
                                  onClick={handleAddToContinueWatching}
                                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
                                >
                                  <Plus size={13} />
                                  My List
                                </button>
                                <div className="w-px bg-gray-700/60" />
                                <button
                                  onClick={() => { closeVetoRound(); scheduleShow(finalPick); }}
                                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
                                >
                                  <CalendarDays size={13} />
                                  Plan for Later
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Also Survived */}
                      {survivors.length > 1 && (
                        <div>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5">Also Survived</p>
                          <div className="space-y-1.5">
                            {survivors.slice(1).map((s) => (
                              <button
                                key={s.id}
                                onClick={() => { closeVetoRound(); openShowDetail(s.id); }}
                                className="w-full flex items-center gap-3 rounded-xl bg-gray-900/60 border border-gray-800/80 p-2 hover:bg-gray-800/60 hover:border-gray-700 transition-all group text-left"
                              >
                                <img src={s.imageUrl} alt={s.title} className="w-11 h-[60px] object-cover rounded-lg flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-bold truncate group-hover:text-gray-100">{s.title}</p>
                                  <p className="text-gray-500 text-xs mt-0.5">
                                    {s.genres[0]} · {s.avgEpisodeMinutes}m · {s.totalSeasons ? 'Episode' : 'Movie'}
                                  </p>
                                </div>
                                <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* See other matches row */}
                      <button
                        onClick={() => { closeVetoRound(); goToRevealCard(); }}
                        className="w-full flex items-center gap-3 rounded-xl bg-gray-900/60 border border-gray-800/80 p-2.5 hover:bg-gray-800/60 hover:border-gray-700 transition-all group text-left"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.3)' }}
                        >
                          <Sparkles size={18} style={{ color: accentText }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-bold">See your other matches</p>
                          <p className="text-gray-500 text-xs mt-0.5">More picks we think you'll love</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-red-500 flex-shrink-0 transition-colors" style={{ color: accentText }} />
                      </button>

                      {/* Close link */}
                      <button
                        onClick={closeVetoRound}
                        className="w-full text-center text-gray-500 hover:text-gray-300 text-xs underline transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <div className="px-6 pt-12 pb-8 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: accentText }}>
                        Total veto
                      </p>
                      <h3 className="text-white text-lg font-black uppercase tracking-widest mb-4">
                        Nobody survived
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        Every title got vetoed. That's democracy for you.
                      </p>
                      <button
                        onClick={startVetoRound}
                        className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                        style={{ background: accentText, color: '#111827' }}
                      >
                        <Shuffle size={14} />
                        Reshuffle the stack
                      </button>
                      <button
                        onClick={closeVetoRound}
                        className="w-full text-center text-gray-500 hover:text-gray-300 text-xs underline transition-colors mt-4"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Family Voting Overlay */}
      {familyVotingOpen && (
        <FamilyVotingOverlay
          candidates={livePreview.length > 0 ? livePreview : SHOWS.slice(0, 3)}
          accentText={accentText}
          accentBorder={accentBorder}
          accentBg={accentBg}
          onClose={() => setFamilyVotingOpen(false)}
          onReveal={goToRevealCard}
        />
      )}

      {/* Friends Planner Overlay */}
      {friendsPlannerOpen && (
        <FriendsPlannerOverlay
          candidates={livePreview.length > 0 ? livePreview : SHOWS.slice(0, 3)}
          accentText={accentText}
          accentBorder={accentBorder}
          accentBg={accentBg}
          onClose={() => setFriendsPlannerOpen(false)}
          onReveal={goToRevealCard}
        />
      )}

      {/* Invite share confirmation toast — sibling of overlay, never clipped */}
      {inviteToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-bold text-sm shadow-2xl">
            <Share2 size={16} />
            {inviteToast}
          </div>
        </div>
      )}
      </>
    );
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-4xl bg-gray-950 rounded-lg overflow-hidden shadow-2xl"
        style={{ animation: 'panelSlideIn 0.22s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-700 text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Backdrop area */}
        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <img
            src={show.backdropUrl}
            alt={show.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/60 to-transparent" />

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-4 right-4 w-9 h-9 flex items-center justify-center rounded-full border border-gray-400/60 hover:border-white text-gray-300 hover:text-white transition-colors bg-black/30"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <div className="absolute bottom-6 left-6 right-14">
            <h1
              className="text-white font-black leading-none"
              style={{ fontSize: 'clamp(28px, 3.5vw, 52px)', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
            >
              {show.title}
            </h1>
            {show.tagline && (
              <p className="text-gray-300 text-sm mt-1 italic">"{show.tagline}"</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => {
                if (progress && onOpenResumeHelper && currentShowId) {
                  onOpenResumeHelper(currentShowId);
                } else if (currentShowId) {
                  onPlay(currentShowId);
                }
              }}
              className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black font-bold px-6 py-2.5 rounded transition-colors text-sm"
            >
              <Play size={16} fill="currentColor" />
              {progress
                ? `Resume S${progress.season_num}E${progress.episode_num}`
                : 'Play'}
            </button>
            <button
              onClick={handleAddToContinueWatching}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-500 hover:border-white transition-colors"
              title={inContinueWatching ? 'In your Continue Watching' : 'Add to Continue Watching'}
            >
              {inContinueWatching ? <Check size={18} className="text-white" /> : <Plus size={18} className="text-white" />}
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-500 hover:border-white transition-colors">
              <ThumbsUp size={16} className="text-white" />
            </button>
            <button
              onClick={() => {
                setPickedShow(show);
                setScheduledDate('');
                setScheduledTime('');
                setScheduleConfirmed(false);
                setDiscoveryCard(3);
              }}
              className="flex items-center gap-1.5 border border-gray-600 text-gray-300 text-xs font-medium px-3 py-2 rounded-full hover:border-gray-400 hover:text-white transition-colors"
              title="Schedule for Later"
            >
              <CalendarDays size={14} />
              Schedule
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-300 flex-wrap">
            <span className="text-green-500 font-semibold">
              {show.worthItScore >= 90 ? '98%' : `${show.worthItScore}%`} Match
            </span>
            <span>{show.releaseYear}</span>
            <span>{durationLabel}</span>
            <span className="border border-gray-600 text-gray-400 px-1.5 py-0.5 text-[11px] leading-none">
              {ageLabel}
            </span>
            <span className="border border-gray-600 text-gray-400 px-1.5 py-0.5 text-[11px] leading-none">
              HD
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-800">
          <div className="flex gap-6">
            {(['overview', 'episodes', 'more-like-this'] as Tab[]).map((tab) => {
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-all relative ${
                    isActive
                      ? 'text-white border-white'
                      : 'text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                  style={{ marginBottom: '-1px' }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/-/g, ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 py-3">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 space-y-3">
                {/* Synopsis */}
                <div className="rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-900/30 border border-gray-800/60 p-3">
                  <p className="text-gray-200 text-sm leading-relaxed mb-2">{show.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {show.genres.map((g) => (
                      <span
                        key={g}
                        className="bg-gray-800/70 text-gray-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-700/50"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 pt-2 border-t border-gray-800/60">
                    <span className="flex items-center gap-1.5">
                      <Users size={10} className="text-gray-500" />
                      <span className="text-gray-500">Cast:</span>
                      <span className="text-gray-300">
                        {cast.slice(0, 3).join(', ')}
                        {cast.length > 3 && <>, <em className="text-gray-400">more</em></>}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={10} className="text-amber-500/70" />
                      <span className="text-gray-500">Mood:</span>
                      <span className="text-gray-300 font-medium">{moodLabel}</span>
                    </span>
                  </div>
                </div>

                {/* Based on Your Previous Watching */}
                <div className="rounded-xl bg-gradient-to-br from-amber-950/20 via-gray-900/40 to-gray-900/20 border border-amber-800/20 p-3">
                  <h3 className="text-white text-[13px] font-bold mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    Based on Your Previous Watching
                  </h3>
                  {(() => {
                    const historyShows = watchHistory
                      .map((p) => getShowById(p.show_id))
                      .filter((s): s is Show => !!s && s.id !== show.id);
                    if (historyShows.length === 0) {
                      return (
                        <p className="text-gray-500 text-xs leading-relaxed">
                          Add titles to Continue Watching and we'll analyze your taste to show how well this fits.
                        </p>
                      );
                    }
                    const genreCounts: Record<string, number> = {};
                    const moodCounts: Record<string, number> = {};
                    historyShows.forEach((s) => {
                      s.genres.forEach((g) => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
                      s.moodTags.forEach((m) => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
                    });
                    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
                    const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => MOOD_LABELS[m] || m);
                    const genreOverlap = show.genres.filter((g) => topGenres.includes(g)).length;
                    const moodOverlap = show.moodTags.filter((m) => topMoods.includes(MOOD_LABELS[m] || m)).length;
                    const fitScore = Math.min(100, Math.round(
                      (genreOverlap / Math.max(1, show.genres.length)) * 55 +
                      (moodOverlap / Math.max(1, show.moodTags.length)) * 45
                    ));
                    const tasteLine = topGenres.length > 0
                      ? `You tend to watch ${topGenres.join(', ')}${topMoods.length > 0 ? ` — usually when you're in a ${topMoods.join(' or ').toLowerCase()} mood` : ''}.`
                      : '';

                    // Score each candidate by overlap with the CURRENT title's
                    // genres (heavily weighted) combined with the user's watch-
                    // history genre preferences. This recomputes per title, so
                    // different pages surface different, genre-relevant picks.
                    const currentGenreSet = new Set(show.genres);
                    const recs = SHOWS.filter((s) => s.id !== show.id)
                      .map((s) => {
                        let score = 0;
                        s.genres.forEach((g) => {
                          if (currentGenreSet.has(g)) score += 10;
                          if (genreCounts[g]) score += genreCounts[g] * 2;
                        });
                        s.moodTags.forEach((m) => {
                          if (moodCounts[m]) score += moodCounts[m];
                        });
                        score += Math.min(2, Math.round(s.worthItScore / 30));
                        return { s, score };
                      })
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 4)
                      .map((r) => r.s);

                    return (
                      <>
                        <p className="text-gray-300 text-xs leading-relaxed mb-2">{tasteLine}</p>
                        <div className="flex items-center gap-3 mb-2 p-2 rounded-lg bg-black/30 border border-amber-900/20">
                          <WorthItMeter score={fitScore} size="sm" showLabel={false} smartStart />
                          <div>
                            <p className="text-white text-sm font-bold leading-tight">{fitScore}% taste fit</p>
                            <p className="text-gray-500 text-[10px]">
                              Based on {historyShows.length} title{historyShows.length !== 1 ? 's' : ''} in your Continue Watching
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recs.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => switchShow(s.id)}
                              className="flex items-center gap-1.5 bg-gray-800/60 hover:bg-gray-700/70 hover:-translate-y-0.5 border border-gray-700/50 hover:border-amber-700/40 rounded-full pl-1 pr-2.5 py-1 transition-all"
                            >
                              <img src={s.imageUrl} alt={s.title} className="w-5 h-5 rounded object-cover flex-shrink-0" />
                              <span className="text-gray-300 text-[10px] font-medium truncate max-w-[80px]">{s.title}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Worth It / Consider — side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-green-950/25 to-gray-900/30 border border-green-900/30 p-3">
                    <h3 className="text-white text-[13px] font-bold mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-green-500" />
                      Why It's Worth Your Time
                    </h3>
                    <ul className="space-y-1">
                      {show.whyWorthIt.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                          <p className="text-gray-300 text-xs leading-snug">{reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-gray-900/40 border border-gray-800/60 p-3">
                    <h3 className="text-gray-300 text-[13px] font-bold mb-1.5 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-600 flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-gray-500" />
                      </span>
                      Consider Before Starting
                    </h3>
                    <ul className="space-y-1">
                      {show.whyNotWorthIt.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0 mt-1.5" />
                          <p className="text-gray-500 text-xs leading-snug">{reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Critics quote */}
                {show.criticsQuote && (
                  <blockquote className="relative rounded-xl bg-gradient-to-br from-amber-950/15 to-gray-900/30 border border-amber-800/20 p-3 pl-5">
                    <span className="absolute top-0.5 left-2 text-3xl text-amber-500/30 font-serif leading-none select-none">"</span>
                    <p className="text-gray-200 italic text-sm leading-relaxed pt-0.5">{show.criticsQuote}</p>
                    <cite className="not-italic block mt-1 text-amber-400 text-[10px] font-semibold uppercase tracking-widest">
                      — Smart Analysis
                    </cite>
                  </blockquote>
                )}
              </div>

              {/* Smart Analysis — compact right column, no ring */}
              <div className="space-y-3">
                <div className="rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-900/30 border border-amber-800/20 p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles size={12} className="text-amber-400" />
                    <span className="text-amber-400 text-[10px] font-semibold uppercase tracking-widest">
                      Smart Analysis
                    </span>
                  </div>

                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-black text-white tabular-nums leading-none">
                      {show.worthItScore}
                    </span>
                    <span className="text-gray-500 text-sm mb-1">/100</span>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
                    style={{
                      background: show.worthItScore >= 90 ? 'rgba(34,197,94,0.15)' : show.worthItScore >= 75 ? 'rgba(234,179,8,0.15)' : show.worthItScore >= 60 ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)',
                      color: show.worthItScore >= 90 ? '#22c55e' : show.worthItScore >= 75 ? '#eab308' : show.worthItScore >= 60 ? '#f97316' : '#ef4444',
                      border: `1px solid ${show.worthItScore >= 90 ? 'rgba(34,197,94,0.3)' : show.worthItScore >= 75 ? 'rgba(234,179,8,0.3)' : show.worthItScore >= 60 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}
                  >
                    {show.worthItScore >= 90 ? 'Highly Worth It' : show.worthItScore >= 75 ? 'Worth It' : show.worthItScore >= 60 ? 'Maybe' : 'Skip It'}
                  </span>

                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${show.worthItScore}%`,
                        background: show.worthItScore >= 90
                          ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                          : show.worthItScore >= 75
                          ? 'linear-gradient(90deg, #eab308, #facc15)'
                          : show.worthItScore >= 60
                          ? 'linear-gradient(90deg, #f97316, #fb923c)'
                          : 'linear-gradient(90deg, #ef4444, #f87171)',
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-black/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-gray-500 text-[10px] uppercase tracking-wider">Completion</span>
                      <span className="text-white text-sm font-bold">{show.completionRate}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-gray-500 text-[10px] uppercase tracking-wider">Binge Factor</span>
                      <span className="text-white text-sm font-bold">{show.bingeScore}/10</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-gray-500 text-[10px] uppercase tracking-wider">Time Invest</span>
                      <span className="text-white text-sm font-bold">{totalH}h{totalM > 0 ? ` ${totalM}m` : ''}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 pt-2.5 mt-1 border-t border-gray-800/60">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {show.avgEpisodeMinutes}m/ep
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={10} />
                      {show.seasons} season{show.seasons !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EPISODES TAB */}
          {activeTab === 'episodes' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {episodes.map((ep, i) => (
                <button
                  key={`${ep.season}-${ep.episode}`}
                  onClick={onPlay}
                  className="w-full flex items-center gap-4 bg-gray-900/50 hover:bg-gray-800/70 rounded-lg p-3 text-left transition-colors group"
                >
                  <div className="flex-shrink-0 w-32 aspect-video rounded overflow-hidden relative">
                    <img
                      src={show.backdropUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={20} fill="white" className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-[10px]">S{ep.season} E{ep.episode}</span>
                      <span className="text-gray-600 text-[10px]">{ep.duration}m</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate mt-0.5">{ep.title}</p>
                  </div>
                  <WorthItMeter score={show.worthItScore} size="sm" showLabel={false} smartStart />
                </button>
              ))}
            </div>
          )}

          {/* MORE LIKE THIS TAB */}
          {activeTab === 'more-like-this' && (
            <div className="grid grid-cols-3 gap-2">
              {similar.map((s) => {
                const sH = Math.floor(s.totalMinutes / 60);
                const sM = s.totalMinutes % 60;
                const sDuration =
                  s.contentType === 'movie' ? `${sH}h ${sM}m` : `${s.seasons}s · ${s.totalEpisodes} eps`;
                return (
                  <button
                    key={s.id}
                    onClick={() => switchShow(s.id)}
                    className="text-left bg-gray-900/50 hover:bg-gray-800/70 rounded-lg overflow-hidden transition-colors group"
                  >
                    <div className="relative aspect-video">
                      <img src={s.backdropUrl} alt={s.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                        {sDuration}
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-green-500 text-[10px] font-semibold">{s.worthItScore}% Match</span>
                        <span className="text-gray-500 text-[10px]">{s.releaseYear}</span>
                      </div>
                      <p className="text-gray-300 text-[11px] leading-snug line-clamp-2">{s.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}


        </div>

        {/* Smart Start Watch Plan overlay */}
        {watchPlanOpen && show && minutes && (
          <SmartStartWatchPlan
            show={show}
            availableMinutes={minutes}
            onBack={() => setWatchPlanOpen(false)}
            onStart={() => {
              if (currentShowId) onPlay(currentShowId);
            }}
          />
        )}

        {/* Milestone micro-celebration */}
        <Confetti trigger={confettiTrigger} />
        {milestoneBadge && (
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] pointer-events-none"
            style={{ animation: 'milestoneBadgeIn 0.5s ease-out' }}
          >
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-sm shadow-2xl">
              <PartyPopper size={18} />
              {milestoneBadge}
            </div>
          </div>
        )}

        {/* Watch Card — shareable mini-poster */}
        {watchCardOpen && watchCardData && (
          <WatchCard
            show={watchCardData.show}
            fitScore={watchCardData.fitScore}
            verdict={watchCardData.verdict}
            mood={watchCardData.mood}
            minutes={watchCardData.minutes}
            watchingWith={watchCardData.watchingWith}
            onClose={closeWatchCard}
          />
        )}

      </div>
    </div>
  );
}

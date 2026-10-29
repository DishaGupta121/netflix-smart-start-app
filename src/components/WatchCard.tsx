import { useRef, useState } from 'react';
import { Download, Share2, X, Sparkles } from 'lucide-react';
import type { Show, Mood, WatchingWith } from '../types';

interface WatchCardProps {
  show: Show;
  fitScore: number;
  verdict: string;
  mood: Mood | null;
  minutes: number | null;
  watchingWith: WatchingWith | null;
  onClose: () => void;
}

const MOOD_EMOJI: Record<Mood, string> = {
  relaxed: '😌',
  excited: '🔥',
  sad: '🌧️',
  focused: '🧠',
  adventurous: '🌍',
  romantic: '✨',
  anxious: '🌿',
  social: '🎉',
};

const MOOD_LABEL: Record<Mood, string> = {
  relaxed: 'Relaxed',
  excited: 'Thrilling',
  sad: 'Emotional',
  focused: 'Cerebral',
  adventurous: 'Adventurous',
  romantic: 'Romantic',
  anxious: 'Easy Watch',
  social: 'Social',
};

const WITH_LABEL: Record<WatchingWith, string> = {
  alone: 'Solo',
  partner: 'Partner',
  family: 'Family',
  friends: 'Friends',
};

function timeLabel(min: number | null): string {
  if (!min) return 'Anytime';
  if (min >= 360) return 'All night';
  if (min >= 180) return '3 hrs';
  return `${min} min`;
}

export default function WatchCard({
  show,
  fitScore,
  verdict,
  mood,
  minutes,
  watchingWith,
  onClose,
}: WatchCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  const accent = fitScore >= 80 ? '#fbbf24' : fitScore >= 55 ? '#fcd34d' : '#9ca3af';

  const drawToCanvas = (): HTMLCanvasElement => {
    const W = 600;
    const H = 900;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0f1a');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Poster image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = show.imageUrl;

    // Draw a placeholder frame (image drawn async below)
    const drawFrame = (image: HTMLImageElement | null) => {
      const px = 40;
      const py = 120;
      const pw = W - px * 2;
      const ph = 420;
      ctx.save();
      ctx.beginPath();
      const r = 20;
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + pw, py, px + pw, py + ph, r);
      ctx.arcTo(px + pw, py + ph, px, py + ph, r);
      ctx.arcTo(px, py + ph, px, py, r);
      ctx.arcTo(px, py, px + pw, py, r);
      ctx.closePath();
      ctx.clip();
      if (image) {
        ctx.drawImage(image, px, py, pw, ph);
      } else {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(px, py, pw, ph);
      }
      // Dark overlay at bottom of poster
      const ov = ctx.createLinearGradient(0, py + ph - 120, 0, py + ph);
      ov.addColorStop(0, 'rgba(0,0,0,0)');
      ov.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = ov;
      ctx.fillRect(px, py + ph - 120, pw, 120);
      ctx.restore();

      // Border around poster
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + pw, py, px + pw, py + ph, r);
      ctx.arcTo(px + pw, py + ph, px, py + ph, r);
      ctx.arcTo(px, py + ph, px, py, r);
      ctx.arcTo(px, py, px + pw, py, r);
      ctx.closePath();
      ctx.stroke();
    };

    drawFrame(null);

    img.onload = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      drawFrame(img);
      drawText(ctx, W, H);
    };

    const drawText = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
      // Header
      ctx.fillStyle = accent;
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SMART START', 40, 70);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('Tonight\u2019s verdict', 40, 95);

      // Title (over poster bottom)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px Inter, sans-serif';
      ctx.textAlign = 'left';
      const titleY = 120 + 420 - 50;
      ctx.fillText(show.title, 60, titleY);

      // Fit score ring (top-right)
      const cx = W - 70;
      const cy = 80;
      const rad = 34;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + (fitScore / 100) * Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(Math.round(fitScore)), cx, cy);
      ctx.textBaseline = 'alphabetic';

      // Verdict
      ctx.fillStyle = accent;
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(verdict, 40, 600);

      // Meta row
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Inter, sans-serif';
      const meta = [
        mood ? `${MOOD_EMOJI[mood]} ${MOOD_LABEL[mood]}` : '',
        timeLabel(minutes),
        watchingWith ? `👥 ${WITH_LABEL[watchingWith]}` : '',
      ].filter(Boolean).join('   ·   ');
      ctx.fillText(meta, 40, 635);

      // Divider
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 670);
      ctx.lineTo(W - 40, 670);
      ctx.stroke();

      // Tagline
      ctx.fillStyle = '#d1d5db';
      ctx.font = 'italic 18px Inter, sans-serif';
      ctx.fillText(`\u201C${show.tagline}\u201D`, 40, 710);

      // Genre + episode info
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(`${show.genres[0]} · ${show.avgEpisodeMinutes}m ep · ${show.seasons} season${show.seasons !== 1 ? 's' : ''}`, 40, 745);

      // Footer
      ctx.fillStyle = '#4b5563';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Made with Smart Start', W / 2, H - 40);
    };

    drawText(ctx, W, H);

    return canvas;
  };

  const handleSave = () => {
    const canvas = drawToCanvas();
    // Wait for image to load then re-trigger save
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = show.imageUrl;
    img.onload = () => {
      const c = drawToCanvas();
      c.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${show.title.replace(/\s+/g, '-').toLowerCase()}-watchcard.png`;
        a.click();
        URL.revokeObjectURL(url);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    };
    // Fallback immediate save (without image)
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${show.title.replace(/\s+/g, '-').toLowerCase()}-watchcard.png`;
      a.click();
      URL.revokeObjectURL(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleShare = async () => {
    const text = `${show.title} — ${verdict} (${Math.round(fitScore)} fit) via Smart Start`;
    if (navigator.share) {
      try {
        await navigator.share({ title: show.title, text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
      <div
        className="relative w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalFadeIn 0.12s ease-out' }}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700"
        >
          <X size={16} />
        </button>

        {/* The visual card (mirrors canvas layout) */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden border-2 shadow-2xl"
          style={{ borderColor: accent, background: 'linear-gradient(180deg, #0b0f1a, #000)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                <Sparkles size={10} className="inline mr-1" />
                Smart Start
              </p>
              <p className="text-gray-500 text-[10px]">Tonight\u2019s verdict</p>
            </div>
            {/* Fit ring */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#1f2937" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={accent}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={(1 - fitScore / 100) * 2 * Math.PI * 28}
                />
              </svg>
              <span className="absolute text-lg font-black text-white">{Math.round(fitScore)}</span>
            </div>
          </div>

          {/* Poster */}
          <div className="relative mx-4 rounded-xl overflow-hidden" style={{ height: 260 }}>
            <img src={show.imageUrl} alt={show.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-white text-xl font-black leading-tight">{show.title}</p>
            </div>
          </div>

          {/* Verdict + meta */}
          <div className="px-5 py-4">
            <p className="text-base font-black" style={{ color: accent }}>{verdict}</p>
            <p className="text-gray-400 text-xs mt-1">
              {mood && `${MOOD_EMOJI[mood]} ${MOOD_LABEL[mood]}`}
              {minutes && ` · ${timeLabel(minutes)}`}
              {watchingWith && ` · 👥 ${WITH_LABEL[watchingWith]}`}
            </p>
            <p className="text-gray-500 text-xs italic mt-2">\u201C{show.tagline}\u201D</p>
            <p className="text-gray-600 text-[10px] mt-1">
              {show.genres[0]} · {show.avgEpisodeMinutes}m ep · {show.seasons} season{show.seasons !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: accent, color: '#111827' }}
          >
            <Download size={14} />
            {saved ? 'Saved!' : 'Save Image'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <Share2 size={14} />
            {shared ? 'Shared!' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}

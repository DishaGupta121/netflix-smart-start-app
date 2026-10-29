interface WorthItMeterProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  smartStart?: boolean;
  animateFill?: boolean;
  fillProgress?: number;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Highly Worth It';
  if (score >= 75) return 'Worth It';
  if (score >= 60) return 'Maybe';
  return 'Skip It';
}

export default function WorthItMeter({
  score,
  size = 'md',
  showLabel = true,
  smartStart = false,
  animateFill = false,
  fillProgress = 1,
}: WorthItMeterProps) {
  const sizeMap = { sm: 44, md: 80, lg: 120 };
  const strokeMap = { sm: 3, md: 6, lg: 8 };
  const dim = sizeMap[size];
  const stroke = strokeMap[size];
  const radius = (dim - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayScore = animateFill ? score * fillProgress : score;
  const progress = ((100 - displayScore) / 100) * circumference;

  // Smart Start uses amber/gold. Default uses semantic green→red scale.
  const ringColor = smartStart
    ? '#f59e0b'
    : score >= 90
    ? '#22c55e'
    : score >= 75
    ? '#eab308'
    : score >= 60
    ? '#f97316'
    : '#ef4444';

  const labelColor = smartStart ? '#f59e0b' : ringColor;
  const label = getScoreLabel(score);
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-lg' : 'text-3xl';
  const labelSize = size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={stroke}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            style={animateFill ? undefined : { transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${textSize} font-black text-white tabular-nums`}>{Math.round(displayScore)}</span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <span
            className={`${labelSize} font-semibold uppercase tracking-wider`}
            style={{ color: labelColor }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

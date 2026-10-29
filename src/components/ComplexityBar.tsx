interface ComplexityBarProps {
  level: 1 | 2 | 3 | 4 | 5;
  showLabel?: boolean;
}

const labels: Record<number, string> = {
  1: 'Easy Watch',
  2: 'Light',
  3: 'Moderate',
  4: 'Complex',
  5: 'Demanding',
};

const colors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-emerald-400',
  3: 'bg-yellow-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
};

export default function ComplexityBar({ level, showLabel = true }: ComplexityBarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Mental Load</span>
          <span className="text-xs font-semibold text-gray-300">{labels[level]}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i <= level ? colors[level] : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

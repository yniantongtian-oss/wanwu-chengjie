import { cn } from '@/lib/utils';

interface StabilityRingProps {
  /** 0–100 */
  value: number;
  /** 直径 px，默认 44 */
  size?: number;
  showLabel?: boolean;
  className?: string;
}

/** 稳定性环：SVG 环形进度，≥70 绿 / 40–69 琥珀 / <40 红 (design.md §7.3/§7.5) */
export default function StabilityRing({ value, size = 44, showLabel = true, className }: StabilityRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const color = clamped >= 70 ? 'var(--green)' : clamped >= 40 ? 'var(--amber)' : 'var(--red)';

  return (
    <span className={cn('inline-flex items-center gap-2', className)} title={`稳定度 ${clamped}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`稳定度 ${clamped}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(147,160,184,.18)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)' }}
        />
        {!showLabel && (
          <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill={color} fontSize={size * 0.28} fontFamily="JetBrains Mono, monospace">
            {clamped}
          </text>
        )}
      </svg>
      {showLabel && (
        <span className="font-mono text-[13px] tracking-wider" style={{ color }}>
          {clamped}%
        </span>
      )}
    </span>
  );
}

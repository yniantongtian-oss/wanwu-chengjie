import type { Rarity } from '@/engine';
import { RARITY_LABELS } from '@/engine';
import { cn } from '@/lib/utils';

const RARITY_STYLES: Record<Rarity, string> = {
  common: 'border-star-dim/40 text-star-dim',
  rare: 'border-cyan/60 text-cyan shadow-[0_0_10px_rgba(87,230,240,.15)]',
  epic: 'border-violet/60 text-violet shadow-[0_0_10px_rgba(139,124,246,.15)]',
  legendary: 'border-gold/60 text-gold shadow-[0_0_10px_rgba(232,200,118,.18)]',
  unique:
    'border-transparent text-gold bg-[linear-gradient(var(--void-2),var(--void-2)),linear-gradient(120deg,var(--gold),var(--cyan))] bg-[padding-box,border-box] bg-clip-[padding-box,border-box]',
};

interface RarityBadgeProps {
  rarity: Rarity;
  className?: string;
}

/** 稀有度徽标：胶囊，mono 11px 大写英文 + 中文 (design.md §7.5) */
export default function RarityBadge({ rarity, className }: RarityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest',
        RARITY_STYLES[rarity],
        className,
      )}
    >
      {rarity} · {RARITY_LABELS[rarity]}
    </span>
  );
}

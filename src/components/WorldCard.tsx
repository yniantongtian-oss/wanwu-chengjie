import { Link } from 'react-router';
import type { Rarity } from '@/engine';
import RarityBadge from '@/components/RarityBadge';
import StabilityRing from '@/components/StabilityRing';
import { cn } from '@/lib/utils';

export interface WorldCardData {
  /** 用于跳转 /play/:worldId */
  worldId: string;
  name: string;
  /** K3-WORLD-XXXXX */
  code: string;
  /** 类型中文名，如「机械遗迹」 */
  biomeLabel: string;
  rarity: Rarity;
  /** 0–100 */
  stability: number;
  thumbnail?: string;
  bestScore?: number | null;
}

interface WorldCardProps {
  world: WorldCardData;
  className?: string;
}

const RARITY_RING: Record<Rarity, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary legendary-sweep',
  unique: 'rarity-unique unique-breathe',
};

/**
 * 世界卡 WorldCard (design.md §7.3)
 * 3:4 比例、圆角 16px、稀有度描边、稳定度环、hover 上浮 6px + 倾斜 ±2°。
 */
export default function WorldCard({ world, className }: WorldCardProps) {
  return (
    <article
      className={cn(
        'group relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl bg-void-2',
        'transition-all duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)]',
        'hover:-translate-y-1.5 hover:[transform:perspective(900px)_rotateX(1deg)_rotateY(-2deg)_translateY(-6px)]',
        RARITY_RING[world.rarity],
        className,
      )}
    >
      {/* 上部 55%：缩略图 + 深色渐变 */}
      <div className="relative h-[55%] overflow-hidden">
        {world.thumbnail ? (
          <img
            src={world.thumbnail}
            alt={world.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_50%_60%,rgba(87,230,240,.12),transparent_70%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void-2" />
      </div>

      {/* 中部：世界名 + 编号 */}
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-1">
        <h3 className="font-serif text-[20px] font-black leading-tight text-star">{world.name}</h3>
        <p className="font-mono text-[12px] tracking-wider text-star-faint">{world.code}</p>

        {/* 徽标行 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-[12px] text-star-dim">{world.biomeLabel}</span>
          <RarityBadge rarity={world.rarity} />
          <StabilityRing value={world.stability} size={28} />
        </div>
      </div>

      {/* 下部：最佳成绩 + 进入挑战 */}
      <div className="flex items-center justify-between gap-2 border-t border-white/5 px-4 py-3">
        <span className="font-mono text-[12px] text-star-faint">
          {world.bestScore != null ? `BEST ${world.bestScore.toLocaleString()}` : 'NO RECORD'}
        </span>
        <Link
          to={`/play/${encodeURIComponent(world.worldId)}`}
          className="rounded-full border border-star-faint/60 px-3.5 py-1.5 text-[12px] text-star-dim transition-all hover:border-cyan/70 hover:text-cyan hover:shadow-[0_0_16px_rgba(87,230,240,.2)]"
        >
          进入挑战
        </Link>
      </div>
    </article>
  );
}

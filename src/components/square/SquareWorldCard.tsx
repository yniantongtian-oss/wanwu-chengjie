/**
 * SquareWorldCard — 广场专用世界卡
 * 视觉沿用共享 WorldCard 规范（3:4 / 16px 圆角 / 稀有度描边 / 稳定度环），
 * 复用 RarityBadge + StabilityRing；卡身整体链接到档案页，底部保留「进入挑战」。
 * 广场专属信息：缩略图左上挑战人数（mono 11px）+ 卡底最新遗言一条（如有）。
 */

import { Link } from 'react-router';
import type { Rarity, StoredWorld } from '@/engine';
import { BIOME_LABELS } from '@/engine';
import RarityBadge from '@/components/RarityBadge';
import StabilityRing from '@/components/StabilityRing';
import ProgrammaticCover from '@/components/world/ProgrammaticCover';
import { cn } from '@/lib/utils';

const RARITY_RING: Record<Rarity, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary legendary-sweep',
  unique: 'rarity-unique unique-breathe',
};

export interface SquareWorldCardProps {
  world: StoredWorld;
  /** 最佳成绩（score），无记录传 null */
  bestScore: number | null;
  /** 已被挑战次数 */
  challengeCount: number;
  /** 最新一条世界遗言（可选） */
  lastWord?: string;
  className?: string;
}

export default function SquareWorldCard({ world, bestScore, challengeCount, lastWord, className }: SquareWorldCardProps) {
  const { dna } = world;
  const archivePath = `/world/${encodeURIComponent(world.worldId)}`;
  const playPath = `/play/${encodeURIComponent(world.worldId)}`;

  return (
    <article
      className={cn(
        'group relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl bg-void-2',
        'transition-all duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)]',
        'hover:-translate-y-1.5 hover:[transform:perspective(900px)_rotateX(1deg)_rotateY(-2deg)_translateY(-6px)]',
        RARITY_RING[dna.rarity],
        className,
      )}
    >
      <Link to={archivePath} aria-label={`查看 ${dna.worldName} 的世界档案`} className="flex min-h-0 flex-1 flex-col">
        {/* 上部 55%：缩略图（无图用程序化封面）+ 挑战人数角标 */}
        <div className="relative h-[55%] shrink-0 overflow-hidden">
          {world.thumbnail ? (
            <img
              src={world.thumbnail}
              alt={dna.worldName}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <ProgrammaticCover dna={dna} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void-2" />
          <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-void/60 px-2.5 py-1 font-mono text-[11px] tracking-wider text-star-dim backdrop-blur-sm">
            {challengeCount > 0 ? `${challengeCount} 次挑战` : '尚无挑战'}
          </span>
        </div>

        {/* 中部：世界名 + 编号 + 徽标行 */}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-4 pt-1">
          <h3 className="truncate font-serif text-[20px] font-black leading-tight text-star" title={dna.worldName}>
            {dna.worldName}
          </h3>
          <p className="font-mono text-[12px] tracking-wider text-star-faint">{dna.worldCode}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-[12px] text-star-dim">{BIOME_LABELS[dna.biome]}</span>
            <RarityBadge rarity={dna.rarity} />
            <StabilityRing value={world.stability} size={28} />
          </div>
        </div>

        {/* 卡底遗言（如有） */}
        {lastWord && (
          <p className="truncate px-4 pb-2 font-serif text-[12px] italic text-star-dim/90" title={lastWord}>
            “{lastWord}”
          </p>
        )}
      </Link>

      {/* 下部：最佳成绩 + 进入挑战 */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/5 px-4 py-3">
        <span className="font-mono text-[12px] text-star-faint">
          {bestScore != null ? `BEST ${bestScore.toLocaleString()}` : 'NO RECORD'}
        </span>
        <Link
          to={playPath}
          className="rounded-full border border-star-faint/60 px-3.5 py-1.5 text-[12px] text-star-dim transition-all hover:border-cyan/70 hover:text-cyan hover:shadow-[0_0_16px_rgba(87,230,240,.2)]"
        >
          进入挑战
        </Link>
      </div>
    </article>
  );
}

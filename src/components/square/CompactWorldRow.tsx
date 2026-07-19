/**
 * CompactWorldRow — 「最难 / 最稳定」Tab 下的紧凑列表行
 * 缩略图 64px + 世界名 + 编号 + 成绩 + 稳定度环 mini，整行可点进档案页。
 */

import { Link } from 'react-router';
import type { StoredWorld } from '@/engine';
import { BIOME_LABELS, RARITY_LABELS } from '@/engine';
import StabilityRing from '@/components/StabilityRing';
import ProgrammaticCover from '@/components/world/ProgrammaticCover';
import { formatRunTime } from '@/components/world/archiveUtils';
import type { BestRun } from '@/engine';

const DIFFICULTY_LABEL: Record<StoredWorld['dna']['difficulty'], string> = {
  gentle: '温和',
  standard: '标准',
  intense: '激烈',
};

interface CompactWorldRowProps {
  world: StoredWorld;
  best: BestRun | null;
  /** 行名次（排序后序号，1 起） */
  rank: number;
}

export default function CompactWorldRow({ world, best, rank }: CompactWorldRowProps) {
  const { dna } = world;
  const archivePath = `/world/${encodeURIComponent(world.worldId)}`;

  return (
    <article className="panel group flex items-center gap-4 px-4 py-3 transition-colors duration-300 hover:border-cyan/40">
      {/* 名次 */}
      <span className="w-7 shrink-0 text-center font-mono text-[13px] text-star-faint">
        {String(rank).padStart(2, '0')}
      </span>

      {/* 缩略图 64px */}
      <Link
        to={archivePath}
        aria-label={`查看 ${dna.worldName} 的世界档案`}
        className="block h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/8"
      >
        {world.thumbnail ? (
          <img src={world.thumbnail} alt={dna.worldName} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ProgrammaticCover dna={dna} showGlyph={false} />
        )}
      </Link>

      {/* 世界名 + 编号 */}
      <div className="min-w-0 flex-1">
        <Link to={archivePath} className="block truncate font-serif text-[17px] font-bold text-star transition-colors hover:text-cyan">
          {dna.worldName}
        </Link>
        <p className="mt-0.5 truncate font-mono text-[11px] tracking-wider text-star-faint">
          {dna.worldCode} · {BIOME_LABELS[dna.biome]} · {RARITY_LABELS[dna.rarity]}
        </p>
      </div>

      {/* 难度 */}
      <span className="hidden shrink-0 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] tracking-wider text-star-dim md:block">
        {DIFFICULTY_LABEL[dna.difficulty]}
      </span>

      {/* 最佳成绩 */}
      <span className="hidden w-32 shrink-0 text-right font-mono text-[12px] text-star-dim sm:block">
        {best ? (
          <>
            <span className="text-star">{best.score.toLocaleString()}</span>
            <span className="ml-2 text-star-faint">{formatRunTime(best.timeMs)}</span>
          </>
        ) : (
          <span className="text-star-faint">NO RECORD</span>
        )}
      </span>

      {/* 稳定度环 mini */}
      <StabilityRing value={world.stability} size={36} showLabel={false} className="shrink-0" />

      {/* 进入挑战 */}
      <Link
        to={`/play/${encodeURIComponent(world.worldId)}`}
        className="shrink-0 rounded-full border border-star-faint/60 px-3.5 py-1.5 text-[12px] text-star-dim transition-all hover:border-cyan/70 hover:text-cyan hover:shadow-[0_0_16px_rgba(87,230,240,.2)]"
      >
        进入挑战
      </Link>
    </article>
  );
}

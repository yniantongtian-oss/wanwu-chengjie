/**
 * ProgrammaticCover — 无缩略图时的程序化封面
 * 由世界 seed 确定性生成：色谱双色光斑 + 世界名首字 + 环轨线。
 */

import { memo } from 'react';
import type { WorldDNA } from '@/engine';
import { createRng } from '@/engine';
import { PALETTE_COLORS } from '@/components/world/archiveUtils';
import { cn } from '@/lib/utils';

interface ProgrammaticCoverProps {
  dna: WorldDNA;
  className?: string;
  /** 是否显示世界名首字（小尺寸卡片可关） */
  showGlyph?: boolean;
}

function ProgrammaticCoverInner({ dna, className, showGlyph = true }: ProgrammaticCoverProps) {
  const rng = createRng(dna.seed ^ 0x51ab);
  const [primary, secondary] = PALETTE_COLORS[dna.palette];
  const x1 = Math.round(rng.range(20, 80));
  const y1 = Math.round(rng.range(20, 55));
  const x2 = Math.round(rng.range(15, 85));
  const y2 = Math.round(rng.range(60, 90));
  const ringSize = Math.round(rng.range(55, 80));
  const glyph = dna.worldName.trim().charAt(0) || '界';

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-void', className)}
      role="img"
      aria-label={`${dna.worldName} 的程序化封面`}
    >
      {/* 双色光斑 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${x1}% ${y1}%, ${primary}26 0%, transparent 55%), radial-gradient(circle at ${x2}% ${y2}%, ${secondary}1f 0%, transparent 50%)`,
        }}
      />
      {/* 环轨 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{
          width: `${ringSize}%`,
          aspectRatio: '1',
          borderColor: `${primary}33`,
          boxShadow: `0 0 24px ${primary}14, inset 0 0 24px ${primary}0f`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
        style={{ width: `${ringSize * 0.68}%`, aspectRatio: '1', borderColor: `${secondary}2b` }}
      />
      {/* 轨道光点 */}
      <span
        className="absolute h-1.5 w-1.5 rounded-full"
        style={{
          left: `${50 + ringSize / 2.9}%`,
          top: '42%',
          background: primary,
          boxShadow: `0 0 10px ${primary}`,
        }}
      />
      {/* 世界名首字 */}
      {showGlyph && (
        <span
          className="absolute inset-0 flex items-center justify-center font-serif text-[52px] font-black"
          style={{ color: `${primary}cc`, textShadow: `0 0 32px ${primary}66` }}
        >
          {glyph}
        </span>
      )}
    </div>
  );
}

const ProgrammaticCover = memo(ProgrammaticCoverInner);
export default ProgrammaticCover;

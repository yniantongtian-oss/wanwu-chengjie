import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { createRng } from '@/engine';
import type { WorldDNA } from '@/engine';
import { PALETTE_COLORS } from './dnaLabels';
import { cn } from '@/lib/utils';

interface ProceduralWorldProps {
  dna: WorldDNA;
  className?: string;
  /** 星星密度，默认按面积中等 */
  starCount?: number;
}

/**
 * 程序化世界预览：无缩略图世界的兜底视觉。
 * 由 seed 决定的确定性星野 + 调色板双色辉光 + 地平线弧光。
 */
export default function ProceduralWorld({ dna, className, starCount = 42 }: ProceduralWorldProps) {
  const [colorA, colorB] = PALETTE_COLORS[dna.palette];

  const stars = useMemo(() => {
    const rng = createRng(dna.seed ^ 0x51ab);
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: rng.range(4, 96),
      y: rng.range(4, 90),
      r: rng.range(0.8, 2.2),
      o: rng.range(0.25, 0.95),
      warm: rng.chance(0.22),
    }));
  }, [dna.seed, starCount]);

  const style: CSSProperties = {
    background: [
      `radial-gradient(ellipse 90% 60% at 50% 108%, ${colorA}40, transparent 62%)`,
      `radial-gradient(circle at 28% 26%, ${colorA}30, transparent 55%)`,
      `radial-gradient(circle at 74% 62%, ${colorB}26, transparent 52%)`,
      'linear-gradient(180deg, #0A0F1A 0%, #05070D 100%)',
    ].join(', '),
  };

  return (
    <div className={cn('relative overflow-hidden', className)} style={style} aria-hidden>
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r,
            height: s.r,
            opacity: s.o,
            backgroundColor: s.warm ? colorB : '#E8F0FF',
            boxShadow: `0 0 ${s.r * 3}px ${s.warm ? colorB : colorA}`,
          }}
        />
      ))}
      {/* 悬浮小岛剪影 */}
      <span
        className="absolute left-1/2 top-[58%] h-[6%] w-[34%] -translate-x-1/2 rounded-[50%]"
        style={{ background: `linear-gradient(90deg, transparent, ${colorA}55, transparent)`, filter: 'blur(1px)' }}
      />
    </div>
  );
}

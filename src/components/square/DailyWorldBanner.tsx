/**
 * DailyWorldBanner — 每日世界焦点横幅（square.md S2）
 * 金色/琥珀基调；世界由页面用日期 hash 确定性选出，同一天所有访问相同。
 */

import { memo } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import type { StoredWorld } from '@/engine';
import { BIOME_LABELS } from '@/engine';
import RarityBadge from '@/components/RarityBadge';
import ProgrammaticCover from '@/components/world/ProgrammaticCover';
import { formatRunTime } from '@/components/world/archiveUtils';

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** 缓慢呼吸的世界大图（scale 1 → 1.06），独立 memo 组件隔离无限动画；reduced-motion 时静态 */
const BreathingImage = memo(function BreathingImage({ world }: { world: StoredWorld }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="h-full w-full"
      animate={reducedMotion ? undefined : { scale: [1, 1.06, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {world.thumbnail ? (
        <img src={world.thumbnail} alt={world.dna.worldName} className="h-full w-full object-cover" />
      ) : (
        <ProgrammaticCover dna={world.dna} />
      )}
    </motion.div>
  );
});

interface DailyWorldBannerProps {
  world: StoredWorld;
  /** 今日日期标签 YYYY-MM-DD */
  dateLabel: string;
  /** 已被挑战次数（真实本地成绩条数） */
  challengeCount: number;
  /** 最佳成绩毫秒，无记录传 null */
  bestTimeMs: number | null;
}

export default function DailyWorldBanner({ world, dateLabel, challengeCount, bestTimeMs }: DailyWorldBannerProps) {
  const { dna } = world;

  return (
    <motion.section
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
      className="panel relative grid overflow-hidden border-gold/25 lg:grid-cols-[2fr_3fr]"
      aria-label="每日世界"
    >
      {/* 金色氛围光 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(232,200,118,.07), transparent 60%)' }}
      />

      {/* 左 40%：世界大图 */}
      <Link
        to={`/world/${encodeURIComponent(world.worldId)}`}
        aria-label={`查看 ${dna.worldName} 的世界档案`}
        className="relative block h-56 overflow-hidden lg:h-[360px]"
      >
        <BreathingImage world={world} />
        <div className="absolute inset-0 bg-gradient-to-t from-void-2/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-void-2/80" />
      </Link>

      {/* 右 60%：信息 */}
      <div className="relative flex flex-col justify-center gap-4 p-6 md:p-10">
        {/* mono 徽标 + 金色呼吸描点 */}
        <p className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.25em] text-gold">
          <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-gold shadow-[0_0_10px_rgba(232,200,118,.9)]" />
          Daily World · 每日世界
        </p>

        <div>
          <h2 className="font-serif text-[26px] font-black leading-tight text-star md:text-[32px]">{dna.worldName}</h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] tracking-wider text-star-faint">
            <span>{dna.worldCode}</span>
            <span className="text-star-faint/60">·</span>
            <span>{BIOME_LABELS[dna.biome]}</span>
            <RarityBadge rarity={dna.rarity} />
          </p>
        </div>

        {/* 今日主题语（世界挑战文案） */}
        <blockquote className="border-l-2 border-gold/70 pl-4 font-serif text-[16px] italic leading-[1.8] text-star-dim md:text-[17px]">
          “{dna.shareText}”
        </blockquote>

        {/* 数据行 */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] tracking-wider text-star-faint">
          <CalendarDays className="h-3.5 w-3.5 text-gold/70" />
          <span>{dateLabel}</span>
          <span className="text-star-faint/60">·</span>
          {challengeCount > 0 ? (
            <>
              <span>
                已被挑战 <span className="text-star">{challengeCount.toLocaleString()}</span> 次
              </span>
              <span className="text-star-faint/60">·</span>
              <span>
                最佳成绩 <span className="text-gold">{bestTimeMs != null ? formatRunTime(bestTimeMs) : '—'}</span>
              </span>
            </>
          ) : (
            <span className="text-star-dim">今日还没有人挑战 · 成为第一个</span>
          )}
        </p>

        <div className="mt-1 flex flex-wrap gap-3">
          <Link
            to={`/play/${encodeURIComponent(world.worldId)}`}
            className="btn-primary h-12 px-7 text-[15px] shadow-gold-glow"
          >
            进入今日世界
          </Link>
          <Link to={`/world/${encodeURIComponent(world.worldId)}`} className="btn-ghost h-12 px-6 text-[14px]">
            查看档案
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

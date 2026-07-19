import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { Rarity, WorldDNA } from '@/engine';
import { BIOME_LABELS, RARITY_LABELS } from '@/engine';
import RarityBadge from '@/components/RarityBadge';
import TypeText from '@/components/create/TypeText';
import ProceduralWorld from '@/components/create/ProceduralWorld';
import { phaseAtLeast } from './revealPhase';
import type { RevealPhase } from './revealPhase';
import { cn } from '@/lib/utils';

const RARITY_RING: Record<Rarity, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary legendary-sweep',
  unique: 'rarity-unique unique-breathe',
};

const RARITY_SWEEP_COLOR: Record<Rarity, string> = {
  common: 'rgba(147,160,184,.85)',
  rare: 'rgba(87,230,240,.9)',
  epic: 'rgba(139,124,246,.9)',
  legendary: 'rgba(232,200,118,.95)',
  unique: 'rgba(232,200,118,.95)',
};

/** 失败变体的裂纹纹理（CSS 叠加） */
const CRACK_STYLE: CSSProperties = {
  backgroundImage: [
    'linear-gradient(63deg, transparent 49.6%, rgba(232,240,255,.13) 49.9%, transparent 50.2%)',
    'linear-gradient(121deg, transparent 49.5%, rgba(232,240,255,.1) 49.8%, transparent 50.15%)',
    'linear-gradient(158deg, transparent 49.6%, rgba(232,240,255,.12) 49.9%, transparent 50.25%)',
    'linear-gradient(24deg, transparent 49.7%, rgba(232,240,255,.08) 49.9%, transparent 50.2%)',
  ].join(', '),
};

interface RevealCardProps {
  dna: WorldDNA;
  thumbnail?: string;
  victory: boolean;
  phase: RevealPhase;
  reducedMotion: boolean;
  /** 删除世界时的消散动画 */
  dissolving?: boolean;
}

/**
 * 结算页世界卡（3:4）：卡背扫光 → rotateY 翻面 → 世界名字距收拢 + 编号打字机。
 * 失败变体：灰暗 + 裂纹。
 */
export default function RevealCard({
  dna,
  thumbnail,
  victory,
  phase,
  reducedMotion,
  dissolving = false,
}: RevealCardProps) {
  const flipped = phaseAtLeast(phase, 'flip');
  const sweeping = phase === 'sweep';
  const codeTyping = phaseAtLeast(phase, 'data');

  return (
    <motion.div
      animate={dissolving ? { opacity: 0, y: 60, scale: 0.94, filter: 'blur(10px)' } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: dissolving ? 0.8 : 0.4, ease: dissolving ? [0.6, 0, 0.2, 1] : 'easeOut' }}
      style={{ perspective: 1200 }}
      className="relative w-[min(360px,82vw)]"
    >
      {/* 稀有度扫光读数 */}
      {sweeping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap font-mono text-[13px] tracking-[0.3em]"
          style={{ color: RARITY_SWEEP_COLOR[dna.rarity] }}
        >
          <TypeText
            text={`${dna.rarity.toUpperCase()} · ${RARITY_LABELS[dna.rarity]}`}
            speed={50}
            instant={reducedMotion}
            showCursor
          />
        </motion.div>
      )}

      <motion.div
        initial={false}
        animate={{ rotateY: flipped ? 0 : 180 }}
        transition={
          reducedMotion
            ? { duration: 0.2 }
            : { type: 'spring', stiffness: 90, damping: 16 }
        }
        style={{ transformStyle: 'preserve-3d' }}
        className="relative aspect-[3/4] w-full"
      >
        {/* ── 卡背 ── */}
        <div
          className={cn('absolute inset-0 overflow-hidden rounded-2xl bg-void-2', RARITY_RING[dna.rarity])}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <img src="/og-cover.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-transparent to-void/70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <img src="/logo.svg" alt="" className="h-10 w-10 opacity-80" />
            <span className="font-mono text-[11px] tracking-[0.4em] text-star-dim">K3-WORLD ARCHIVE</span>
          </div>
          {/* 稀有度扫光 */}
          {sweeping && !reducedMotion && (
            <motion.div
              className="absolute inset-y-0 w-[45%]"
              style={{
                background: `linear-gradient(100deg, transparent, ${RARITY_SWEEP_COLOR[dna.rarity]} 50%, transparent)`,
                filter: 'blur(6px)',
                mixBlendMode: 'screen',
              }}
              initial={{ left: '-50%' }}
              animate={{ left: '110%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          )}
          {/* 传说/唯一：星尘爆点 */}
          {sweeping && !reducedMotion && (dna.rarity === 'legendary' || dna.rarity === 'unique') &&
            Array.from({ length: 14 }, (_, i) => {
              const angle = (i / 14) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-gold"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos(angle) * 130,
                    y: Math.sin(angle) * 130,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
                />
              );
            })}
        </div>

        {/* ── 卡面 ── */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-void-2',
            RARITY_RING[dna.rarity],
            !victory && 'saturate-[.35] brightness-[.85]',
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* 底图 og-cover 微光 */}
          <img src="/og-cover.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />

          {/* 上部 55%：世界缩略图 / 程序化预览 */}
          <div className="relative h-[55%] overflow-hidden">
            {thumbnail ? (
              <img src={thumbnail} alt={dna.worldName} className="h-full w-full object-cover" />
            ) : (
              <ProceduralWorld dna={dna} className="h-full w-full" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void-2" />
            {!victory && <div className="absolute inset-0" style={CRACK_STYLE} />}
          </div>

          {/* 世界名（字距收拢）+ 编号（打字机） */}
          <div className="flex flex-1 flex-col gap-1.5 px-5 pt-2">
            <motion.h2
              initial={false}
              animate={{ letterSpacing: flipped ? '0.02em' : '0.4em' }}
              transition={{ duration: reducedMotion ? 0.01 : 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-center font-serif text-[24px] font-black leading-snug text-star"
            >
              {dna.worldName}
            </motion.h2>
            <p className="text-center font-mono text-[13px] tracking-wider text-star-faint">
              {codeTyping ? (
                <TypeText text={dna.worldCode} speed={55} instant={reducedMotion} />
              ) : (
                ' '
              )}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-star-dim">
                {BIOME_LABELS[dna.biome]}
              </span>
              <RarityBadge rarity={dna.rarity} />
            </div>
          </div>

          {/* 底部档案行 */}
          <div className="border-t border-white/5 px-5 py-3 text-center font-mono text-[10px] tracking-[0.3em] text-star-faint">
            {victory ? 'ARCHIVED // 已建档' : 'ZERO STABILITY // 稳定度归零'}
          </div>

          {!victory && <div className="pointer-events-none absolute inset-0" style={CRACK_STYLE} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

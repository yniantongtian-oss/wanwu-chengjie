import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FastForward, MousePointerClick } from 'lucide-react';
import type { WorldDNA } from '@/engine';
import { BIOME_LABELS, RARITY_LABELS } from '@/engine';
import type { GenSession } from './inputTypes';
import ShatterCanvas from './ShatterCanvas';
import ProceduralWorld from './ProceduralWorld';
import TypeText from './TypeText';
import {
  SKY_LABELS,
  WEATHER_LABELS,
  MUTATION_LABELS,
  BOSS_LABELS,
} from './dnaLabels';
import { cn } from '@/lib/utils';

type Phase = 'scan' | 'tags' | 'rules' | 'shatter' | 'portal' | 'hint';

const DURATIONS: Record<Exclude<Phase, 'hint'>, number> = {
  scan: 2500,
  tags: 3000,
  rules: 4500,
  shatter: 2000,
  portal: 2200,
};

const REDUCED_DURATIONS: Record<Exclude<Phase, 'hint'>, number> = {
  scan: 1400,
  tags: 2000,
  rules: 3200,
  shatter: 900,
  portal: 1400,
};

const STATUS: Record<Phase, string> = {
  scan: 'SCANNING // 正在扫描输入…',
  tags: 'PARSING // 正在识别…',
  rules: 'WRITING // 正在书写世界法则…',
  shatter: 'DECOMPOSING // 物质解构中…',
  portal: 'OPENING // 传送门成形…',
  hint: 'READY // 世界已就绪',
};

const TAG_POSITIONS = [
  { top: '14%', left: '8%' },
  { top: '30%', right: '6%' },
  { top: '52%', left: '12%' },
  { top: '68%', right: '10%' },
  { top: '82%', left: '30%' },
];

interface GeneratingSequenceProps {
  session: GenSession;
  /** 实时解析出的 DNA（分镜开始时并行发起，法则阶段前必然就绪） */
  dna: WorldDNA | null;
  tags: string[];
  reducedMotion: boolean;
  /** 分镜完成 / 用户确认 → 进入穿越 */
  onEnter: () => void;
  /** 跳过动画 → 直接进世界 */
  onSkip: () => void;
}

const SOURCE_WORD: Record<GenSession['payload']['type'], string> = {
  photo: '照片',
  text: '一句话',
  emoji: '三个表情',
};

/** 生成序列（状态 B）：扫描 → 识别 → 法则 → 碎裂 → 成门 → 待命，可跳过 */
export default function GeneratingSequence({
  session,
  dna,
  tags,
  reducedMotion,
  onEnter,
  onSkip,
}: GeneratingSequenceProps) {
  const [phase, setPhase] = useState<Phase>(session.skipScan ? 'rules' : 'scan');
  const [cardHidden, setCardHidden] = useState(false);
  const [sourceRect, setSourceRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const onEnterRef = useRef(onEnter);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  const durations = reducedMotion ? REDUCED_DURATIONS : DURATIONS;

  // 相位状态机
  useEffect(() => {
    if (phase === 'hint') {
      const t = window.setTimeout(() => onEnterRef.current(), reducedMotion ? 2000 : 3000);
      return () => window.clearTimeout(t);
    }
    const order: Array<Exclude<Phase, 'hint'>> = ['scan', 'tags', 'rules', 'shatter', 'portal'];
    const idx = order.indexOf(phase);
    const next: Phase = order[idx + 1] ?? 'hint';
    const t = window.setTimeout(() => setPhase(next), durations[phase]);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reducedMotion]);

  // 碎裂开始：先量取输入卡位置，再隐藏卡片
  useEffect(() => {
    if (phase === 'shatter') {
      const el = cardRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setSourceRect({ x: r.left, y: r.top, w: r.width, h: r.height });
      }
      setCardHidden(true);
    }
  }, [phase]);

  // hint 阶段：任意键 / 点击进入
  useEffect(() => {
    if (phase !== 'hint') return;
    const enter = () => onEnterRef.current();
    window.addEventListener('keydown', enter);
    return () => window.removeEventListener('keydown', enter);
  }, [phase]);

  const showCard = phase === 'scan' || phase === 'tags' || phase === 'rules';
  const showRules = phase === 'rules';
  const showTags = phase === 'tags' || phase === 'rules';
  const showPortal = phase === 'portal' || phase === 'hint';

  const ruleRows: Array<[string, string]> = dna
    ? [
        ['世界名', dna.worldName],
        ['类型', BIOME_LABELS[dna.biome]],
        ['重力', dna.gravity.toFixed(2)],
        ['天空', SKY_LABELS[dna.sky]],
        ['天气', WEATHER_LABELS[dna.weather]],
        ['突变', `${MUTATION_LABELS[dna.mutation]} · @${dna.mutationAtSeconds}s`],
        ['Boss', BOSS_LABELS[dna.boss]],
        ['稀有度', `${dna.rarity.toUpperCase()} · ${RARITY_LABELS[dna.rarity]}`],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-void">
      {/* 粒子画布 */}
      {!reducedMotion && (phase === 'shatter' || showPortal) && (
        <ShatterCanvas mode={phase === 'shatter' ? 'gather' : 'ring'} sourceRect={sourceRect} />
      )}

      {/* 顶栏：步骤 + 跳过 */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <span className="font-mono text-[12px] tracking-[0.3em] text-star-faint">STEP 2/3 · 生成</span>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 font-mono text-[12px] tracking-wider text-star-dim transition-colors hover:border-cyan/50 hover:text-cyan"
        >
          <FastForward className="h-3.5 w-3.5" /> 跳过动画
        </button>
      </div>

      {/* 主体：输入卡 + 法则面板 */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            key="stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reducedMotion ? 0.3 : 0.45 } }}
            className="relative z-10 mx-auto grid h-full w-full max-w-5xl content-center gap-6 overflow-y-auto px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-2 lg:gap-10"
          >
            {/* 输入源预览卡 */}
            <div ref={cardRef} className={cn('relative self-center', cardHidden && 'invisible')}>
              <div className="panel relative overflow-hidden rounded-2xl">
                <div className="relative flex min-h-[200px] items-center justify-center sm:min-h-[320px]">
                  {session.sampleThumbnail ? (
                    <img
                      src={session.sampleThumbnail}
                      alt="示例世界"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : session.payload.type === 'photo' ? (
                    <img
                      src={session.payload.dataUrl}
                      alt="输入照片"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : session.payload.type === 'text' ? (
                    <p className="px-8 py-10 text-center font-serif text-[24px] font-bold leading-relaxed text-star">
                      「{session.payload.text}」
                    </p>
                  ) : (
                    <p className="px-8 py-10 text-center text-[56px] leading-none tracking-widest">
                      {session.payload.emojis.join(' ')}
                    </p>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/60 via-transparent to-void/30" />

                  {/* 扫描光带（2 次） */}
                  {phase === 'scan' && !session.skipScan && (
                    <motion.div
                      className="absolute left-0 right-0 h-[2px]"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgba(87,230,240,.95) 50%, transparent)',
                        boxShadow: '0 0 24px 6px rgba(87,230,240,.35)',
                      }}
                      initial={{ top: '0%' }}
                      animate={{ top: ['0%', '100%'] }}
                      transition={{
                        duration: reducedMotion ? 0.7 : 1.25,
                        repeat: 1,
                        ease: 'linear',
                      }}
                    />
                  )}

                  {/* 识别标签 */}
                  {showTags &&
                    tags.slice(0, 5).map((tag, i) => (
                      <motion.span
                        key={`${tag}-${i}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.4, type: 'spring', stiffness: 320, damping: 18 }}
                        className="absolute z-10 flex items-center gap-1.5"
                        style={TAG_POSITIONS[i % TAG_POSITIONS.length]}
                      >
                        <span className="h-1 w-1 rounded-full bg-cyan shadow-[0_0_6px_rgba(87,230,240,.9)]" />
                        <span className="h-px w-5 bg-cyan/50" />
                        <span className="rounded-full border border-cyan/40 bg-void/85 px-2.5 py-1 font-mono text-[12px] text-cyan backdrop-blur-sm">
                          <TypeText text={tag} speed={70} instant={reducedMotion} />
                        </span>
                      </motion.span>
                    ))}
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[11px] tracking-[0.25em] text-star-faint">
                INPUT // K3 正在注视
              </p>
            </div>

            {/* 世界法则面板 */}
            <div className="self-center">
              <p className="font-mono text-[11px] tracking-[0.25em] text-star-faint">WORLD DNA // 法则档案</p>
              <div className="mt-3 space-y-2">
                {showRules && ruleRows.length === 0 && (
                  <p className="font-mono text-[13px] text-star-dim">推演中…</p>
                )}
                {showRules &&
                  ruleRows.map(([label, value], i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        boxShadow: [
                          'inset 0 0 0 rgba(87,230,240,0)',
                          'inset 0 0 18px rgba(87,230,240,.14)',
                          'inset 0 0 0 rgba(87,230,240,0)',
                        ],
                      }}
                      transition={{
                        delay: i * 0.5,
                        duration: 0.45,
                        boxShadow: { delay: i * 0.5, duration: 0.9 },
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="flex items-baseline gap-3 rounded-lg border border-white/10 bg-void-2/70 px-4 py-2.5"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_6px_rgba(87,230,240,.8)]" />
                      <span className="w-14 shrink-0 text-[13px] text-star-dim">{label}</span>
                      <span className="font-mono text-[14px] tracking-wide text-star">{value}</span>
                    </motion.div>
                  ))}
                {!showRules && (
                  <div className="space-y-2 opacity-30">
                    {['重力', '天空', '突变', 'Boss'].map((label) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-lg border border-white/5 bg-void-2/40 px-4 py-2.5"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-star-faint" />
                        <span className="w-14 text-[13px] text-star-faint">{label}</span>
                        <span className="font-mono text-[13px] text-star-faint">···</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 传送门（成门 + 待命） */}
      <AnimatePresence>
        {showPortal && (
          <motion.div
            key="portal"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={phase === 'hint' ? () => onEnterRef.current() : undefined}
            role={phase === 'hint' ? 'button' : undefined}
            aria-label={phase === 'hint' ? '进入世界' : undefined}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              className="relative h-[200px] w-[200px] overflow-hidden rounded-full sm:h-[260px] sm:w-[260px]"
              style={{
                border: '1px solid rgba(87,230,240,.55)',
                boxShadow:
                  '0 0 44px rgba(87,230,240,.35), inset 0 0 32px rgba(87,230,240,.22), 0 0 120px rgba(87,230,240,.12)',
              }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1 }}
                animate={{ scale: 1.1 }}
                transition={{ duration: reducedMotion ? 0.01 : 5, ease: 'linear' }}
              >
                {session.sampleThumbnail ? (
                  <img src={session.sampleThumbnail} alt="" className="h-full w-full object-cover" />
                ) : dna ? (
                  <ProceduralWorld dna={dna} className="h-full w-full" />
                ) : (
                  <img src="/portal-frame.png" alt="" className="h-full w-full object-cover" />
                )}
              </motion.div>
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(5,7,13,.8)]" />
            </motion.div>

            {phase === 'hint' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8 flex flex-col items-center gap-3 px-6 text-center"
              >
                <p className="font-serif text-[20px] font-bold text-star sm:text-[24px]">
                  {session.sampleThumbnail
                    ? '这个世界，一直在档案局等你。'
                    : `这个世界，由你的${SOURCE_WORD[session.payload.type]}而生。`}
                </p>
                <button
                  type="button"
                  onClick={() => onEnterRef.current()}
                  className="mt-1 inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.25em] text-cyan/90 transition-colors hover:text-cyan"
                >
                  <MousePointerClick className="h-4 w-4 animate-breathe" />
                  按任意键 / 点击 进入
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部状态行 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-6">
        <span className="font-mono text-[12px] tracking-[0.25em] text-star-dim">{STATUS[phase]}</span>
      </div>
    </div>
  );
}

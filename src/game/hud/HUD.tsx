/**
 * HUD.tsx — 游戏内极简 HUD（任务 / 倒计时 / 稳定度 / 一个主按钮 + 阶段点 + 教学 + 字幕）
 */

import { useEffect, useReducer, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Volume2,
  VolumeX,
  Move,
  Hexagon,
  AlertTriangle,
  Diamond,
  Triangle,
  Circle,
  Check,
} from 'lucide-react';
import type { WorldDNA } from '@/engine';
import StabilityRing from '@/components/StabilityRing';
import RarityBadge from '@/components/RarityBadge';
import { cn } from '@/lib/utils';
import type { LevelData } from '../level';
import { relays } from '../bus';
import { useRunStore, missionText } from '../runStore';
import { sound } from '../audio';
import { writePlaySettings, markTutorialDone } from '../settings';
import { BOSS_LABELS, MUTATION_LABELS, SKY_LABELS } from '../palettes';

// ── 工具 ─────────────────────────────────────────────

function useTicker(ms = 100): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return n;
}

const PHASES = ['observe', 'act', 'mutate', 'boss', 'sprint'] as const;
const PHASE_LABELS = ['观察', '行动', '突变', 'Boss', '冲刺'];
const PHASE_COLORS = ['#57E6F0', '#57E6F0', '#F5B84C', '#FF4D5E', '#5EE0A0'];

// ── 任务卡 ───────────────────────────────────────────

function MissionCard() {
  const phase = useRunStore((s) => s.phase);
  const collected = useRunStore((s) => s.collected);
  const total = useRunStore((s) => s.total);
  const nodesActivated = useRunStore((s) => s.nodesActivated);
  const nodeGoal = useRunStore((s) => s.nodeGoal);
  const bossDefeated = useRunStore((s) => s.bossDefeated);
  const hasBoss = useRunStore((s) => s.hasBoss);
  const portalActive = useRunStore((s) => s.portalActive);
  const gravityFlipped = useRunStore((s) => s.gravityFlipped);
  const blackout = useRunStore((s) => s.blackout);

  const m = missionText({ phase, collected, total, nodesActivated, nodeGoal, bossDefeated, hasBoss, portalActive, gravityFlipped, blackout });

  return (
    <motion.div
      key={m.title + m.progress}
      initial={{ x: -8, opacity: 0.4, boxShadow: '0 0 0 rgba(87,230,240,0)' }}
      animate={{ x: 0, opacity: 1, boxShadow: ['0 0 0 rgba(87,230,240,0)', '0 0 18px rgba(87,230,240,.35)', '0 0 0 rgba(87,230,240,0)'] }}
      transition={{ duration: 0.6, times: [0, 0.3, 1] }}
      className="panel pointer-events-auto px-4 py-3"
    >
      <p className="font-mono text-[10px] tracking-[0.28em] text-star-faint">MISSION</p>
      <p className="mt-1 font-serif text-[16px] leading-snug text-star">{m.title}</p>
      {m.progress && <p className="mt-1 font-mono text-[13px] tracking-wider text-cyan">{m.progress}</p>}
    </motion.div>
  );
}

// ── 世界名标签 ───────────────────────────────────────

function WorldTag({ dna }: { dna: WorldDNA }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="pointer-events-auto relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p className="cursor-default text-[13px] text-star-dim">
        <span className="font-serif font-bold text-star">{dna.worldName}</span>
        <span className="ml-2 font-mono text-[11px] text-star-faint">{dna.worldCode}</span>
      </p>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="panel absolute left-0 top-full z-30 mt-2 w-64 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-star-faint">{dna.worldCode}</span>
              <RarityBadge rarity={dna.rarity} />
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-star-dim">{dna.worldDescription}</p>
            <div className="mt-2 space-y-0.5 font-mono text-[11px] text-star-faint">
              <p>天空 · {SKY_LABELS[dna.sky]}</p>
              <p>突变 · {MUTATION_LABELS[dna.mutation]} @ {dna.mutationAtSeconds}s</p>
              <p>看守 · {BOSS_LABELS[dna.boss]}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 倒计时 ───────────────────────────────────────────

function Countdown() {
  useTicker(100);
  // 用 getState 避免 60fps 订阅重渲染（ticker 10Hz 已足够）
  const { runSeconds, totalSeconds: total } = useRunStore.getState();
  const remaining = Math.max(0, total - runSeconds);
  const danger = remaining <= 15;
  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);
  const frac = remaining / total;

  return (
    <div className="pointer-events-auto flex flex-col items-center">
      <motion.div
        animate={danger ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={danger ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        className={cn('font-mono text-[28px] font-semibold tabular-nums', danger ? 'text-red' : 'text-star')}
        style={danger ? { textShadow: '0 0 18px rgba(255,77,94,.5)' } : undefined}
      >
        {mm}:{String(ss).padStart(2, '0')}
      </motion.div>
      {/* 细进度环（SVG 圆弧收缩） */}
      <svg width={64} height={10} viewBox="0 0 64 10" className="mt-1" aria-hidden>
        <path d="M 6 8 A 27 27 0 0 1 58 8" fill="none" stroke="rgba(147,160,184,.2)" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M 6 8 A 27 27 0 0 1 58 8"
          fill="none"
          stroke={danger ? '#FF4D5E' : '#57E6F0'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={85}
          strokeDashoffset={85 * (1 - frac)}
          style={{ transition: 'stroke-dashoffset .12s linear' }}
        />
      </svg>
      <span className="sr-only">剩余 {mm} 分 {ss} 秒</span>
    </div>
  );
}

// ── 阶段指示点 ───────────────────────────────────────

function PhaseDots() {
  const phase = useRunStore((s) => s.phase);
  const idx = PHASES.indexOf(phase);
  return (
    <div className="pointer-events-auto flex items-center gap-2.5" aria-label={`当前阶段：${PHASE_LABELS[idx]}`}>
      {PHASES.map((p, i) => (
        <span
          key={p}
          title={PHASE_LABELS[i]}
          className="h-1 w-1 rounded-full transition-all"
          style={{
            backgroundColor: i <= idx ? PHASE_COLORS[i] : 'rgba(147,160,184,.3)',
            boxShadow: i === idx ? `0 0 8px ${PHASE_COLORS[i]}` : undefined,
            transform: i === idx ? 'scale(1.6)' : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ── 主按钮（唯一，上下文） ────────────────────────────

function MainButton({ dna, level }: { dna: WorldDNA; level: LevelData }) {
  useTicker(120);
  const phase = useRunStore((s) => s.phase);
  const collected = useRunStore((s) => s.collected);
  const total = useRunStore((s) => s.total);
  const bossDefeated = useRunStore((s) => s.bossDefeated);
  const hasBoss = useRunStore((s) => s.hasBoss);
  const portalActive = useRunStore((s) => s.portalActive);
  const mutationStage = useRunStore((s) => s.mutationStage);
  const nodesLit = useRunStore((s) => s.nodesLit);
  const setPhase = useRunStore((s) => s.setPhase);
  const activatePortal = useRunStore((s) => s.activatePortal);
  const requestNodeActivation = useRunStore((s) => s.requestNodeActivation);

  const [hold, setHold] = useState(0);
  const holdRaf = useRef(0);
  const holdStart = useRef(0);

  const nearNode =
    (phase === 'boss' || phase === 'sprint') &&
    hasBoss &&
    !bossDefeated &&
    relays.nearestNodeDist < 3.4 &&
    relays.nearestNodeId >= 0 &&
    !nodesLit.includes(relays.nearestNodeId);

  const canActivate =
    collected >= total &&
    !portalActive &&
    mutationStage === 'done' &&
    (dna.mission === 'collect_and_escape' || bossDefeated);

  const cancelHold = () => {
    cancelAnimationFrame(holdRaf.current);
    setHold(0);
  };

  const startHold = () => {
    sound.ensure();
    const id = relays.nearestNodeId;
    if (id < 0) return;
    holdStart.current = performance.now();
    const step = () => {
      const k = (performance.now() - holdStart.current) / 1000;
      if (k >= 1) {
        setHold(0);
        requestNodeActivation(id);
        return;
      }
      setHold(k);
      holdRaf.current = requestAnimationFrame(step);
    };
    holdRaf.current = requestAnimationFrame(step);
  };

  useEffect(() => cancelHold, []);

  if (phase === 'observe') {
    return (
      <button
        type="button"
        className="btn-primary pointer-events-auto h-14 px-8 text-[15px]"
        onClick={() => {
          sound.ensure();
          sound.uiTick();
          setPhase('act');
        }}
      >
        开始行动
      </button>
    );
  }

  if (nearNode) {
    const r = 26;
    const c = 2 * Math.PI * r;
    return (
      <button
        type="button"
        aria-label="长按注入能量"
        className="btn-primary pointer-events-auto relative h-14 select-none px-8 text-[15px]"
        style={{ touchAction: 'none', borderColor: 'var(--amber)', color: 'var(--amber)' }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
      >
        <svg className="absolute inset-0 m-auto h-11 w-11 opacity-80" viewBox="0 0 64 64">
          <circle
            cx={32}
            cy={32}
            r={r}
            fill="none"
            stroke="var(--amber)"
            strokeWidth={2.5}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - hold)}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="pl-8">注入能量（长按）</span>
      </button>
    );
  }

  if (canActivate) {
    return (
      <button
        type="button"
        className="btn-primary pointer-events-auto h-14 px-8 text-[15px]"
        onClick={() => {
          sound.ensure();
          activatePortal();
          sound.portalOpen();
        }}
      >
        激活出口
      </button>
    );
  }

  // 节点距离提示（不可交互时给一句方向提示）
  if (phase === 'boss' && hasBoss && !bossDefeated && level.nodes.length > 0) {
    return (
      <div className="panel pointer-events-none px-4 py-2 text-[12px] text-star-faint">
        靠近琥珀光柱可注入能量
      </div>
    );
  }
  return null;
}

// ── 教学 ─────────────────────────────────────────────

const TUTORIAL_CARDS = [
  { icon: Move, title: '移动', body: 'WASD / 左侧摇杆。走过去，就是全部操作。' },
  { icon: Hexagon, title: '收集', body: '发光的碎片，是这个世界的记忆。收集它们。' },
  { icon: AlertTriangle, title: '小心', body: '这个世界活着。它会改变规则。' },
];

function TutorialCards() {
  const tutorial = useRunStore((s) => s.tutorial);
  const status = useRunStore((s) => s.status);
  const next = useRunStore((s) => s.tutorialCardNext);
  const skip = useRunStore((s) => s.tutorialSkipCards);

  useEffect(() => {
    if (tutorial.cardsDone || status !== 'playing') return;
    const id = window.setTimeout(() => next(), 2500);
    return () => window.clearTimeout(id);
  }, [tutorial.cardsDone, tutorial.cardIndex, status, next]);

  if (tutorial.cardsDone || status !== 'playing') return null;
  const card = TUTORIAL_CARDS[Math.min(tutorial.cardIndex, TUTORIAL_CARDS.length - 1)];
  const Icon = card.icon;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[22%] z-30 flex flex-col items-center" onClick={() => next()}>
      <AnimatePresence mode="wait">
        <motion.div
          key={tutorial.cardIndex}
          initial={{ y: 24, opacity: 0, filter: 'blur(6px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -12, opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.3 }}
          className="panel flex max-w-[320px] cursor-pointer flex-col items-center px-6 py-5 text-center"
        >
          <Icon className="h-6 w-6 text-cyan" />
          <p className="mt-2 font-serif text-[20px] font-bold text-star">{card.title}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-star-dim">{card.body}</p>
        </motion.div>
      </AnimatePresence>
      <button
        type="button"
        className="mt-3 font-mono text-[11px] tracking-widest text-star-faint transition-colors hover:text-cyan"
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
      >
        跳过教学 →
      </button>
    </div>
  );
}

function StepTracker() {
  const tutorial = useRunStore((s) => s.tutorial);
  const phase = useRunStore((s) => s.phase);
  const celebratedRef = useRef(false);

  const allDone = tutorial.moved && tutorial.collectedOne && tutorial.jumpedObstacle;
  useEffect(() => {
    if (allDone && !celebratedRef.current) {
      celebratedRef.current = true;
      markTutorialDone();
      sound.stepDone();
    }
  }, [allDone]);

  if (!tutorial.cardsDone || allDone || phase === 'sprint') return null;

  const steps = [
    { done: tutorial.moved, label: '前进 3 米' },
    { done: tutorial.collectedOne, label: '收集一块碎片' },
    { done: tutorial.jumpedObstacle, label: '跳过一个矮障碍' },
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
      <div className="panel flex items-center gap-4 px-4 py-2">
        {steps.map((s) => (
          <span key={s.label} className={cn('flex items-center gap-1.5 text-[12px]', s.done ? 'text-green' : 'text-star-dim')}>
            {s.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 突变分镜文字 ──────────────────────────────────────

function MutationOverlay({ dna }: { dna: WorldDNA }) {
  const stage = useRunStore((s) => s.mutationStage);
  const phase = useRunStore((s) => s.phase);
  if (phase !== 'mutate' || stage === 'none' || stage === 'done') return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {stage === 'omen' ? (
          <motion.p
            key="omen"
            initial={{ opacity: 0, letterSpacing: '0.6em' }}
            animate={{ opacity: 1, letterSpacing: '0.2em' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="px-4 text-center font-serif text-[20px] text-amber"
            style={{ textShadow: '0 0 24px rgba(245,184,76,.4)' }}
          >
            世界规则正在被重写
          </motion.p>
        ) : (
          <motion.p
            key="transform"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="px-4 text-center font-serif text-[26px] font-bold text-amber"
            style={{ textShadow: '0 0 32px rgba(245,184,76,.5)' }}
          >
            {MUTATION_LABELS[dna.mutation]}
          </motion.p>
        )}
      </AnimatePresence>
      {stage === 'transform' && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.22, 0.08] }}
          transition={{ duration: 2.2 }}
          style={{ background: 'radial-gradient(circle at center, rgba(245,184,76,.35), transparent 70%)' }}
        />
      )}
    </div>
  );
}

// ── 字幕 ─────────────────────────────────────────────

function SubtitleBar() {
  useTicker(200);
  const subtitles = useRunStore((s) => s.settings.subtitles);
  const fresh = Date.now() - relays.subtitleAt < 3500;
  if (!subtitles || !fresh || !relays.subtitle) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-40 z-20 flex justify-center px-4" aria-live="polite">
      <motion.p
        key={relays.subtitleAt}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-full border border-white/10 bg-void/70 px-4 py-1.5 text-[13px] text-star-dim backdrop-blur-sm"
      >
        {relays.subtitle}
      </motion.p>
    </div>
  );
}

// ── 屏幕边缘闪光 / 危险暗角 ───────────────────────────

function FlashLayer() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const now = Date.now();
      if (now - relays.flashCyanAt < 260 || now - relays.flashRedAt < 320 || now - relays.flashGoldAt < 500) {
        force();
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const now = Date.now();
  const cyanAge = now - relays.flashCyanAt;
  const redAge = now - relays.flashRedAt;
  const goldAge = now - relays.flashGoldAt;
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);
  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {cyanAge < 260 && (
        <div
          className="absolute inset-0"
          style={{ opacity: 1 - cyanAge / 260, boxShadow: 'inset 0 0 60px rgba(87,230,240,.35)' }}
        />
      )}
      {redAge < 320 && (
        <div
          className="absolute inset-0"
          style={{ opacity: 1 - redAge / 320, boxShadow: 'inset 0 0 70px rgba(255,77,94,.45)' }}
        />
      )}
      {goldAge < 500 && (
        <div
          className="absolute inset-0"
          style={{ opacity: 1 - goldAge / 500, boxShadow: 'inset 0 0 120px rgba(232,200,118,.4)' }}
        />
      )}
    </div>
  );
}

function DangerVignette() {
  useTicker(200);
  const { runSeconds, totalSeconds, bossSpawned, bossDefeated } = useRunStore.getState();
  const bossActive = relays.bossActive && bossSpawned && !bossDefeated;
  const danger = totalSeconds - runSeconds <= 15;
  if (!danger && !bossActive) return null;
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20"
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: danger
          ? 'radial-gradient(ellipse at center, transparent 55%, rgba(5,7,13,.85) 100%)'
          : 'radial-gradient(ellipse at center, transparent 62%, rgba(255,77,94,.22) 100%)',
      }}
    />
  );
}

// ── 稳定度警示 toast ──────────────────────────────────

function StabilityToast() {
  const stability = useRunStore((s) => s.stability);
  const [shown, setShown] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (stability < 40 && !shown) {
      setShown(true);
      setVisible(true);
      const id = window.setTimeout(() => setVisible(false), 3000);
      return () => window.clearTimeout(id);
    }
  }, [stability, shown]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber/40 bg-void/80 px-4 py-1.5 text-[13px] text-amber backdrop-blur-sm"
        >
          世界开始不稳定
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── 色盲辅助图例 ──────────────────────────────────────

function ColorAssistLegend() {
  const colorAssist = useRunStore((s) => s.settings.colorAssist);
  if (!colorAssist) return null;
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-full bg-void/50 px-3 py-1 text-[11px] text-star-faint backdrop-blur-sm">
      <span className="flex items-center gap-1"><Diamond className="h-3 w-3 text-cyan" />碎片</span>
      <span className="flex items-center gap-1"><Triangle className="h-3 w-3 text-amber" />节点</span>
      <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-cyan" />出口</span>
    </div>
  );
}

// ── HUD 根 ───────────────────────────────────────────

interface HUDProps {
  dna: WorldDNA;
  level: LevelData;
  onPause: () => void;
}

export default function HUD({ dna, level, onPause }: HUDProps) {
  const settings = useRunStore((s) => s.settings);
  const setSettings = useRunStore((s) => s.setSettings);
  const stability = useRunStore((s) => s.stability);

  const toggleMute = () => {
    const next = { ...settings, muted: !settings.muted };
    setSettings(next);
    writePlaySettings(next);
    sound.setMuted(next.muted);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* 常驻氛围暗角 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 56%, rgba(2,4,10,.4) 100%)' }}
      />
      {/* 左上：世界名 + 任务卡 */}
      <div className="absolute left-4 top-4 max-w-[300px] space-y-2 sm:left-6 sm:top-6">
        <WorldTag dna={dna} />
        <MissionCard />
      </div>

      {/* 顶部中：阶段点 */}
      <div className="absolute left-1/2 top-5 -translate-x-1/2 sm:top-7">
        <PhaseDots />
      </div>

      {/* 右上：倒计时 + 图标按钮 */}
      <div className="absolute right-4 top-4 flex items-start gap-3 sm:right-6 sm:top-6">
        <Countdown />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-label="暂停"
            onClick={onPause}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-star-dim transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            <Pause className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={settings.muted ? '取消静音' : '静音'}
            onClick={toggleMute}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-star-dim transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 左下：稳定度 */}
      <div className="absolute bottom-5 left-4 sm:bottom-7 sm:left-6">
        <motion.div
          className="panel pointer-events-auto px-3 py-2"
          animate={stability < 40 ? { x: [0, -1.5, 1.5, 0] } : { x: 0 }}
          transition={stability < 40 ? { duration: 0.8, repeat: Infinity } : { duration: 0.2 }}
        >
          <StabilityRing value={stability} size={44} />
        </motion.div>
      </div>

      {/* 右下：主按钮（跳跃按钮左上方） */}
      <div className="absolute bottom-24 right-4 sm:bottom-8 sm:right-28">
        <MainButton dna={dna} level={level} />
      </div>

      <TutorialCards />
      <StepTracker />
      <MutationOverlay dna={dna} />
      <SubtitleBar />
      <FlashLayer />
      <DangerVignette />
      <StabilityToast />
      <ColorAssistLegend />
    </div>
  );
}

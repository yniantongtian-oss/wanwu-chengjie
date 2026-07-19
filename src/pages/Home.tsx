import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import { Camera, Braces, Rocket, ChevronDown } from 'lucide-react';
import WorldCard from '@/components/WorldCard';
import type { WorldCardData } from '@/components/WorldCard';
import RarityBadge from '@/components/RarityBadge';
import StabilityRing from '@/components/StabilityRing';
import CharReveal from '@/components/home/CharReveal';
import GenSequenceDemo from '@/components/home/GenSequenceDemo';
import { BIOME_LABELS, listWorlds, getBestRuns } from '@/engine';
import type { StoredWorld } from '@/engine';
import { cn } from '@/lib/utils';

const HeroCanvas = lazy(() => import('@/components/home/HeroCanvas'));

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function toCardData(w: StoredWorld): WorldCardData {
  const best = getBestRuns(w.worldId, 1)[0];
  return {
    worldId: w.worldId,
    name: w.dna.worldName,
    code: w.dna.worldCode,
    biomeLabel: BIOME_LABELS[w.dna.biome],
    rarity: w.dna.rarity,
    stability: w.stability,
    thumbnail: w.thumbnail,
    bestScore: best?.score ?? null,
  };
}

/* ── S1 · Hero ─────────────────────────────────────── */

function Hero({ reducedMotion }: { reducedMotion: boolean }) {
  const { scrollY } = useScroll();
  const sceneOpacity = useTransform(scrollY, [0, typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600], [1, 0]);
  const sceneScale = useTransform(scrollY, [0, typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600], [1, 0.6]);

  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden">
      {/* 3D 场景（reduced-motion 时静态回退） */}
      <motion.div className="absolute inset-0" style={reducedMotion ? undefined : { opacity: sceneOpacity, scale: sceneScale }}>
        {reducedMotion ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/portal-frame.png" alt="" className="h-[420px] w-[420px] rounded-full opacity-60" />
          </div>
        ) : (
          <Suspense fallback={<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(87,230,240,.05),transparent_60%)]" />}>
            <HeroCanvas />
          </Suspense>
        )}
      </motion.div>

      {/* 内容层 */}
      <div className="pointer-events-none relative z-10 flex flex-col items-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-mono text-[13px] tracking-[0.3em] text-star-dim"
        >
          KIMI K3 · AI WORLD ENGINE
        </motion.p>

        <h1 className="mt-6 font-serif text-[34px] font-black leading-[1.3] tracking-[-0.01em] text-star md:text-[56px]">
          <CharReveal text="我没有让 K3 生成一张图片；" delay={0.6} />
          <br />
          <CharReveal text="我让它把这张图片，变成了一个世界。" delay={1.5} className="text-cyan" />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.8, ease: EASE_OUT }}
          className="mt-6 max-w-xl text-[16px] leading-[1.75] text-star-dim"
        >
          拍下任何东西，然后进入它的世界。60–90 秒一局，无需注册。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 3.0, ease: EASE_OUT }}
          className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/create" className="btn-primary h-14 px-9 text-[16px] shadow-cyan-glow">
            创造我的世界
          </Link>
          <Link to="/square" className="btn-ghost h-14 px-9 text-[16px]">
            逛逛世界广场
          </Link>
        </motion.div>
      </div>

      {/* 底部下滑提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.6, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="font-mono text-[11px] tracking-[0.3em] text-star-faint">SCROLL</span>
        <div className="h-8 w-px animate-breathe bg-gradient-to-b from-cyan to-transparent" />
        <ChevronDown className="h-3.5 w-3.5 text-star-faint" />
      </motion.div>
    </section>
  );
}

/* ── S2 · 三步法则 ─────────────────────────────────── */

const STEPS = [
  {
    icon: Camera,
    num: '01',
    title: '给它看点什么',
    body: '照片、一句话，或三个表情。K3 会读懂它。',
    tag: 'INPUT',
  },
  {
    icon: Braces,
    num: '02',
    title: 'K3 写下世界 DNA',
    body: '重力、天空、法则、突变与 Boss，全部被编排成一份 JSON。',
    tag: 'WORLD DNA JSON',
  },
  {
    icon: Rocket,
    num: '03',
    title: '进入它',
    body: '引擎实时组装世界。60–90 秒，收集碎片，活着出来。',
    tag: 'REALTIME ENGINE',
  },
];

function ThreeSteps() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1200px] px-6 py-24 md:py-36">
      <motion.h2
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="text-center font-serif text-[28px] font-bold text-star md:text-[40px]"
      >
        三个动作，一个世界
      </motion.h2>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.6, delay: i * 0.12, ease: EASE_OUT }}
            className="panel group flex h-[320px] flex-col p-7 transition-colors duration-300 hover:border-cyan/40"
          >
            <step.icon className="h-8 w-8 text-cyan/70 transition-all duration-300 group-hover:text-cyan group-hover:drop-shadow-[0_0_8px_rgba(87,230,240,.7)]" strokeWidth={1.5} />
            <p className="mt-6 font-mono text-[13px] text-star-faint">{step.num} /</p>
            <h3 className="mt-2 text-[20px] font-bold text-star">{step.title}</h3>
            <p className="mt-3 flex-1 text-[15px] leading-[1.75] text-star-dim">{step.body}</p>
            <p className="font-mono text-[11px] tracking-widest text-star-faint">{step.tag}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── S4 · 示例世界 ─────────────────────────────────── */

function SampleWorlds({ worlds }: { worlds: WorldCardData[] }) {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="text-center"
      >
        <h2 className="font-serif text-[28px] font-bold text-star md:text-[40px]">先看看别人的世界</h2>
        <p className="mt-3 font-mono text-[13px] tracking-widest text-star-faint">// 无需上传，直接进入</p>
      </motion.div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {worlds.map((world, i) => (
          <motion.div
            key={world.worldId}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: EASE_OUT }}
          >
            <WorldCard world={world} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── S5 · 核心玩法五段式 ────────────────────────────── */

const PHASE_NODES = [
  { time: '00–10s', title: '观察', body: '世界在你眼前展开。碎片的位置，就是它的呼吸。', color: 'var(--cyan)' },
  { time: '10–30s', title: '行动', body: '收集 8–15 个世界碎片，激活出口。', color: 'var(--cyan)' },
  { time: '30–45s', title: '世界突变', body: '重力反转、太阳熄灭……规则被当场重写。', color: 'var(--amber)' },
  { time: '45–75s', title: 'Boss 压迫', body: '它在追你。点亮 3 个能量节点，结束这一切。', color: 'var(--red)' },
  { time: '75–90s', title: '冲刺结算', body: '出口已开启。带着你的成绩，穿过那扇门。', color: 'var(--cyan)' },
];

function GameplayTimeline() {
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 80%', 'end 60%'] });

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-36">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr]">
        <div className="lg:sticky lg:top-[120px] lg:self-start">
          <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-star-faint">// 核心玩法</p>
          <h2 className="mt-4 font-serif text-[28px] font-bold leading-snug text-star md:text-[40px]">
            一局 90 秒，
            <br />
            五次心跳
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-[1.75] text-star-dim">
            每一局都是一段完整的叙事：展开、行动、突变、追逐、逃离。没有两秒钟是重复的。
          </p>
        </div>

        <div ref={listRef} className="relative pl-8">
          {/* 时间轴竖线 */}
          <div className="absolute bottom-2 left-[5px] top-2 w-px bg-white/8">
            <motion.div className="h-full w-full origin-top bg-gradient-to-b from-cyan via-amber to-red" style={{ scaleY: scrollYProgress }} />
          </div>
          <div className="space-y-12">
            {PHASE_NODES.map((node, i) => (
              <motion.div
                key={node.time}
                initial={{ opacity: 0, x: 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30%' }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: EASE_OUT }}
                className="relative"
              >
                <span
                  className="absolute -left-8 top-1.5 h-[11px] w-[11px] rounded-full border-2 bg-void"
                  style={{ borderColor: node.color, boxShadow: `0 0 10px ${node.color}` }}
                />
                <p className="font-mono text-[13px] tracking-wider" style={{ color: node.color }}>
                  {node.time}
                </p>
                <h3 className="mt-1.5 text-[20px] font-bold text-star">{node.title}</h3>
                <p className="mt-2 max-w-md text-[15px] leading-[1.75] text-star-dim">{node.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── S6 · 世界卡与分享 ──────────────────────────────── */

const ARCHIVE_POINTS = [
  { title: '世界编号', body: '每个世界拥有唯一编号 K3-WORLD-XXXXX，种子可复现，随时重返。' },
  { title: '挑战链接', body: '把链接发给朋友：他能进入同一个世界，挑战你的成绩。' },
  { title: '默认私密', body: '无需注册即可试玩。公开前，世界只属于你。' },
];

function TypewriterCode({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20%' });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const timer = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [inView, text]);
  return (
    <span ref={ref} className="font-mono text-[13px] tracking-widest text-star-dim">
      {text.slice(0, shown)}
      {shown < text.length && <span className="animate-caret-blink text-cyan">▍</span>}
    </span>
  );
}

function ArchiveSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-36">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-[28px] font-bold text-star md:text-[40px]">每个世界，都有档案</h2>
          <ul className="mt-10 space-y-7">
            {ARCHIVE_POINTS.map((point, i) => (
              <motion.li
                key={point.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20%' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: EASE_OUT }}
                className="flex gap-4"
              >
                <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_rgba(87,230,240,.8)]" />
                <div>
                  <h3 className="text-[17px] font-bold text-star">{point.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.75] text-star-dim">{point.body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* 结算世界卡演示 */}
        <motion.div
          initial={{ opacity: 0, x: 48, rotate: 2 }}
          whileInView={{ opacity: 1, x: 0, rotate: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="mx-auto w-full max-w-[440px]"
        >
          <div className="rarity-legendary legendary-sweep animate-float-slow relative overflow-hidden rounded-2xl">
            <div className="relative aspect-[4/3]">
              <img src="/og-cover.png" alt="世界卡封面" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-void-2 via-void-2/40 to-transparent" />
              <div className="absolute inset-x-6 bottom-5">
                <TypewriterCode text="K3-WORLD-00003" />
                <h3 className="mt-1 font-serif text-[30px] font-black text-star">呼噜星港</h3>
              </div>
            </div>
            <div className="flex items-center justify-between bg-void-2 px-6 py-5">
              <div className="flex items-center gap-3">
                <RarityBadge rarity="legendary" />
                <span className="text-[12px] text-star-dim">童话星港</span>
              </div>
              <StabilityRing value={63} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── S7 · 广场预览 + 终局 CTA ──────────────────────── */

function SquarePreview({ worlds }: { worlds: WorldCardData[] }) {
  const doubled = useMemo(() => [...worlds, ...worlds], [worlds]);
  return (
    <section className="py-24 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="mx-auto max-w-[1200px] px-6 text-center"
      >
        <h2 className="font-serif text-[28px] font-bold text-star md:text-[40px]">世界广场上，今晚很热闹</h2>
        <p className="mt-3 font-mono text-[13px] tracking-widest text-star-faint">// 每一张卡，都是某人生活的一角</p>
      </motion.div>

      {/* 横向滚动卡片带（30s 无缝循环，hover 暂停） */}
      <div className="mt-14 overflow-hidden">
        <div className="flex w-max animate-marquee gap-6 px-6 hover:[animation-play-state:paused] motion-reduce:animate-none">
          {doubled.map((world, i) => (
            <div key={`${world.worldId}-${i}`} className="w-[240px] shrink-0">
              <WorldCard world={world} />
            </div>
          ))}
        </div>
      </div>

      {/* 终局 CTA */}
      <div className="relative mx-auto mt-28 max-w-[1200px] px-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(87,230,240,.07),transparent_65%)]" aria-hidden />
        <motion.h2
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="relative font-serif text-[28px] font-black text-star md:text-[40px]"
        >
          你的下一张照片，是一个世界。
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }}
          className="relative mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/create" className="btn-primary h-14 animate-breathe px-9 text-[16px] shadow-cyan-glow">
            创造我的世界
          </Link>
          <Link to="/square" className="btn-ghost h-14 px-9 text-[16px]">
            去广场看看
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ── 页面组装 ─────────────────────────────────────── */

export default function Home() {
  const reducedMotion = usePrefersReducedMotion();

  // Lenis 平滑滚动（仅营销区首页；reduced-motion 时禁用）
  useEffect(() => {
    if (reducedMotion) return;
    const lenis = new Lenis({ lerp: 0.11 });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [reducedMotion]);

  const { samples, square } = useMemo(() => {
    const all = listWorlds();
    const sampleWorlds = all.filter((w) => w.source === 'sample').map(toCardData);
    const squareWorlds = all
      .filter((w) => w.isPublic)
      .slice(0, 8)
      .map(toCardData);
    return { samples: sampleWorlds, square: squareWorlds };
  }, []);

  return (
    <div className={cn('relative')}>
      <Hero reducedMotion={reducedMotion} />
      <ThreeSteps />
      <GenSequenceDemo />
      <SampleWorlds worlds={samples} />
      <GameplayTimeline />
      <ArchiveSection />
      <SquarePreview worlds={square} />
    </div>
  );
}

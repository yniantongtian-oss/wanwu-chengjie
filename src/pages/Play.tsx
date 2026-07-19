/**
 * Play.tsx — 全屏 3D 游戏页 /play/:worldId
 * 进入契约：getWorld(worldId) → ?w= decodeWorldFromUrl → 「世界不存在」+ 去创造。
 * 离开契约：RunResult → saveRun + sessionStorage('k3:lastRun') → navigate('/result/' + worldId)。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles } from 'lucide-react';
import type { RunResult, WorldDNA } from '@/engine';
import { getWorld, decodeWorldFromUrl, saveRun } from '@/engine';
import GameScene from '@/game/GameScene';
import type { Quality } from '@/game/GameScene';
import HUD from '@/game/hud/HUD';
import TouchControls from '@/game/hud/Joystick';
import PauseMenu from '@/game/hud/PauseMenu';
import { generateLevel } from '@/game/level';
import { useKeyboardInput } from '@/game/Player';
import { relays, resetRelays } from '@/game/bus';
import { useRunStore } from '@/game/runStore';
import { sound } from '@/game/audio';
import { isTutorialDone } from '@/game/settings';
import { addLastWord, PRESET_LAST_WORDS, LAST_WORD_MAX_LEN } from '@/game/lastWords';
import { DEFEAT_REASONS, MUTATION_LABELS } from '@/game/palettes';
import { cn } from '@/lib/utils';

// ── 世界不存在 ────────────────────────────────────────

function MissingWorld() {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-void p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel flex max-w-[420px] flex-col items-center px-8 py-10 text-center"
      >
        <Compass className="h-8 w-8 text-star-faint" />
        <h1 className="mt-4 font-serif text-[28px] font-bold text-star">世界不存在</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-star-dim">
          它可能已被作者收回，或从未被讲述。
          <br />
          但你随时可以创造一个新的。
        </p>
        <Link to="/create" className="btn-primary mt-6 h-12 px-8 text-[15px]">
          <Sparkles className="h-4 w-4" /> 去创造
        </Link>
        <Link to="/" className="mt-3 font-mono text-[12px] text-star-faint transition-colors hover:text-cyan">
          回到首页 →
        </Link>
      </motion.div>
    </div>
  );
}

// ── 准星（画布内青色十字，12px） ──────────────────────

function Crosshair() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    const move = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.transform = `translate(${e.clientX - 6}px, ${e.clientY - 6}px)`;
        ref.current.style.opacity = '1';
      }
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return (
    <div ref={ref} className="pointer-events-none fixed left-0 top-0 z-[45] opacity-0" aria-hidden>
      <svg width={12} height={12} viewBox="0 0 12 12">
        <line x1={6} y1={0} x2={6} y2={4} stroke="#57E6F0" strokeWidth={1} />
        <line x1={6} y1={8} x2={6} y2={12} stroke="#57E6F0" strokeWidth={1} />
        <line x1={0} y1={6} x2={4} y2={6} stroke="#57E6F0" strokeWidth={1} />
        <line x1={8} y1={6} x2={12} y2={6} stroke="#57E6F0" strokeWidth={1} />
        <circle cx={6} cy={6} r={1} fill="#57E6F0" />
      </svg>
    </div>
  );
}

// ── 失败遗言面板 ──────────────────────────────────────

function DefeatPanel({ dna, reason, onDone }: { dna: WorldDNA; reason: string; onDone: (word?: string) => void }) {
  const [word, setWord] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const submit = () => {
    const w = (picked ?? word).trim().slice(0, LAST_WORD_MAX_LEN);
    onDone(w || undefined);
  };
  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="panel w-full max-w-[420px] p-7 text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}
      >
        <p className="font-mono text-[10px] tracking-[0.3em] text-star-faint">THE WORLD FADES</p>
        <h2 className="mt-2 font-serif text-[26px] font-bold text-star">{reason}</h2>
        <p className="mt-1 font-mono text-[12px] text-star-faint">
          {dna.worldName} · {dna.worldCode}
        </p>

        <p className="mt-5 text-[13px] text-star-dim">给这个世界留一句遗言（≤10 字，可选）：</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {PRESET_LAST_WORDS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setPicked(picked === w ? null : w)}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] transition-colors',
                picked === w ? 'border-cyan text-cyan' : 'border-white/10 text-star-dim hover:border-cyan/40',
              )}
            >
              {w}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={word}
          maxLength={LAST_WORD_MAX_LEN}
          placeholder="或者，写下你自己的…"
          onChange={(e) => {
            setWord(e.target.value);
            setPicked(null);
          }}
          className="mt-3 w-full rounded-lg border border-white/10 bg-void-3/60 px-3 py-2 text-center text-[14px] text-star outline-none placeholder:text-star-faint focus:border-cyan/50"
        />
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" className="btn-primary h-11 px-6 text-[14px]" onClick={submit}>
            留下遗言
          </button>
          <button type="button" className="btn-ghost h-11 px-6 text-[14px]" onClick={() => onDone(undefined)}>
            直接离开
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── 结算与跳转 ────────────────────────────────────────

function buildRun(dna: WorldDNA, worldId: string, victory: boolean): RunResult {
  const s = useRunStore.getState();
  const timeBonus = victory ? Math.max(0, Math.round((s.totalSeconds - s.runSeconds) * 10)) : 0;
  const score =
    s.collected * 120 + (victory ? 1500 : 0) + Math.round(s.stability) * 8 + s.maxCombo * 30 + timeBonus;
  const events = [...s.events];
  if (victory && dna.mutation === 'sun_blackout') {
    events.push({ atSeconds: s.runSeconds, kind: 'system', text: '在太阳熄灭后完成逆转' });
  } else if (victory && dna.mutation === 'gravity_flip') {
    events.push({ atSeconds: s.runSeconds, kind: 'system', text: '在颠倒的重力里找到出口' });
  } else if (victory) {
    events.push({ atSeconds: s.runSeconds, kind: 'system', text: `穿过「${MUTATION_LABELS[dna.mutation]}」后的出口` });
  }
  if (s.maxCombo >= 4) {
    events.push({ atSeconds: s.runSeconds, kind: 'collect', text: `最高连击 ×${s.maxCombo}` });
  }
  if (!victory) {
    events.push({ atSeconds: s.runSeconds, kind: 'system', text: '迷失于世界之中' });
  }
  return {
    runId: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    worldId,
    worldCode: dna.worldCode,
    score,
    timeMs: Math.round(s.runSeconds * 1000),
    collected: s.collected,
    total: s.total,
    victory,
    events,
    stability: Math.round(s.stability),
    finishedAt: Date.now(),
  };
}

// ── 会话 ─────────────────────────────────────────────

interface SessionProps {
  dna: WorldDNA;
  worldId: string;
  initialStability: number;
}

function PlaySession({ dna, worldId, initialStability }: SessionProps) {
  const navigate = useNavigate();
  const level = useMemo(() => generateLevel(dna), [dna]);
  // 画质分级：?q=low|high 可强制覆盖；软件渲染器一律 low；其余按核心数
  const quality: Quality = useMemo(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('q');
      if (q === 'low' || q === 'high') return q;
    }
    try {
      const c = document.createElement('canvas');
      const gl2 = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
      const info = gl2?.getExtension('WEBGL_debug_renderer_info');
      const renderer = String(info ? gl2?.getParameter(info.UNMASKED_RENDERER_WEBGL) : '').toLowerCase();
      if (/swiftshader|llvmpipe|software|basic render/.test(renderer)) return 'low';
      // Intel 核显（非 Arc 独显）：泛光链带宽不足，默认 low，可用 ?q=high 强制
      if (renderer.includes('intel') && !renderer.includes('arc')) return 'low';
    } catch {
      // 探测失败则按核心数
    }
    return typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4 ? 'low' : 'high';
  }, []);
  const totalSeconds = Math.min(90, Math.max(60, dna.mutationAtSeconds + 40));

  const status = useRunStore((s) => s.status);
  const victory = useRunStore((s) => s.victory);
  const resetNonce = useRunStore((s) => s.resetNonce);
  const setStatus = useRunStore((s) => s.setStatus);
  const restart = useRunStore((s) => s.restart);
  const boot = useRunStore((s) => s.boot);

  const wrapRef = useRef<HTMLDivElement>(null);
  const finalizedRef = useRef(false);
  const defeatReason = useMemo(
    () => DEFEAT_REASONS[dna.seed % DEFEAT_REASONS.length],
    [dna.seed],
  );

  useKeyboardInput();

  // 初始化 / 重新开始
  useEffect(() => {
    resetRelays();
    finalizedRef.current = false;
    boot({
      totalSeconds,
      total: level.shards.length,
      stability: Math.min(100, Math.max(20, initialStability)),
      hasBoss: Boolean(dna.boss),
      tutorialDone: isTutorialDone(),
    });
  }, [boot, resetNonce, totalSeconds, level, initialStability, dna.boss]);

  // 首次用户手势：启动音频与环境音；离开页面时停止
  useEffect(() => {
    const kick = () => {
      sound.ensure();
      if (useRunStore.getState().status === 'playing') sound.startAmbient(false);
    };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      sound.stopAmbient();
    };
  }, [resetNonce]);

  // 离屏自动暂停
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && useRunStore.getState().status === 'playing') {
        useRunStore.getState().setStatus('paused');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Esc 暂停/继续
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      const s = useRunStore.getState();
      if (s.status === 'playing') s.setStatus('paused');
      else if (s.status === 'paused') s.setStatus('playing');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 屏幕震动（≤2px，低晕动/减动效时禁用）
  useEffect(() => {
    let id = 0;
    const loop = () => {
      id = requestAnimationFrame(loop);
      const el = wrapRef.current;
      if (!el) return;
      const s = useRunStore.getState();
      if (relays.shakePx > 0.05 && !s.settings.lowMotionSickness && !s.settings.reduceMotion) {
        const p = Math.min(2, relays.shakePx);
        el.style.transform = `translate(${(Math.random() * 2 - 1) * p}px, ${(Math.random() * 2 - 1) * p}px)`;
        relays.shakePx *= 0.85;
      } else {
        if (el.style.transform) el.style.transform = '';
        relays.shakePx = Math.max(0, relays.shakePx * 0.85);
      }
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  // 结算
  const finalize = useCallback(
    (v: boolean, lastWord?: string) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const run = buildRun(dna, worldId, v);
      if (lastWord) addLastWord(worldId, lastWord);
      saveRun(worldId, run);
      try {
        window.sessionStorage.setItem('k3:lastRun', JSON.stringify(run));
      } catch {
        // 隐私模式等：忽略
      }
      navigate('/result/' + encodeURIComponent(worldId));
    },
    [dna, worldId, navigate],
  );

  // ended：胜利直接结算；失败先留遗言（面板由派生状态渲染）
  useEffect(() => {
    if (status === 'ended' && victory) {
      finalize(true);
    }
  }, [status, victory, finalize]);

  const doRestart = useCallback(() => {
    sound.stopAmbient();
    restart();
  }, [restart]);

  const paused = status === 'paused';

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-void" style={{ cursor: 'none' }}>
      <div ref={wrapRef} className="absolute inset-0" style={{ cursor: 'none' }}>
        <GameScene key={resetNonce} dna={dna} level={level} quality={quality} />
        <TouchControls key={`tc-${resetNonce}`} />
        <HUD dna={dna} level={level} onPause={() => setStatus('paused')} />
      </div>

      <Crosshair />

      {/* 穿门白场 */}
      <AnimatePresence>
        {status === 'portal' && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 1] }}
            transition={{ duration: 1.05, times: [0, 0.55, 1] }}
            style={{ background: 'radial-gradient(circle at center, rgba(87,230,240,.5), #E8F0FF 75%)' }}
          />
        )}
        {/* 世界坍缩 */}
        {status === 'collapsing' && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.6, 0, 0.2, 1] }}
            style={{ background: 'radial-gradient(circle at center, transparent 0%, #02040A 62%)' }}
          />
        )}
      </AnimatePresence>

      <PauseMenu dna={dna} open={paused} onResume={() => setStatus('playing')} onRestart={doRestart} />

      {status === 'ended' && victory === false && (
        <DefeatPanel
          dna={dna}
          reason={defeatReason}
          onDone={(word) => finalize(false, word)}
        />
      )}
    </div>
  );
}

// ── 页面入口 ─────────────────────────────────────────

export default function Play() {
  const { worldId } = useParams<{ worldId: string }>();
  const [searchParams] = useSearchParams();

  const resolved = useMemo(() => {
    if (!worldId) return null;
    const stored = getWorld(worldId);
    if (stored) {
      return { dna: stored.dna, worldId: stored.worldId, stability: stored.stability };
    }
    const w = searchParams.get('w');
    if (w) {
      const dna = decodeWorldFromUrl(w);
      if (dna) return { dna, worldId: dna.worldCode, stability: 80 };
    }
    return null;
  }, [worldId, searchParams]);

  if (!resolved) return <MissingWorld />;
  return (
    <PlaySession
      key={resolved.worldId}
      dna={resolved.dna}
      worldId={resolved.worldId}
      initialStability={resolved.stability}
    />
  );
}

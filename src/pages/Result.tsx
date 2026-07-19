import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Download,
  Globe,
  LayoutGrid,
  Lock,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  ScrollText,
  Trash2,
} from 'lucide-react';
import {
  buildChallengePath,
  decodeWorldFromUrl,
  deleteWorld,
  getBestRuns,
  getWorld,
  saveWorld,
} from '@/engine';
import type { RunResult, StoredWorld, WorldDNA } from '@/engine';
import StabilityRing from '@/components/StabilityRing';
import RevealCard from '@/components/result/RevealCard';
import { phaseAtLeast } from '@/components/result/revealPhase';
import type { RevealPhase } from '@/components/result/revealPhase';
import ShareCardModal from '@/components/result/ShareCardModal';
import { useCountUp } from '@/components/result/useCountUp';
import Toast from '@/components/create/Toast';
import { useToast } from '@/components/create/useToast';
import TypeText from '@/components/create/TypeText';
import { formatTimeMs, MUTATION_LABELS } from '@/components/create/dnaLabels';
import { usePrefersReducedMotion } from '@/components/create/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

// ── 数据装配 ─────────────────────────────────────────

interface PageData {
  dna: WorldDNA;
  worldId: string;
  thumbnail?: string;
  isPublic: boolean;
  lastWords?: string;
  run: RunResult | null;
  stability: number;
  victory: boolean;
}

function isRunResult(v: unknown): v is RunResult {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.runId === 'string' &&
    typeof r.worldId === 'string' &&
    typeof r.score === 'number' &&
    typeof r.timeMs === 'number' &&
    typeof r.collected === 'number' &&
    typeof r.total === 'number' &&
    typeof r.victory === 'boolean' &&
    typeof r.stability === 'number' &&
    Array.isArray(r.events)
  );
}

/** 契约：先读 sessionStorage「k3:lastRun」，回退最佳成绩；世界数据 getWorld → ?w= 解码 */
function loadPageData(worldId: string, wParam: string | null): PageData | null {
  const stored: StoredWorld | null = getWorld(worldId);
  let dna: WorldDNA | null = stored?.dna ?? null;
  if (!dna && wParam) dna = decodeWorldFromUrl(wParam);
  if (!dna) return null;

  let run: RunResult | null = null;
  try {
    const raw = window.sessionStorage.getItem('k3:lastRun');
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isRunResult(parsed) && (parsed.worldId === worldId || parsed.worldCode === worldId)) {
        run = parsed;
      }
    }
  } catch {
    // sessionStorage 不可用 / 数据损坏：走最佳成绩回退
  }
  if (!run) {
    const best = getBestRuns(worldId, 1)[0];
    if (best) run = { ...best, worldId, worldCode: dna.worldCode, events: [] };
  }

  return {
    dna,
    worldId: dna.worldCode,
    thumbnail: stored?.thumbnail,
    isPublic: stored?.isPublic ?? false,
    lastWords: stored?.lastWords,
    run,
    stability: run ? run.stability : stored?.stability ?? 100,
    victory: run ? run.victory : true,
  };
}

function pickUniqueEvent(run: RunResult | null, dna: WorldDNA): string {
  if (run?.events?.length) {
    const priority = ['mutation', 'boss', 'portal', 'hazard', 'collect', 'system'] as const;
    for (const kind of priority) {
      const hit = run.events.find((e) => e.kind === kind);
      if (hit) return hit.text;
    }
    return run.events[0].text;
  }
  return `在第 ${dna.mutationAtSeconds} 秒，${MUTATION_LABELS[dna.mutation]}发生了`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// ── 页面 ─────────────────────────────────────────────

/** 结算页 /result/:worldId — 世界卡诞生 */
export default function Result() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const toast = useToast();

  const worldId = useMemo(() => {
    const raw = params.worldId ?? params.runId ?? '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params]);

  // 数据装配：惰性初始化（localStorage/sessionStorage 一次性读取）
  const wParam = searchParams.get('w');
  const dataKey = `${worldId}|${wParam ?? ''}`;
  const [pageData, setPageData] = useState<PageData | null>(() => loadPageData(worldId, wParam));
  const [loadedKey, setLoadedKey] = useState(dataKey);
  const [phase, setPhase] = useState<RevealPhase>('typing');
  const [isPublic, setIsPublic] = useState<boolean>(() => pageData?.isPublic ?? false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dissolving, setDissolving] = useState(false);

  // 路由参数变化时（渲染期派生，React 官方推荐模式）
  if (loadedKey !== dataKey) {
    setLoadedKey(dataKey);
    const data = loadPageData(worldId, wParam);
    setPageData(data);
    setIsPublic(data?.isPublic ?? false);
    setPhase('typing');
  }

  // 进入页面回到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [dataKey]);

  // 揭示时间线（reduced-motion 时展示态直接视为 done）
  useEffect(() => {
    if (!pageData || reducedMotion) return;
    const schedule: Array<[number, RevealPhase]> = [
      [600, 'sweep'],
      [1200, 'flip'],
      [2200, 'data'],
      [3200, 'quote'],
      [4050, 'done'],
    ];
    const timers = schedule.map(([ms, p]) => window.setTimeout(() => setPhase(p), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [pageData, reducedMotion]);

  /** reduced-motion：跳过揭示序列，直接进入可操作态 */
  const shownPhase: RevealPhase = reducedMotion ? 'done' : phase;

  // 确认态 4s 自动回退
  useEffect(() => {
    if (!confirmPublish) return;
    const t = window.setTimeout(() => setConfirmPublish(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmPublish]);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = window.setTimeout(() => setConfirmDelete(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmDelete]);

  const dna = pageData?.dna ?? null;
  const run = pageData?.run ?? null;

  const challengeUrl = useMemo(() => {
    if (!dna) return '';
    return `${window.location.origin}${buildChallengePath(dna)}`;
  }, [dna]);

  // ── 动作 ───────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!challengeUrl) return;
    const ok = await copyText(challengeUrl);
    toast.show(ok ? '链接已复制，去挑战你的朋友' : '复制失败，请长按链接手动复制');
  }, [challengeUrl, toast]);

  const handlePublish = useCallback(() => {
    if (!dna) return;
    if (isPublic) {
      saveWorld(dna, { isPublic: false });
      setIsPublic(false);
      toast.show('已设为私密，只有你能看到它');
      return;
    }
    if (!confirmPublish) {
      setConfirmPublish(true);
      return;
    }
    setConfirmPublish(false);
    saveWorld(dna, { isPublic: true });
    setIsPublic(true);
    toast.show('已发布到广场 · 公开不展示原始照片');
  }, [dna, isPublic, confirmPublish, toast]);

  const handleDelete = useCallback(() => {
    if (!pageData || dissolving) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    setDissolving(true);
    // 消散动画 800ms 后真正删除并回广场
    window.setTimeout(() => {
      deleteWorld(pageData.worldId);
      navigate('/square');
    }, 800);
  }, [pageData, confirmDelete, dissolving, navigate]);

  const handleShareClose = useCallback(() => setShareOpen(false), []);

  // ── 数据滚动（hooks 必须先于任何提前 return） ──────
  const dataActive = phaseAtLeast(shownPhase, 'data');
  const stabilityValue = useCountUp(pageData?.stability ?? 0, 800, dataActive, reducedMotion);
  const timeValue = useCountUp(run?.timeMs ?? 0, 800, dataActive, reducedMotion);
  const collectedValue = useCountUp(run?.collected ?? 0, 800, dataActive, reducedMotion);
  const scoreValue = useCountUp(run?.score ?? 0, 800, dataActive, reducedMotion);

  // ── 渲染 ───────────────────────────────────────────

  if (!pageData || !dna) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-star-faint">{'// ARCHIVE MISSING'}</p>
        <h1 className="font-serif text-[28px] font-bold text-star">档案局里没有这个世界</h1>
        <p className="max-w-md text-[14px] leading-relaxed text-star-dim">
          它可能已被删除，或从未在此设备上生成。世界不会真正消失——种子还记得它。
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/square" className="btn-ghost h-11 px-6 text-[14px]">
            去世界广场
          </Link>
          <Link to="/create" className="btn-primary h-11 px-6 text-[14px]">
            再创造一个
          </Link>
        </div>
      </div>
    );
  }

  const seconds = run ? Math.round(run.timeMs / 1000) : 0;
  const uniqueEvent = pickUniqueEvent(run, dna);
  const quoteLine = pageData.victory
    ? `「${dna.shareText}」`
    : `「他迷失在第 ${seconds} 秒的黑暗里。」`;
  const quoteMono = pageData.victory
    ? `${dna.worldCode} · SEED ${dna.seed}`
    : `世界稳定度归零 · 遗言：${pageData.lastWords ?? '光灭了，档案还在。'}`;

  return (
    <div className="relative">
      {/* 背景：暗化星尘 + 远处微光 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(87,230,240,.07),transparent_55%),radial-gradient(ellipse_at_85%_110%,rgba(139,124,246,.05),transparent_50%)]"
      />

      {/* ── S1 揭示序列 ── */}
      <section className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[880px] flex-col items-center justify-center px-5 py-16">
        {/* 上方 mono 小字 */}
        <div className="mb-8 h-5 font-mono text-[12px] tracking-[0.3em] text-star-dim">
          {shownPhase === 'typing' ? (
            <TypeText text="正在为你的世界建档…" speed={55} instant={reducedMotion} showCursor />
          ) : (
            <span className="text-star-faint">ARCHIVE // 建档完成</span>
          )}
        </div>

        <RevealCard
          dna={dna}
          thumbnail={pageData.thumbnail}
          victory={pageData.victory}
          phase={shownPhase}
          reducedMotion={reducedMotion}
          dissolving={dissolving}
        />

        {/* 数据行（计数滚动） */}
        <div className="mt-8 flex min-h-[96px] flex-col items-center gap-3">
          {dataActive && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="flex items-center gap-4"
              >
                {pageData.victory ? (
                  <StabilityRing value={stabilityValue} size={44} />
                ) : (
                  <span className="font-mono text-[13px] tracking-widest text-red">稳定度 · 不稳定</span>
                )}
                {run && (
                  <span className="font-mono text-[15px] tracking-wider text-star">
                    {formatTimeMs(timeValue)} · 碎片 {Math.round(collectedValue)}/{run.total}
                    <span className="ml-3 text-star-dim">SCORE {Math.round(scoreValue).toLocaleString()}</span>
                  </span>
                )}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4, ease: EASE_OUT }}
                className="font-mono text-[13px] tracking-wider text-star-dim"
              >
                {uniqueEvent}
              </motion.p>
            </>
          )}
        </div>

        {/* 挑战文案 */}
        <AnimatePresence>
          {phaseAtLeast(shownPhase, 'quote') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="mt-2 flex max-w-xl flex-col items-center gap-3 text-center"
            >
              <p className="font-serif text-[20px] font-bold italic leading-relaxed text-star sm:text-[22px]">
                {quoteLine}
              </p>
              <p className="font-mono text-[11px] tracking-[0.2em] text-star-faint">{quoteMono}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── S2 操作区 ── */}
        <AnimatePresence>
          {phaseAtLeast(shownPhase, 'done') && (
            <motion.div
              key="actions"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="mt-10 flex w-full flex-col items-center gap-5"
            >
              {/* 主操作 */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } } }}
                className="flex flex-wrap items-center justify-center gap-3"
              >
                <button type="button" onClick={() => void handleCopy()} className="btn-primary h-12 px-7 text-[15px]">
                  <Copy className="h-4 w-4" /> 复制挑战链接
                </button>
                <button type="button" onClick={() => setShareOpen(true)} className="btn-ghost h-12 px-7 text-[15px]">
                  <Download className="h-4 w-4" /> 生成分享卡
                </button>
                <Link to={`/play/${encodeURIComponent(pageData.worldId)}`} className="btn-ghost h-12 px-7 text-[15px]">
                  <RotateCcw className="h-4 w-4" /> 再玩一次
                </Link>
              </motion.div>

              {/* 次操作 */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } } }}
                className="flex flex-wrap items-center justify-center gap-2.5"
              >
                <button
                  type="button"
                  onClick={handlePublish}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-all',
                    confirmPublish
                      ? 'border-amber/70 text-amber'
                      : isPublic
                        ? 'border-cyan/50 text-cyan'
                        : 'border-white/10 text-star-dim hover:border-cyan/40 hover:text-star',
                  )}
                >
                  {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {confirmPublish ? '确认公开？世界名将公开，原始照片永不公开' : isPublic ? '已公开 · 设为私密' : '发布到广场'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  aria-expanded={showQr}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-all',
                    showQr ? 'border-cyan/50 text-cyan' : 'border-white/10 text-star-dim hover:border-cyan/40 hover:text-star',
                  )}
                >
                  <QrCode className="h-4 w-4" /> 二维码
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-all',
                    confirmDelete
                      ? 'border-red/70 text-red'
                      : 'border-white/10 text-star-dim hover:border-red/50 hover:text-red',
                  )}
                >
                  <Trash2 className="h-4 w-4" /> {confirmDelete ? '确认删除？' : '删除世界'}
                </button>
                <Link
                  to={`/world/${encodeURIComponent(pageData.worldId)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-[13px] text-star-dim transition-all hover:border-cyan/40 hover:text-star"
                >
                  <ScrollText className="h-4 w-4" /> 查看世界档案
                </Link>
              </motion.div>

              {/* 二维码展开 */}
              <AnimatePresence>
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="panel flex flex-col items-center gap-3 p-5">
                      <div className="rounded-xl bg-star p-2.5">
                        <QRCodeSVG value={challengeUrl} size={160} level="M" bgColor="#E8F0FF" fgColor="#05070D" />
                      </div>
                      <p className="max-w-[280px] break-all text-center font-mono text-[11px] leading-relaxed text-star-faint">
                        {challengeUrl}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── S3 留存带 ── */}
      <section className="relative mx-auto w-full max-w-[880px] px-5 py-24">
        <p className="text-center font-mono text-[12px] tracking-[0.3em] text-star-faint">{'// 接下来'}</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              to: `/play/${encodeURIComponent(pageData.worldId)}`,
              icon: Play,
              title: '重玩本世界',
              desc: '同一个世界，再活一次',
            },
            { to: '/square', icon: LayoutGrid, title: '世界广场', desc: '看看别人把什么变成了世界' },
            { to: '/create', icon: Plus, title: '再创造一个', desc: '下一张照片，就是下一个世界' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.1, duration: 0.45, ease: EASE_OUT }}
            >
              <Link
                to={item.to}
                className="group flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-void-2 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_12px_40px_rgba(87,230,240,.1)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-star-dim transition-colors group-hover:border-cyan/50 group-hover:text-cyan">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="font-serif text-[18px] font-bold text-star">{item.title}</span>
                <span className="text-[13px] leading-relaxed text-star-dim">{item.desc}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <ShareCardModal
        open={shareOpen}
        onClose={handleShareClose}
        dna={dna}
        run={run}
        stability={pageData.stability}
        victory={pageData.victory}
        challengeUrl={challengeUrl}
        onError={toast.show}
      />
      <Toast message={toast.message} />
    </div>
  );
}

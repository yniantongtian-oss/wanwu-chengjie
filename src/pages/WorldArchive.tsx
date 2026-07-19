/**
 * WorldArchive — 世界档案页 /world/:worldId（world.md）
 * 挑战链接落点：档案首屏 + DNA 法则 + 最佳成绩榜 + 遗言墙 + 底部行动带。
 * 数据契约：getWorld(worldId) → 失败尝试 ?w= 解码（decodeWorldFromUrl + saveWorld 入档）
 *           → 都失败显示「世界不存在或已删除」。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { Copy, Eye, EyeOff, Link2, Play, Trash2 } from 'lucide-react';
import type { StoredWorld } from '@/engine';
import {
  BIOME_LABELS,
  buildChallengePath,
  decodeWorldFromUrl,
  deleteWorld,
  getBestRuns,
  getWorld,
  saveWorld,
} from '@/engine';
import RarityBadge from '@/components/RarityBadge';
import StabilityRing from '@/components/StabilityRing';
import ProgrammaticCover from '@/components/world/ProgrammaticCover';
import DnaLawTable from '@/components/world/DnaLawTable';
import BestRunsTable from '@/components/world/BestRunsTable';
import LastWordsWall from '@/components/world/LastWordsWall';
import { ToastHost, useToast } from '@/components/world/Toast';
import { copyText, formatRunTime, formatSeedHex } from '@/components/world/archiveUtils';
import { readLastWords } from '@/components/world/lastWords';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

type LoadState = 'loading' | 'ready' | 'missing';

export default function WorldArchive() {
  const { worldId } = useParams<{ worldId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, push: toast } = useToast();

  const [world, setWorld] = useState<StoredWorld | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [deleteArmed, setDeleteArmed] = useState(false);
  const deleteTimerRef = useRef<number | null>(null);

  // 数据解析：本地档案 → 分享链接 ?w= 解码入档 → 缺失
  useEffect(() => {
    setDeleteArmed(false);
    if (!worldId) {
      setWorld(null);
      setLoadState('missing');
      return;
    }
    const found = getWorld(worldId);
    if (found) {
      setWorld(found);
      setLoadState('ready');
      return;
    }
    const encoded = searchParams.get('w');
    if (encoded) {
      const dna = decodeWorldFromUrl(encoded);
      if (dna) {
        // 外部分享链接进入：解码成功即入档（公开）
        saveWorld(dna, { isPublic: true });
        setWorld(getWorld(dna.worldCode));
        setLoadState('ready');
        return;
      }
    }
    setWorld(null);
    setLoadState('missing');
  }, [worldId, searchParams]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleCopyChallengeLink = useCallback(async () => {
    if (!world) return;
    const url = `${window.location.origin}${buildChallengePath(world.dna)}`;
    const ok = await copyText(url);
    toast(ok ? '挑战链接已复制，发给朋友吧' : '复制失败，请检查浏览器剪贴板权限');
  }, [world, toast]);

  const handleCopySeed = useCallback(async () => {
    if (!world) return;
    const ok = await copyText(String(world.dna.seed));
    toast(ok ? `种子已复制：${world.dna.seed}` : '复制失败，请检查浏览器剪贴板权限');
  }, [world, toast]);

  const handleTogglePublic = useCallback(() => {
    if (!world) return;
    saveWorld(world.dna, { isPublic: !world.isPublic });
    const next = getWorld(world.worldId);
    if (next) setWorld(next);
    toast(next?.isPublic ? '世界已发布到广场' : '世界已设为私密，仅自己可见');
  }, [world, toast]);

  const handleDelete = useCallback(() => {
    if (!world) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = window.setTimeout(() => setDeleteArmed(false), 4000);
      return;
    }
    if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
    deleteWorld(world.worldId);
    toast('世界已删除');
    navigate('/square');
  }, [world, deleteArmed, navigate, toast]);

  /* ── 缺失态 ─────────────────────────────────────── */
  if (loadState === 'missing') {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-star-faint">// 404 · WORLD NOT FOUND</p>
        <h1 className="font-serif text-[32px] font-bold text-star">世界不存在或已删除</h1>
        <p className="max-w-md text-[15px] leading-[1.75] text-star-dim">
          它可能从未被播种，也可能已经被它的主人收回。宇宙很大，去看看别的世界吧。
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link to="/square" className="btn-primary">
            去世界广场
          </Link>
          <Link to="/create" className="btn-ghost">
            去创造世界
          </Link>
        </div>
      </div>
    );
  }

  /* ── 加载态（本地读取极快，仅兜底） ─────────────── */
  if (loadState !== 'ready' || !world) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <p className="font-mono text-[13px] tracking-[0.3em] text-star-faint">// 正在调取世界档案…</p>
      </div>
    );
  }

  const { dna } = world;
  const isOwner = world.source === 'generated';
  const playPath = `/play/${encodeURIComponent(world.worldId)}`;
  const runs = getBestRuns(world.worldId, 10);
  const challengeCount = getBestRuns(world.worldId, 50).length;
  const best = runs[0] ?? null;
  const liveWords = readLastWords(world.worldId);

  return (
    <div className="relative">
      <ToastHost toasts={toasts} />

      {/* S1 · 档案首屏 */}
      <section className="relative mx-auto flex min-h-[88dvh] max-w-[1200px] flex-col justify-center px-4 py-16 sm:px-6 md:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[55fr_45fr]">
          {/* 左栏 */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className="font-mono text-[12px] uppercase tracking-[0.25em] text-star-faint"
            >
              World Archive / {dna.worldCode}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, letterSpacing: '0.3em' }}
              animate={{ opacity: 1, letterSpacing: '0.02em' }}
              transition={{ duration: 1, delay: 0.1, ease: EASE_OUT }}
              className="mt-5 font-serif text-[34px] font-black leading-tight text-star md:text-[44px]"
            >
              {dna.worldName}
            </motion.h1>

            {/* 徽标行 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: EASE_OUT }}
              className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2"
            >
              <span className="text-[13px] text-star-dim">{BIOME_LABELS[dna.biome]}</span>
              <RarityBadge rarity={dna.rarity} />
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] tracking-widest',
                  world.isPublic ? 'border-cyan/50 text-cyan' : 'border-star-faint/50 text-star-dim',
                )}
              >
                {world.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {world.isPublic ? '公开' : '私密 · 仅自己可见'}
              </span>
              <StabilityRing value={world.stability} size={32} />
            </motion.div>

            {/* 挑战文案 */}
            <motion.blockquote
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32, ease: EASE_OUT }}
              className="mt-7 border-l-2 border-cyan pl-5 font-serif text-[17px] italic leading-[1.9] text-star-dim md:text-[19px]"
            >
              “{dna.shareText}”
            </motion.blockquote>

            {/* 数据行（mono 三格统计） */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: EASE_OUT }}
              className="mt-8 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/5"
            >
              <div className="bg-void-2 px-4 py-3.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-star-faint">最佳成绩</p>
                <p className="mt-1 font-mono text-[16px] text-star">
                  {best ? formatRunTime(best.timeMs) : '--:--'}
                </p>
              </div>
              <div className="bg-void-2 px-4 py-3.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-star-faint">挑战次数</p>
                <p className="mt-1 font-mono text-[16px] text-star">{challengeCount}</p>
              </div>
              <div className="bg-void-2 px-4 py-3.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-star-faint">迷失者</p>
                <p className="mt-1 font-mono text-[16px] text-star">{liveWords.length}</p>
              </div>
            </motion.div>

            {/* CTA 组 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.48, ease: EASE_OUT }}
              className="mt-9 flex flex-wrap items-center gap-3.5"
            >
              <Link to={playPath} className="btn-primary h-12 px-7 text-[15px]">
                <Play className="h-4 w-4" />
                进入挑战
              </Link>
              <button type="button" onClick={handleCopyChallengeLink} className="btn-ghost h-12 px-6 text-[14px]">
                <Link2 className="h-4 w-4" />
                复制挑战链接
              </button>
              <button
                type="button"
                onClick={handleCopySeed}
                className="inline-flex h-12 items-center gap-2 rounded-full px-4 font-mono text-[13px] tracking-wider text-star-faint transition-colors hover:text-cyan"
              >
                <Copy className="h-3.5 w-3.5" />
                复制种子
              </button>
            </motion.div>

            {/* 所有者操作：发布切换 + 删除（二次确认） */}
            {isOwner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.56 }}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={handleTogglePublic}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-[13px] text-star-dim transition-all hover:border-cyan/50 hover:text-cyan"
                >
                  {world.isPublic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {world.isPublic ? '设为私密' : '发布到广场'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-all',
                    deleteArmed
                      ? 'border-red/70 bg-red/10 text-red shadow-[0_0_16px_rgba(255,77,94,.2)]'
                      : 'border-red/30 text-red/70 hover:border-red/60 hover:text-red',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteArmed ? '确认删除？此操作不可撤销' : '删除世界'}
                </button>
              </motion.div>
            )}
          </div>

          {/* 右栏：世界场景大图卡 */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 1.5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT }}
            className="mx-auto w-full max-w-[400px]"
          >
            <div className="animate-float-slow">
              <div
                className={cn(
                  'relative aspect-[3/4] overflow-hidden rounded-2xl bg-void-2',
                  dna.rarity === 'common' && 'rarity-common',
                  dna.rarity === 'rare' && 'rarity-rare',
                  dna.rarity === 'epic' && 'rarity-epic',
                  dna.rarity === 'legendary' && 'rarity-legendary legendary-sweep',
                  dna.rarity === 'unique' && 'rarity-unique unique-breathe',
                )}
              >
                {world.thumbnail ? (
                  <img src={world.thumbnail} alt={`${dna.worldName} 的世界场景`} className="h-full w-full object-cover" />
                ) : (
                  <ProgrammaticCover dna={dna} />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void-2/40" />
              </div>
            </div>
            <p className="mt-4 text-center font-mono text-[12px] tracking-wider text-star-faint">
              SEED {formatSeedHex(dna.seed)} · 可复现
            </p>
          </motion.div>
        </div>
      </section>

      {/* S2 · 世界 DNA 法则 */}
      <section className="mx-auto max-w-[880px] px-4 py-20 sm:px-6 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <h2 className="font-serif text-[24px] font-bold text-star md:text-[28px]">世界法则</h2>
          <p className="mt-2 font-mono text-[13px] tracking-wider text-star-faint">// 由 Kimi K3 编写，由引擎执行</p>
        </motion.div>
        <div className="mt-8">
          <DnaLawTable dna={dna} onToast={toast} />
        </div>
      </section>

      {/* S3 · 最佳成绩榜 */}
      <section className="mx-auto max-w-[880px] px-4 py-20 sm:px-6 md:py-24">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="font-serif text-[24px] font-bold text-star md:text-[28px]"
        >
          谁先走出了这个世界
        </motion.h2>
        <div className="mt-8">
          <BestRunsTable worldId={world.worldId} runs={runs} />
        </div>
      </section>

      {/* S4 · 世界遗言墙 */}
      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="mx-auto max-w-[880px]"
        >
          <h2 className="font-serif text-[24px] font-bold text-star md:text-[28px]">迷失者留下的</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-star-dim">
            在世界中迷失的玩家，可以在消失的位置留下不超过 10 个字。
          </p>
        </motion.div>
        <div className="mt-8">
          <LastWordsWall worldId={world.worldId} entries={liveWords} archivedNote={world.lastWords} />
        </div>
      </section>

      {/* S5 · 底部行动带 */}
      <section className="mx-auto max-w-[1200px] px-4 pb-8 pt-16 text-center sm:px-6 md:pt-24">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="font-serif text-[22px] font-bold text-star md:text-[28px]"
        >
          准备好进入 {dna.worldCode} 了吗？
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to={playPath} className="btn-primary">
            进入挑战
          </Link>
          <Link to="/square" className="btn-ghost">
            去广场看看别的世界
          </Link>
          <Link to="/create" className="btn-ghost">
            创造我的世界
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

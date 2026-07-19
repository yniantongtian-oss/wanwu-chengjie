/**
 * BestRunsTable — 最佳成绩榜（world.md S3）
 * 数据：getBestRuns(worldId, n)，真实本地榜；空态引导成为第一个。
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Flag } from 'lucide-react';
import type { BestRun } from '@/engine';
import { formatDate, formatRunTime, visitorCodeFromRunId } from '@/components/world/archiveUtils';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

const RANK_DOT: Record<number, string> = {
  1: 'bg-gold shadow-[0_0_10px_rgba(232,200,118,.9)]',
  2: 'bg-cyan shadow-[0_0_10px_rgba(87,230,240,.9)]',
  3: 'bg-star shadow-[0_0_10px_rgba(232,240,255,.7)]',
};

interface BestRunsTableProps {
  worldId: string;
  runs: BestRun[];
}

export default function BestRunsTable({ worldId, runs }: BestRunsTableProps) {
  if (runs.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
        <p className="font-serif text-[20px] font-bold text-star">还没有人走出这个世界。</p>
        <p className="font-serif text-[17px] text-star-dim">成为第一个。</p>
        <Link to={`/play/${encodeURIComponent(worldId)}`} className="btn-primary mt-2 h-11 px-6 text-[14px]">
          进入挑战
        </Link>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      {/* 表头 */}
      <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-white/8 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-star-faint sm:grid-cols-[48px_1.2fr_1fr_1fr_1fr_auto]">
        <span>#</span>
        <span>访客</span>
        <span className="hidden sm:block">成绩</span>
        <span className="hidden sm:block">用时</span>
        <span className="hidden sm:block">日期</span>
        <span className="text-right sm:text-left">结果</span>
      </div>

      {runs.map((run, i) => {
        const rank = i + 1;
        const isTop = rank === 1;
        return (
          <motion.div
            key={run.runId}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.45, delay: i * 0.05, ease: EASE_OUT }}
            className={cn(
              'grid grid-cols-[36px_1fr_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[48px_1.2fr_1fr_1fr_1fr_auto]',
              i > 0 && 'border-t border-white/5',
              isTop && 'bg-cyan/[0.04]',
            )}
          >
            {/* 名次 */}
            <span className="flex items-center gap-2">
              <span className={cn('h-1.5 w-1.5 rounded-full', RANK_DOT[rank] ?? 'bg-star-faint/50')} />
              <span
                className={cn(
                  'font-mono text-[13px]',
                  rank <= 3 ? 'text-star' : 'text-star-faint',
                  rank <= 3 && 'drop-shadow-[0_0_6px_rgba(232,240,255,.35)]',
                )}
              >
                {String(rank).padStart(2, '0')}
              </span>
            </span>

            {/* 访客代号 */}
            <span className="truncate font-mono text-[13px] tracking-wider text-star-dim">
              {visitorCodeFromRunId(run.runId)}
            </span>

            {/* 成绩 */}
            <span className="hidden font-mono text-[13px] text-star sm:block">
              {run.score.toLocaleString()}
              <span className="ml-1.5 text-[11px] text-star-faint">
                {run.collected}/{run.total}
              </span>
            </span>

            {/* 用时 */}
            <span className="hidden font-mono text-[13px] text-star-dim sm:block">{formatRunTime(run.timeMs)}</span>

            {/* 日期 */}
            <span className="hidden font-mono text-[12px] text-star-faint sm:block">{formatDate(run.finishedAt)}</span>

            {/* 结果 */}
            <span className="flex items-center justify-end gap-1.5 sm:justify-start">
              {run.victory ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] tracking-wider text-green">
                  <Flag className="h-3 w-3" />
                  走出
                </span>
              ) : (
                <span className="font-mono text-[11px] tracking-wider text-star-faint">迷失</span>
              )}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

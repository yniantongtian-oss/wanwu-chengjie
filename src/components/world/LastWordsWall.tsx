/**
 * LastWordsWall — 世界遗言瀑布墙（world.md S4）
 * 数据：localStorage k3:lastWords:{worldId}（游戏页写入）+ 世界档案自带的 lastWords 摘记。
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Feather } from 'lucide-react';
import type { LastWordEntry } from '@/components/world/lastWords';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface LastWordsWallProps {
  worldId: string;
  entries: LastWordEntry[];
  /** 世界档案自带的遗言摘记（示例世界有），作为档案局记录追加 */
  archivedNote?: string;
}

export default function LastWordsWall({ worldId, entries, archivedNote }: LastWordsWallProps) {
  const hasAnything = entries.length > 0 || !!archivedNote;

  if (!hasAnything) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
        <Feather className="h-6 w-6 text-star-faint" strokeWidth={1.5} />
        <p className="font-serif text-[20px] font-bold text-star">这面墙还空着。</p>
        <p className="max-w-sm text-[14px] leading-[1.75] text-star-dim">
          在世界中迷失的玩家，可以在消失的位置留下不超过 10 个字。成为第一个留下遗言的人。
        </p>
        <Link to={`/play/${encodeURIComponent(worldId)}`} className="btn-ghost mt-2 h-11 px-6 text-[14px]">
          进入世界，留下第一句
        </Link>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
      {entries.map((entry, i) => (
        <motion.figure
          key={`${entry.text}-${i}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.5, delay: (i % 6) * 0.06, ease: EASE_OUT }}
          className={cn(
            'panel mb-5 break-inside-avoid p-5 transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(87,230,240,.1)]',
            i % 3 === 1 && 'sm:mt-8',
            i % 3 === 2 && 'sm:mt-4',
          )}
        >
          <blockquote className="font-serif text-[16px] italic leading-[1.8] text-star">
            “{entry.text}”
          </blockquote>
          <figcaption className="mt-3 font-mono text-[11px] tracking-wider text-star-faint">
            —— {entry.author ?? '无名迷失者'}
            {typeof entry.x === 'number' && typeof entry.y === 'number' && (
              <span>
                {' '}
                @ ({Math.round(entry.x)}, {Math.round(entry.y)})
              </span>
            )}
          </figcaption>
        </motion.figure>
      ))}

      {archivedNote && (
        <motion.figure
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.5, delay: (entries.length % 6) * 0.06, ease: EASE_OUT }}
          className="panel mb-5 break-inside-avoid border-gold/25 p-5 transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(232,200,118,.1)]"
        >
          <blockquote className="font-serif text-[16px] italic leading-[1.8] text-star">“{archivedNote}”</blockquote>
          <figcaption className="mt-3 font-mono text-[11px] tracking-wider text-gold/70">—— 档案局摘记</figcaption>
        </motion.figure>
      )}
    </div>
  );
}

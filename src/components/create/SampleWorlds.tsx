import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SAMPLE_WORLDS } from '@/engine';
import type { WorldDNA } from '@/engine';

export interface SampleEntry {
  dna: WorldDNA;
  thumbnail: string;
}

/** 三个免上传示例世界（桌面 / 雨夜 / 猫），缩略图与世界档案局一致 */
export const SAMPLE_ENTRIES: SampleEntry[] = SAMPLE_WORLDS.slice(0, 3).map((dna, i) => ({
  dna,
  thumbnail: ['/world-desk.png', '/world-rain.png', '/world-cat.png'][i] ?? '/world-desk.png',
}));

interface SampleWorldsProps {
  onPick: (entry: SampleEntry) => void;
}

/** 示例世界入口：点击直接以其 DNA 走生成序列（跳过扫描） */
export default function SampleWorlds({ onPick }: SampleWorldsProps) {
  return (
    <section className="mt-14">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
        <p className="font-mono text-[12px] tracking-[0.2em] text-star-faint">
          {'// 或者，先进入一个现成的世界'}
        </p>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SAMPLE_ENTRIES.map((entry, i) => (
          <motion.button
            key={entry.dna.worldCode}
            type="button"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onPick(entry)}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-void-2 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_12px_40px_rgba(87,230,240,.12)]"
          >
            <div className="relative h-36 overflow-hidden">
              <img
                src={entry.thumbnail}
                alt={entry.dna.worldName}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void-2 via-transparent to-transparent" />
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-serif text-[16px] font-bold text-star">{entry.dna.worldName}</p>
                <p className="mt-0.5 font-mono text-[11px] tracking-wider text-star-faint">
                  {entry.dna.worldCode}
                </p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-star-dim transition-all group-hover:border-cyan/60 group-hover:text-cyan">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

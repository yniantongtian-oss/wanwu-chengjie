/**
 * FilterBar — 广场 sticky 筛选栏（square.md S3）
 * 排序分段控件（layoutId 滑动指示器）+ 稀有度多选胶囊。
 */

import { motion } from 'framer-motion';
import type { Rarity } from '@/engine';
import { RARITY_LABELS } from '@/engine';
import { cn } from '@/lib/utils';

export type SortTab = 'featured' | 'latest' | 'hardest' | 'stable';

export const SORT_TABS: Array<{ key: SortTab; label: string }> = [
  { key: 'featured', label: '精选' },
  { key: 'latest', label: '最新' },
  { key: 'hardest', label: '最难' },
  { key: 'stable', label: '最稳定' },
];

/** 设计规范中的稀有度筛选项（「全部」= 清空选择，含常见） */
const FILTER_RARITIES: Rarity[] = ['rare', 'epic', 'legendary', 'unique'];

const RARITY_CHIP_ACTIVE: Record<Rarity, string> = {
  common: 'border-star-dim/70 text-star bg-star-dim/10',
  rare: 'border-cyan/70 text-cyan bg-cyan/10 shadow-[0_0_14px_rgba(87,230,240,.18)]',
  epic: 'border-violet/70 text-violet bg-violet/10 shadow-[0_0_14px_rgba(139,124,246,.18)]',
  legendary: 'border-gold/70 text-gold bg-gold/10 shadow-[0_0_14px_rgba(232,200,118,.18)]',
  unique: 'border-gold/70 text-gold bg-[linear-gradient(120deg,rgba(232,200,118,.12),rgba(87,230,240,.12))] shadow-[0_0_14px_rgba(232,200,118,.2)]',
};

interface FilterBarProps {
  tab: SortTab;
  onTabChange: (tab: SortTab) => void;
  selectedRarities: Rarity[];
  onToggleRarity: (rarity: Rarity) => void;
  onClearRarities: () => void;
  /** 当前过滤结果数 */
  resultCount: number;
}

export default function FilterBar({
  tab,
  onTabChange,
  selectedRarities,
  onToggleRarity,
  onClearRarities,
  resultCount,
}: FilterBarProps) {
  return (
    <div className="sticky top-16 z-40 border-y border-white/5 bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        {/* 排序分段控件 */}
        <div role="tablist" aria-label="排序方式" className="flex items-center gap-1 rounded-full border border-white/8 bg-void-2/60 p-1">
          {SORT_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(t.key)}
                className={cn(
                  'relative rounded-full px-4 py-1.5 text-[13px] transition-colors duration-200',
                  active ? 'text-cyan' : 'text-star-dim hover:text-star',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="square-sort-pill"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 rounded-full border border-cyan/40 bg-cyan/10 shadow-[0_0_16px_rgba(87,230,240,.15)]"
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* 稀有度多选胶囊 */}
        <div className="flex flex-wrap items-center gap-2" aria-label="稀有度筛选">
          <button
            type="button"
            onClick={onClearRarities}
            aria-pressed={selectedRarities.length === 0}
            className={cn(
              'rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wider transition-all duration-200',
              selectedRarities.length === 0
                ? 'border-star-dim/70 text-star bg-white/5'
                : 'border-white/10 text-star-faint hover:border-white/25 hover:text-star-dim',
            )}
          >
            全部
          </button>
          {FILTER_RARITIES.map((rarity) => {
            const active = selectedRarities.includes(rarity);
            return (
              <button
                key={rarity}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleRarity(rarity)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wider transition-all duration-200',
                  active
                    ? RARITY_CHIP_ACTIVE[rarity]
                    : 'border-white/10 text-star-faint hover:border-white/25 hover:text-star-dim',
                )}
              >
                {RARITY_LABELS[rarity]}
              </button>
            );
          })}
        </div>

        {/* 结果计数 */}
        <span className="ml-auto hidden font-mono text-[11px] tracking-widest text-star-faint md:block">
          // {resultCount} 个世界
        </span>
      </div>
    </div>
  );
}

/**
 * Square — 世界广场 /square（square.md）
 * 每日世界横幅 + sticky 筛选栏（排序/稀有度/搜索）+ 世界流（网格/紧凑列表）+ 底部 CTA。
 * 数据契约：listWorlds()（首访自动播种）+ getBestRuns + k3:lastWords:{worldId}。
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { BestRun, Rarity, StoredWorld } from '@/engine';
import { DIFFICULTIES, getBestRuns, hashSeed, listWorlds } from '@/engine';
import DailyWorldBanner from '@/components/square/DailyWorldBanner';
import FilterBar from '@/components/square/FilterBar';
import type { SortTab } from '@/components/square/FilterBar';
import SquareWorldCard from '@/components/square/SquareWorldCard';
import CompactWorldRow from '@/components/square/CompactWorldRow';
import EmptyState from '@/components/square/EmptyState';
import { readLastWords } from '@/components/world/lastWords';

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];
const PAGE_SIZE = 12;

/** 每个世界的广场附加数据（真实本地数据，读取一次） */
interface WorldExtras {
  best: BestRun | null;
  challengeCount: number;
  lastWord?: string;
}

function localDateKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function sortWorlds(list: StoredWorld[], tab: SortTab): StoredWorld[] {
  const out = [...list];
  switch (tab) {
    case 'featured':
      out.sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt - a.createdAt);
      break;
    case 'latest':
      out.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'hardest':
      out.sort(
        (a, b) =>
          DIFFICULTIES.indexOf(b.dna.difficulty) - DIFFICULTIES.indexOf(a.dna.difficulty) ||
          a.stability - b.stability ||
          a.worldId.localeCompare(b.worldId),
      );
      break;
    case 'stable':
      out.sort((a, b) => b.stability - a.stability || b.createdAt - a.createdAt);
      break;
  }
  return out;
}

export default function Square() {
  // 公开世界池（首访自动播种 4 示例 + 12 填充）
  const worlds = useMemo(() => listWorlds().filter((w) => w.isPublic), []);

  // 每世界的成绩 / 遗言附加数据
  const extras = useMemo(() => {
    const map = new Map<string, WorldExtras>();
    for (const w of worlds) {
      const runs = getBestRuns(w.worldId, 50);
      const liveWords = readLastWords(w.worldId);
      map.set(w.worldId, {
        best: runs[0] ?? null,
        challengeCount: runs.length,
        lastWord: liveWords[0]?.text ?? w.lastWords,
      });
    }
    return map;
  }, [worlds]);

  // 每日世界：日期字符串 hash 确定性选取，同一天所有访问相同
  const dateKey = localDateKey();
  const dailyWorld = useMemo(() => {
    if (worlds.length === 0) return null;
    const sorted = [...worlds].sort((a, b) => a.worldId.localeCompare(b.worldId));
    return sorted[hashSeed(`daily:${dateKey}`) % sorted.length];
  }, [worlds, dateKey]);

  // 筛选状态
  const [tab, setTab] = useState<SortTab>('featured');
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>([]);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let list = worlds;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (w) => w.dna.worldName.toLowerCase().includes(q) || w.dna.worldCode.toLowerCase().includes(q),
      );
    }
    if (selectedRarities.length > 0) {
      list = list.filter((w) => selectedRarities.includes(w.dna.rarity));
    }
    return sortWorlds(list, tab);
  }, [worlds, query, selectedRarities, tab]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const filtersActive = query.trim().length > 0 || selectedRarities.length > 0;

  const resetPage = () => setVisibleCount(PAGE_SIZE);
  const handleTabChange = (t: SortTab) => {
    setTab(t);
    resetPage();
  };
  const handleToggleRarity = (r: Rarity) => {
    setSelectedRarities((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    resetPage();
  };
  const handleClearRarities = () => {
    setSelectedRarities([]);
    resetPage();
  };
  const handleQueryChange = (value: string) => {
    setQuery(value);
    resetPage();
  };
  const clearAllFilters = () => {
    setQuery('');
    setSelectedRarities([]);
    resetPage();
  };

  const dailyExtras = dailyWorld ? extras.get(dailyWorld.worldId) : undefined;
  const isGridView = tab === 'featured' || tab === 'latest';

  return (
    <div className="relative">
      {/* 低密星尘背景 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(87,230,240,.04), transparent 50%), radial-gradient(ellipse at 85% 30%, rgba(139,124,246,.03), transparent 55%)',
        }}
      />

      {/* S1 · 页头 */}
      <section className="relative mx-auto max-w-[1200px] px-4 pb-14 pt-20 sm:px-6 md:pt-24">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className="font-mono text-[12px] uppercase tracking-[0.3em] text-star-faint"
            >
              World Square · 世界广场
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: EASE_OUT }}
              className="mt-4 font-serif text-[32px] font-bold leading-snug text-star md:text-[40px]"
            >
              别人把什么，变成了世界
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: EASE_OUT }}
              className="mt-4 text-[15px] leading-[1.75] text-star-dim"
            >
              每一个世界都来自一张照片、一句话，或三个表情。进入它，挑战它。
            </motion.p>
          </div>

          {/* 搜索框（Enter 即搜 / 输入即过滤） */}
          <motion.form
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: EASE_OUT }}
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="w-full lg:w-80"
          >
            <label htmlFor="square-search" className="sr-only">
              搜索世界名 / 编号
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-star-faint" />
              <input
                id="square-search"
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="搜索世界名 / 编号"
                className="h-12 w-full rounded-full border border-white/10 bg-void-2/70 pl-11 pr-4 font-mono text-[13px] tracking-wider text-star placeholder:text-star-faint focus:border-cyan/60 focus:shadow-[0_0_20px_rgba(87,230,240,.15)] focus:outline-none"
              />
            </div>
          </motion.form>
        </div>
      </section>

      {/* S2 · 每日世界 */}
      {dailyWorld && dailyExtras && (
        <section className="relative mx-auto max-w-[1200px] px-4 pb-16 sm:px-6">
          <DailyWorldBanner
            world={dailyWorld}
            dateLabel={dateKey}
            challengeCount={dailyExtras.challengeCount}
            bestTimeMs={dailyExtras.best?.timeMs ?? null}
          />
        </section>
      )}

      {/* S3 · 筛选栏（sticky，需直接位于页面流中才能吸附） */}
      <FilterBar
        tab={tab}
        onTabChange={handleTabChange}
        selectedRarities={selectedRarities}
        onToggleRarity={handleToggleRarity}
        onClearRarities={handleClearRarities}
        resultCount={filtered.length}
      />

      {/* S4 · 世界流 */}
      <section className="relative mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        {visible.length === 0 ? (
          <EmptyState filtersActive={filtersActive} onClearFilters={clearAllFilters} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {isGridView ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {visible.map((world, i) => {
                    const extra = extras.get(world.worldId);
                    return (
                      <motion.div
                        key={world.worldId}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-8%' }}
                        transition={{ duration: 0.5, delay: (i % PAGE_SIZE) * 0.06, ease: EASE_OUT }}
                      >
                        <SquareWorldCard
                          world={world}
                          bestScore={extra?.best?.score ?? null}
                          challengeCount={extra?.challengeCount ?? 0}
                          lastWord={extra?.lastWord}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {visible.map((world, i) => (
                    <motion.div
                      key={world.worldId}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-8%' }}
                      transition={{ duration: 0.4, delay: (i % PAGE_SIZE) * 0.04, ease: EASE_OUT }}
                    >
                      <CompactWorldRow world={world} best={extras.get(world.worldId)?.best ?? null} rank={i + 1} />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* 加载更多 */}
              {hasMore && (
                <div className="mt-12 flex flex-col items-center gap-3">
                  <button type="button" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)} className="btn-ghost">
                    加载更多
                  </button>
                  <p className="font-mono text-[11px] tracking-widest text-star-faint">
                    已展示 {visible.length} / {filtered.length}
                  </p>
                </div>
              )}
              {!hasMore && filtered.length > PAGE_SIZE && (
                <p className="mt-12 text-center font-mono text-[11px] tracking-widest text-star-faint">
                  // 星域尽头 · 共 {filtered.length} 个世界
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </section>

      {/* S5 · 底部 CTA 带 */}
      <section className="relative mx-auto max-w-[1200px] px-4 pb-8 pt-16 text-center sm:px-6 md:pt-24">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="font-serif text-[24px] font-bold text-star md:text-[28px]"
        >
          你的照片，也值得一个世界
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/create" className="btn-primary">
            创造我的世界
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

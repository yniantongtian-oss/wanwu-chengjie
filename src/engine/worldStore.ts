/**
 * worldStore.ts — 世界档案局（localStorage 持久化）
 * 预置 4 个示例世界 + 12 个广场填充世界；本地最佳成绩榜。
 */

import type { WorldDNA } from './dna';
import { sanitizeWorldDNA, createDefaultDNA, RARITIES } from './dna';
import type { BestRun, RunResult } from './gameTypes';
import { createRng } from './rng';
import { SAMPLE_WORLDS } from './generator';

const WORLDS_KEY = 'k3.worlds.v1';
const RUNS_KEY = 'k3.runs.v1';
const SEEDED_KEY = 'k3.seeded.v1';

// ── 类型 ─────────────────────────────────────────────

export interface StoredWorld {
  /** = dna.worldCode，如 K3-WORLD-00001 */
  worldId: string;
  dna: WorldDNA;
  /** 世界稳定度 0–100 */
  stability: number;
  /** 缩略图路径（如 /world-desk.png），可空 */
  thumbnail?: string;
  createdAt: number;
  isPublic: boolean;
  featured: boolean;
  source: 'sample' | 'generated' | 'square';
  /** 世界遗言（≤10 字） */
  lastWords?: string;
}

// ── 内部读写 ─────────────────────────────────────────

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readWorlds(): StoredWorld[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(WORLDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is StoredWorld =>
        typeof w === 'object' && w !== null && typeof (w as StoredWorld).worldId === 'string',
    );
  } catch {
    return [];
  }
}

function writeWorlds(worlds: StoredWorld[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds));
  } catch {
    // 存储满 / 隐私模式：静默失败，内存态仍然可用
  }
}

type RunMap = Record<string, BestRun[]>;

function readRuns(): RunMap {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(RUNS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as RunMap) : {};
  } catch {
    return {};
  }
}

function writeRuns(runs: RunMap): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  } catch {
    // ignore
  }
}

// ── 预置数据 ─────────────────────────────────────────

const SAMPLE_META: Array<Pick<StoredWorld, 'stability' | 'thumbnail' | 'featured' | 'lastWords'>> = [
  { stability: 74, thumbnail: '/world-desk.png', featured: true, lastWords: '台灯熄了，路还在。' },
  { stability: 81, thumbnail: '/world-rain.png', featured: true, lastWords: '雨往上走，别往下看。' },
  { stability: 63, thumbnail: '/world-cat.png', featured: true, lastWords: '呼噜声停了就快跑。' },
  { stability: 88, thumbnail: '/world-circuit.png', featured: true, lastWords: '节点比出口更重要。' },
];

const SQUARE_FILLER_NAMES = [
  '第七温室', '失重的墨水瓶', '悬钟回廊', '慢速风暴眼',
  '纸船渡口', '琥珀深井', '无声的钟塔', '折叠剧场',
  '苔痕观象台', '零点驿站', '玻璃档案馆', '余温灯塔',
];

function buildFillerWorld(index: number): StoredWorld {
  const seed = 200000 + index * 7919;
  const rng = createRng(seed);
  const name = SQUARE_FILLER_NAMES[index % SQUARE_FILLER_NAMES.length];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += alphabet[rng.int(0, alphabet.length - 1)];
  const dna = createDefaultDNA({
    worldName: name,
    worldDescription: '档案局收录的漂流世界。它的作者没有留下名字，只留下了一颗可复现的种子。',
    seed,
    worldCode: `K3-WORLD-${code}`,
    biome: rng.pick(['crystal_wilds', 'floating_archive', 'tide_observatory', 'ember_forge', 'mechanical_ruins', 'storybook_harbor'] as const),
    sky: rng.pick(['aurora_dust', 'eclipse_ring', 'dark_room_nebula', 'twin_moons'] as const),
    lighting: rng.pick(['portal_rim', 'ember_fall', 'moon_glow', 'lamp_sun'] as const),
    weather: rng.pick(['floating_dust', 'time_snow', 'petal_drift', 'clear'] as const),
    terrain: rng.pick(['crystal_dunes', 'book_terraces', 'keyboard_steps', 'lamp_islands'] as const),
    gravity: Math.round(rng.range(0.5, 1.5) * 100) / 100,
    collectibleCount: rng.int(8, 15),
    mutationAtSeconds: rng.int(28, 42),
    rarity: RARITIES[rng.next() < 0.55 ? 0 : rng.next() < 0.62 ? 1 : rng.next() < 0.75 ? 2 : rng.next() < 0.85 ? 3 : 4],
    difficulty: rng.pick(['gentle', 'standard', 'intense'] as const),
  });
  return {
    worldId: dna.worldCode,
    dna,
    stability: rng.int(35, 96),
    createdAt: Date.now() - rng.int(1, 72) * 3600_000,
    isPublic: true,
    featured: false,
    source: 'square',
  };
}

/** 首次访问时播种：4 个示例世界 + 12 个广场填充世界 */
export function seedStoreIfNeeded(): void {
  if (!hasStorage()) return;
  if (window.localStorage.getItem(SEEDED_KEY)) return;
  const now = Date.now();
  const samples: StoredWorld[] = SAMPLE_WORLDS.map((dna, i) => ({
    worldId: dna.worldCode,
    dna,
    stability: SAMPLE_META[i].stability,
    thumbnail: SAMPLE_META[i].thumbnail,
    createdAt: now - (i + 1) * 86400_000,
    isPublic: true,
    featured: SAMPLE_META[i].featured,
    source: 'sample',
    lastWords: SAMPLE_META[i].lastWords,
  }));
  const fillers = Array.from({ length: 12 }, (_, i) => buildFillerWorld(i));
  writeWorlds([...samples, ...fillers]);
  try {
    window.localStorage.setItem(SEEDED_KEY, '1');
  } catch {
    // ignore
  }
}

// ── 公开 API ─────────────────────────────────────────

/** 保存（或覆盖）一个世界，返回完整列表 */
export function saveWorld(dna: WorldDNA, meta?: Partial<Omit<StoredWorld, 'worldId' | 'dna'>>): StoredWorld[] {
  seedStoreIfNeeded();
  const { dna: clean } = sanitizeWorldDNA(dna);
  const worlds = readWorlds();
  const worldId = clean.worldCode;
  const existing = worlds.find((w) => w.worldId === worldId);
  const record: StoredWorld = {
    worldId,
    dna: clean,
    stability: meta?.stability ?? existing?.stability ?? 100,
    thumbnail: meta?.thumbnail ?? existing?.thumbnail,
    createdAt: existing?.createdAt ?? Date.now(),
    isPublic: meta?.isPublic ?? existing?.isPublic ?? false,
    featured: meta?.featured ?? existing?.featured ?? false,
    source: meta?.source ?? existing?.source ?? 'generated',
    lastWords: meta?.lastWords ?? existing?.lastWords,
  };
  const next = [record, ...worlds.filter((w) => w.worldId !== worldId)];
  writeWorlds(next);
  return next;
}

/** 按 worldId（即 worldCode）取世界；未找到返回 null */
export function getWorld(worldId: string): StoredWorld | null {
  seedStoreIfNeeded();
  const decoded = decodeURIComponent(worldId);
  return readWorlds().find((w) => w.worldId === decoded) ?? null;
}

/** 列出全部世界（新的在前） */
export function listWorlds(): StoredWorld[] {
  seedStoreIfNeeded();
  return readWorlds();
}

/** 删除世界，返回删除后的完整列表 */
export function deleteWorld(worldId: string): StoredWorld[] {
  const next = readWorlds().filter((w) => w.worldId !== worldId);
  writeWorlds(next);
  return next;
}

/** 记录一局成绩，自动进入该世界最佳榜（按分数降序，最多保留 50 条） */
export function saveRun(worldId: string, run: RunResult): BestRun[] {
  const runs = readRuns();
  const entry: BestRun = {
    runId: run.runId,
    score: run.score,
    timeMs: run.timeMs,
    collected: run.collected,
    total: run.total,
    victory: run.victory,
    stability: run.stability,
    finishedAt: run.finishedAt,
  };
  const list = [...(runs[worldId] ?? []), entry]
    .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs)
    .slice(0, 50);
  runs[worldId] = list;
  writeRuns(runs);
  return list;
}

/** 取某世界的最佳成绩榜（按分数降序） */
export function getBestRuns(worldId: string, limit = 10): BestRun[] {
  const runs = readRuns();
  return [...(runs[worldId] ?? [])]
    .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs)
    .slice(0, limit);
}

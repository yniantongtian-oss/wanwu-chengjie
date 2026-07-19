/**
 * dna.ts — 世界 DNA 类型系统
 * 所有枚举导出为 const 数组 + 联合类型；validateWorldDNA 逐字段校验并降级。
 */

// ── 枚举 ─────────────────────────────────────────────

export const BIOMES = [
  'mechanical_ruins',
  'inverted_city',
  'storybook_harbor',
  'circuit_maze',
  'crystal_wilds',
  'floating_archive',
  'tide_observatory',
  'ember_forge',
] as const;
export type Biome = (typeof BIOMES)[number];

export const PALETTES = [
  'cyan_amber',
  'cyan_mono',
  'violet_cyan',
  'gold_cyan',
  'ember_red',
  'verdant_glow',
] as const;
export type Palette = (typeof PALETTES)[number];

export const SKIES = [
  'dark_room_nebula',
  'rain_void',
  'twin_moons',
  'starless_grid',
  'aurora_dust',
  'eclipse_ring',
] as const;
export type Sky = (typeof SKIES)[number];

export const LIGHTINGS = [
  'lamp_sun',
  'backlit_rain',
  'moon_glow',
  'node_pulse',
  'ember_fall',
  'portal_rim',
] as const;
export type Lighting = (typeof LIGHTINGS)[number];

export const WEATHERS = [
  'floating_dust',
  'reverse_rain',
  'time_snow',
  'static_sparks',
  'petal_drift',
  'clear',
] as const;
export type Weather = (typeof WEATHERS)[number];

export const TERRAINS = [
  'keyboard_steps',
  'lamp_islands',
  'paw_pad_isles',
  'circuit_plateaus',
  'crystal_dunes',
  'book_terraces',
] as const;
export type Terrain = (typeof TERRAINS)[number];

export const STRUCTURES = [
  'cup_tower',
  'cable_vines',
  'streetlamp_beacon',
  'whisker_bridge',
  'chip_spire',
  'solder_node',
  'ink_obelisk',
  'glass_conservatory',
  'ring_gate',
  'anchor_shrine',
] as const;
export type Structure = (typeof STRUCTURES)[number];

export const HAZARDS = [
  'data_bramble',
  'static_field',
  'gravity_well',
  'lava_seam',
  'mirror_trap',
  'fading_floor',
] as const;
export type Hazard = (typeof HAZARDS)[number];

export const COLLECTIBLES = [
  'memory_shard',
  'star_scale',
  'purr_crystal',
  'volt_cell',
  'ink_drop',
  'sun_seed',
] as const;
export type Collectible = (typeof COLLECTIBLES)[number];

export const MISSIONS = ['collect_and_activate', 'collect_and_escape'] as const;
export type Mission = (typeof MISSIONS)[number];

export const MUTATIONS = [
  'gravity_flip',
  'sun_blackout',
  'reverse_rain',
  'pixelation',
  'faction_flip',
  'time_freeze',
  'color_theft',
  'mirror_world',
] as const;
export type Mutation = (typeof MUTATIONS)[number];

export const BOSSES = [
  'cursor_m01',
  'umbrella_warden',
  'static_howler',
  'null_shepherd',
  'ember_maw',
  'mirror_double',
] as const;
export type Boss = (typeof BOSSES)[number];

export const DIFFICULTIES = ['gentle', 'standard', 'intense'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ENDINGS = ['portal_escape', 'world_restored', 'fading_light'] as const;
export type Ending = (typeof ENDINGS)[number];

export const RARITIES = ['common', 'rare', 'epic', 'legendary', 'unique'] as const;
export type Rarity = (typeof RARITIES)[number];

/** 稀有度中文名 */
export const RARITY_LABELS: Record<Rarity, string> = {
  common: '常见',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  unique: '唯一',
};

/** 稀有度抽取概率（55 / 28 / 12 / 4 / 1） */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 55,
  rare: 28,
  epic: 12,
  legendary: 4,
  unique: 1,
};

export const BIOME_LABELS: Record<Biome, string> = {
  mechanical_ruins: '机械遗迹',
  inverted_city: '倒置都市',
  storybook_harbor: '童话星港',
  circuit_maze: '电路迷城',
  crystal_wilds: '晶簇荒野',
  floating_archive: '浮空档案馆',
  tide_observatory: '潮汐观象台',
  ember_forge: '余烬熔炉',
};

// ── 主接口 ───────────────────────────────────────────

export interface WorldDNA {
  schemaVersion: 1;
  worldName: string;
  worldDescription: string;
  sourceTags: string[];
  biome: Biome;
  palette: Palette;
  sky: Sky;
  lighting: Lighting;
  /** 重力系数，0.2 – 2.0 */
  gravity: number;
  weather: Weather;
  terrain: Terrain;
  structures: Structure[];
  hazards: Hazard[];
  collectible: Collectible;
  /** 8 – 15 */
  collectibleCount: number;
  mission: Mission;
  mutation: Mutation;
  /** 20 – 60 */
  mutationAtSeconds: number;
  boss: Boss;
  difficulty: Difficulty;
  ending: Ending;
  rarity: Rarity;
  shareText: string;
  seed: number;
  /** K3-WORLD-XXXXX */
  worldCode: string;
}

// ── 默认值 ───────────────────────────────────────────

export function createDefaultDNA(overrides: Partial<WorldDNA> = {}): WorldDNA {
  return {
    schemaVersion: 1,
    worldName: '无名世界',
    worldDescription: '一个尚未被讲述的世界。',
    sourceTags: [],
    biome: 'mechanical_ruins',
    palette: 'cyan_amber',
    sky: 'dark_room_nebula',
    lighting: 'lamp_sun',
    gravity: 1,
    weather: 'floating_dust',
    terrain: 'keyboard_steps',
    structures: ['cup_tower', 'cable_vines'],
    hazards: ['data_bramble'],
    collectible: 'memory_shard',
    collectibleCount: 12,
    mission: 'collect_and_activate',
    mutation: 'sun_blackout',
    mutationAtSeconds: 35,
    boss: 'cursor_m01',
    difficulty: 'standard',
    ending: 'portal_escape',
    rarity: 'common',
    shareText: '来我的世界挑战我。',
    seed: 1,
    worldCode: 'K3-WORLD-00000',
    ...overrides,
  };
}

// ── 校验（降级策略：非法值替换为安全默认并记录） ──────

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  field: string,
  errors: string[],
): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  if (value !== undefined && value !== null) {
    errors.push(`${field}: 非法值 ${JSON.stringify(value)}，已降级为 ${fallback}`);
  }
  return fallback;
}

function asNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  field: string,
  errors: string[],
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < min || value > max) {
      errors.push(`${field}: ${value} 超出范围 [${min}, ${max}]，已截断`);
      return Math.min(max, Math.max(min, value));
    }
    return value;
  }
  if (value !== undefined && value !== null) {
    errors.push(`${field}: 非数字，已降级为 ${fallback}`);
  }
  return fallback;
}

function asString(value: unknown, maxLen: number, fallback: string, field: string, errors: string[]): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    if (value.length > maxLen) {
      errors.push(`${field}: 超过 ${maxLen} 字，已截断`);
      return value.slice(0, maxLen);
    }
    return value;
  }
  if (value !== undefined && value !== null) {
    errors.push(`${field}: 非字符串或为空，已降级`);
  }
  return fallback;
}

function asEnumArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T[],
  maxLen: number,
  field: string,
  errors: string[],
): T[] {
  if (!Array.isArray(value)) {
    if (value !== undefined && value !== null) errors.push(`${field}: 非数组，已降级`);
    return [...fallback];
  }
  const clean = value.filter((v): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v));
  const dropped = value.length - clean.length;
  if (dropped > 0) errors.push(`${field}: 丢弃 ${dropped} 个非法项`);
  if (clean.length === 0) return [...fallback];
  return clean.slice(0, maxLen);
}

function asStringArray(value: unknown, maxItems: number, maxLen: number, field: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    if (value !== undefined && value !== null) errors.push(`${field}: 非数组，已忽略`);
    return [];
  }
  const clean = value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.slice(0, maxLen));
  if (clean.length !== value.length) errors.push(`${field}: 丢弃 ${value.length - clean.length} 个非法项`);
  return clean.slice(0, maxItems);
}

/** 内部：构建降级后的 DNA 并收集所有降级记录 */
function repairDNA(input: unknown): { dna: WorldDNA; errors: string[] } | null {
  if (typeof input !== 'object' || input === null) return null;
  const raw = input as Record<string, unknown>;
  const errors: string[] = [];
  const base = createDefaultDNA();

  const dna: WorldDNA = {
    schemaVersion: 1,
    worldName: asString(raw.worldName, 24, base.worldName, 'worldName', errors),
    worldDescription: asString(raw.worldDescription, 120, base.worldDescription, 'worldDescription', errors),
    sourceTags: asStringArray(raw.sourceTags, 8, 16, 'sourceTags', errors),
    biome: asEnum(raw.biome, BIOMES, base.biome, 'biome', errors),
    palette: asEnum(raw.palette, PALETTES, base.palette, 'palette', errors),
    sky: asEnum(raw.sky, SKIES, base.sky, 'sky', errors),
    lighting: asEnum(raw.lighting, LIGHTINGS, base.lighting, 'lighting', errors),
    gravity: asNumber(raw.gravity, 0.2, 2.0, base.gravity, 'gravity', errors),
    weather: asEnum(raw.weather, WEATHERS, base.weather, 'weather', errors),
    terrain: asEnum(raw.terrain, TERRAINS, base.terrain, 'terrain', errors),
    structures: asEnumArray(raw.structures, STRUCTURES, base.structures, 6, 'structures', errors),
    hazards: asEnumArray(raw.hazards, HAZARDS, base.hazards, 4, 'hazards', errors),
    collectible: asEnum(raw.collectible, COLLECTIBLES, base.collectible, 'collectible', errors),
    collectibleCount: Math.round(asNumber(raw.collectibleCount, 8, 15, base.collectibleCount, 'collectibleCount', errors)),
    mission: asEnum(raw.mission, MISSIONS, base.mission, 'mission', errors),
    mutation: asEnum(raw.mutation, MUTATIONS, base.mutation, 'mutation', errors),
    mutationAtSeconds: Math.round(asNumber(raw.mutationAtSeconds, 20, 60, base.mutationAtSeconds, 'mutationAtSeconds', errors)),
    boss: asEnum(raw.boss, BOSSES, base.boss, 'boss', errors),
    difficulty: asEnum(raw.difficulty, DIFFICULTIES, base.difficulty, 'difficulty', errors),
    ending: asEnum(raw.ending, ENDINGS, base.ending, 'ending', errors),
    rarity: asEnum(raw.rarity, RARITIES, base.rarity, 'rarity', errors),
    shareText: asString(raw.shareText, 60, base.shareText, 'shareText', errors),
    seed: Math.round(asNumber(raw.seed, 0, Number.MAX_SAFE_INTEGER, base.seed, 'seed', errors)),
    worldCode: /^K3-WORLD-[A-Z0-9]{5}$/.test(String(raw.worldCode ?? ''))
      ? String(raw.worldCode)
      : base.worldCode,
  };
  return { dna, errors };
}

/**
 * 严格校验入口。
 * - 输入完全合法 → { ok: true, dna }
 * - 输入不是对象，或存在任何被降级/截断的字段 → { ok: false, errors }
 *   （调用方若想要"总能用"的 DNA，请用 sanitizeWorldDNA）
 */
export function validateWorldDNA(input: unknown): { ok: true; dna: WorldDNA } | { ok: false; errors: string[] } {
  const repaired = repairDNA(input);
  if (!repaired) return { ok: false, errors: ['input: 不是对象，无法解析为世界 DNA'] };
  if (repaired.errors.length > 0) return { ok: false, errors: repaired.errors };
  return { ok: true, dna: repaired.dna };
}

/** 宽松入口：永远返回可用 DNA，非法字段替换为安全默认并附降级记录 */
export function sanitizeWorldDNA(input: unknown): { dna: WorldDNA; errors: string[] } {
  const repaired = repairDNA(input);
  if (!repaired) {
    return { dna: createDefaultDNA(), errors: ['input: 不是对象，已使用默认世界 DNA'] };
  }
  return repaired;
}

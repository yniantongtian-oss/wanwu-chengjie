/**
 * generator.ts — 模拟 K3 世界导演
 * 同一输入永远生成同一世界（seed 派生自输入哈希）。
 */

import type { WorldDNA, Rarity } from './dna';
import {
  BIOMES,
  PALETTES,
  SKIES,
  LIGHTINGS,
  WEATHERS,
  TERRAINS,
  STRUCTURES,
  HAZARDS,
  COLLECTIBLES,
  MUTATIONS,
  BOSSES,
  DIFFICULTIES,
  ENDINGS,
  RARITIES,
  RARITY_WEIGHTS,
  createDefaultDNA,
} from './dna';
import { createRng, hashSeed } from './rng';

// ── 输入类型 ─────────────────────────────────────────

export interface GenerationInput {
  type: 'photo' | 'text' | 'emoji';
  text?: string;
  emojis?: string[];
  photoTags?: string[];
}

// ── 世界编号 ─────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的 I/O/0/1

/** 世界编号：K3-WORLD-XXXXX（5 位大写字母数字，由 seed 派生） */
export function worldCodeFromSeed(seed: number): string {
  const rng = createRng(seed ^ 0x9e3779b9);
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[rng.int(0, CODE_ALPHABET.length - 1)];
  }
  return `K3-WORLD-${code}`;
}

// ── 稀有度抽取（55 / 28 / 12 / 4 / 1） ────────────────

export function rollRarity(roll: number): Rarity {
  // roll ∈ [0, 100)
  let acc = 0;
  for (const rarity of RARITIES) {
    acc += RARITY_WEIGHTS[rarity];
    if (roll < acc) return rarity;
  }
  return 'common';
}

// ── 主题模板（关键词 → 世界变体） ──────────────────────

interface ThemeTemplate {
  keywords: string[];
  nameHints: string[];
  dna: Partial<WorldDNA>;
}

const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    keywords: ['键盘', '桌面', '台灯', '鼠标', '电脑', '显示器', '杯', '书桌', 'desk', 'keyboard', 'lamp'],
    nameHints: ['桌面文明', '键盘城邦', '台灯纪'],
    dna: {
      biome: 'mechanical_ruins',
      palette: 'cyan_amber',
      sky: 'dark_room_nebula',
      lighting: 'lamp_sun',
      terrain: 'keyboard_steps',
      structures: ['cup_tower', 'cable_vines'],
      hazards: ['data_bramble'],
      collectible: 'memory_shard',
      mutation: 'sun_blackout',
      boss: 'cursor_m01',
      weather: 'floating_dust',
    },
  },
  {
    keywords: ['雨', '雨伞', '路灯', '水洼', '夜', 'rain', 'umbrella'],
    nameHints: ['倒悬雨城', '逆雨巷', '听雨阁'],
    dna: {
      biome: 'inverted_city',
      palette: 'cyan_mono',
      sky: 'rain_void',
      lighting: 'backlit_rain',
      terrain: 'lamp_islands',
      structures: ['streetlamp_beacon', 'ring_gate'],
      hazards: ['static_field'],
      collectible: 'ink_drop',
      mutation: 'gravity_flip',
      boss: 'umbrella_warden',
      weather: 'reverse_rain',
    },
  },
  {
    keywords: ['猫', '喵', '猫爪', '呼噜', 'cat', '🐱', '🐈', '😺', '🐾'],
    nameHints: ['呼噜星港', '猫眼月湾', '肉垫浮岛'],
    dna: {
      biome: 'storybook_harbor',
      palette: 'violet_cyan',
      sky: 'twin_moons',
      lighting: 'moon_glow',
      terrain: 'paw_pad_isles',
      structures: ['whisker_bridge', 'glass_conservatory'],
      hazards: ['fading_floor'],
      collectible: 'purr_crystal',
      mutation: 'time_freeze',
      boss: 'static_howler',
      weather: 'petal_drift',
    },
  },
  {
    keywords: ['电路', '芯片', '主板', '晶振', '焊', 'circuit', 'chip', 'pcb'],
    nameHints: ['脉冲迷城', '晶振塔林', '走线迷宫'],
    dna: {
      biome: 'circuit_maze',
      palette: 'cyan_amber',
      sky: 'starless_grid',
      lighting: 'node_pulse',
      terrain: 'circuit_plateaus',
      structures: ['chip_spire', 'solder_node'],
      hazards: ['static_field', 'data_bramble'],
      collectible: 'volt_cell',
      mutation: 'pixelation',
      boss: 'null_shepherd',
      weather: 'static_sparks',
    },
  },
];

// ── 自由组合词池 ─────────────────────────────────────

const NAME_PREFIX = ['遗落的', '悬停的', '逆行的', '沉睡的', '失重的', '微光的', '第七', '无名', '折叠的', '缓慢的'];
const NAME_SUFFIX = ['档案馆', '观象台', '浮岛链', '温室', '回廊', '灯塔', '驿站', '深井', '剧场', '渡口'];

const DESCRIPTION_TEMPLATES = [
  '由 {src} 折叠而成的世界。这里的物理法则只服从一件事：它曾经被你注视过。',
  'K3 读完了 {src}，然后写下了这份法则。重力、光与天气，都是它的注脚。',
  '在 {src} 的褶皱里，藏着这座微缩文明。它有编号，也有遗言。',
  '{src} 没有变成一张图片。它变成了你可以走进去的 90 秒。',
];

const SHARE_TEMPLATES = [
  '我在「{name}」里活了 {sec} 秒，你呢？',
  '这是我的世界「{name}」，编号 {code}。来挑战我的成绩。',
  '「{name}」的出口只开 90 秒。敢进来吗？',
];

// ── 主生成函数 ───────────────────────────────────────

function collectInputText(input: GenerationInput): string {
  const parts: string[] = [];
  if (input.text) parts.push(input.text);
  if (input.emojis) parts.push(input.emojis.join(''));
  if (input.photoTags) parts.push(input.photoTags.join(','));
  parts.push(input.type);
  return parts.join('|') || 'empty';
}

function matchTheme(input: GenerationInput): ThemeTemplate | null {
  const haystack = [input.text ?? '', ...(input.emojis ?? []), ...(input.photoTags ?? [])]
    .join(' ')
    .toLowerCase();
  if (!haystack.trim()) return null;
  for (const theme of THEME_TEMPLATES) {
    if (theme.keywords.some((k) => haystack.includes(k.toLowerCase()))) return theme;
  }
  return null;
}

/**
 * 模拟 K3 生成世界 DNA。
 * 基于输入哈希决定 seed，全流程确定性：同一输入永远得到同一世界。
 */
export async function generateWorldDNA(input: GenerationInput): Promise<WorldDNA> {
  const sourceText = collectInputText(input);
  const seed = hashSeed(`K3::${sourceText}`);
  const rng = createRng(seed);

  const theme = matchTheme(input);

  const worldName = theme
    ? theme.nameHints[rng.int(0, theme.nameHints.length - 1)]
    : `${NAME_PREFIX[rng.int(0, NAME_PREFIX.length - 1)]}${NAME_SUFFIX[rng.int(0, NAME_SUFFIX.length - 1)]}`;

  const srcDesc =
    input.type === 'photo'
      ? (input.photoTags?.length ? `一张关于「${input.photoTags.slice(0, 3).join('、')}」的照片` : '一张照片')
      : input.type === 'emoji'
        ? `三个表情 ${input.emojis?.slice(0, 3).join(' ') ?? ''}`.trim()
        : `一句话「${(input.text ?? '').slice(0, 24)}」`;

  const rarity = rollRarity(rng.next() * 100);

  const gravity = Math.round(rng.range(0.6, 1.4) * 100) / 100;
  const collectibleCount = rng.int(8, 15);
  const mutationAtSeconds = rng.int(28, 42);

  const base = theme ? theme.dna : {};
  const pickFrom = <T,>(pool: readonly T[], fallback: T | undefined): T =>
    fallback !== undefined ? fallback : pool[rng.int(0, pool.length - 1)];

  const shareText = SHARE_TEMPLATES[rng.int(0, SHARE_TEMPLATES.length - 1)]
    .replace('{name}', worldName)
    .replace('{sec}', String(rng.int(60, 90)))
    .replace('{code}', worldCodeFromSeed(seed));

  const dna: WorldDNA = createDefaultDNA({
    worldName,
    worldDescription: DESCRIPTION_TEMPLATES[rng.int(0, DESCRIPTION_TEMPLATES.length - 1)].replace('{src}', srcDesc),
    sourceTags: [
      ...(input.photoTags ?? []).slice(0, 4),
      ...(input.emojis ?? []).slice(0, 3),
      ...(input.text ? [input.text.slice(0, 16)] : []),
    ].slice(0, 8),
    biome: pickFrom(BIOMES, base.biome),
    palette: pickFrom(PALETTES, base.palette),
    sky: pickFrom(SKIES, base.sky),
    lighting: pickFrom(LIGHTINGS, base.lighting),
    gravity,
    weather: pickFrom(WEATHERS, base.weather),
    terrain: pickFrom(TERRAINS, base.terrain),
    structures: base.structures ?? rng.shuffle(STRUCTURES).slice(0, 2 + rng.int(0, 2)),
    hazards: base.hazards ?? rng.shuffle(HAZARDS).slice(0, 1 + rng.int(0, 2)),
    collectible: pickFrom(COLLECTIBLES, base.collectible),
    collectibleCount,
    mission: rng.chance(0.7) ? 'collect_and_activate' : 'collect_and_escape',
    mutation: pickFrom(MUTATIONS, base.mutation),
    mutationAtSeconds,
    boss: pickFrom(BOSSES, base.boss),
    difficulty: DIFFICULTIES[rng.int(0, DIFFICULTIES.length - 1)],
    ending: ENDINGS[rng.int(0, ENDINGS.length - 1)],
    rarity,
    shareText,
    seed,
    worldCode: worldCodeFromSeed(seed),
  });

  // 模拟 K3 编排延迟（200–600ms，由 seed 决定，保持确定性体感）
  const delay = 200 + (seed % 400);
  await new Promise((resolve) => setTimeout(resolve, delay));

  return dna;
}

// ── 预制示例世界（与 info.md / home.md 一致） ─────────

export const SAMPLE_DESK: WorldDNA = createDefaultDNA({
  worldName: '遗失的桌面文明',
  worldDescription: '键盘塌陷成阶梯城市，台灯仍悬在天上扮演太阳。数据线是黑色的藤蔓，而那只鼠标——它已经不认识你了。',
  sourceTags: ['键盘', '台灯', '鼠标', '桌面'],
  biome: 'mechanical_ruins',
  palette: 'cyan_amber',
  sky: 'dark_room_nebula',
  lighting: 'lamp_sun',
  gravity: 0.82,
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
  ending: 'fading_light',
  rarity: 'epic',
  shareText: '35 秒后，这个世界的太阳会熄灭。你敢进来吗？',
  seed: 100001,
  worldCode: 'K3-WORLD-00001',
});

export const SAMPLE_RAIN: WorldDNA = createDefaultDNA({
  worldName: '倒悬雨城',
  worldDescription: '雨滴向上飞升，路灯成了浮岛，水洼是发光的电能湖。伞形守门人在等你交出影子。',
  sourceTags: ['雨夜', '路灯', '雨伞'],
  biome: 'inverted_city',
  palette: 'cyan_mono',
  sky: 'rain_void',
  lighting: 'backlit_rain',
  gravity: 0.44,
  weather: 'reverse_rain',
  terrain: 'lamp_islands',
  structures: ['streetlamp_beacon', 'ring_gate'],
  hazards: ['static_field'],
  collectible: 'ink_drop',
  collectibleCount: 10,
  mission: 'collect_and_activate',
  mutation: 'gravity_flip',
  mutationAtSeconds: 32,
  boss: 'umbrella_warden',
  difficulty: 'standard',
  ending: 'portal_escape',
  rarity: 'rare',
  shareText: '在我的雨城里，重力只是个建议。来试试？',
  seed: 100002,
  worldCode: 'K3-WORLD-00002',
});

export const SAMPLE_CAT: WorldDNA = createDefaultDNA({
  worldName: '呼噜星港',
  worldDescription: '猫眼化作双月悬于深空，胡须是发光的光桥。整座星港跟着呼噜声的节奏，一格一格地冻结。',
  sourceTags: ['猫', '双月', '呼噜'],
  biome: 'storybook_harbor',
  palette: 'violet_cyan',
  sky: 'twin_moons',
  lighting: 'moon_glow',
  gravity: 0.68,
  weather: 'petal_drift',
  terrain: 'paw_pad_isles',
  structures: ['whisker_bridge', 'glass_conservatory'],
  hazards: ['fading_floor'],
  collectible: 'purr_crystal',
  collectibleCount: 9,
  mission: 'collect_and_escape',
  mutation: 'time_freeze',
  mutationAtSeconds: 30,
  boss: 'static_howler',
  difficulty: 'gentle',
  ending: 'world_restored',
  rarity: 'legendary',
  shareText: '这座星港每 4 秒冻结一次。跟着呼噜声走，别掉队。',
  seed: 100003,
  worldCode: 'K3-WORLD-00003',
});

export const SAMPLE_CIRCUIT: WorldDNA = createDefaultDNA({
  worldName: '脉冲迷城',
  worldDescription: '电路板塌陷成俯瞰的迷城，芯片高塔耸立，焊点是琥珀色的能量节点。走线里流淌着青色的光。',
  sourceTags: ['电路板', '芯片', '焊点'],
  biome: 'circuit_maze',
  palette: 'cyan_amber',
  sky: 'starless_grid',
  lighting: 'node_pulse',
  gravity: 1.05,
  weather: 'static_sparks',
  terrain: 'circuit_plateaus',
  structures: ['chip_spire', 'solder_node'],
  hazards: ['static_field', 'data_bramble'],
  collectible: 'volt_cell',
  collectibleCount: 14,
  mission: 'collect_and_activate',
  mutation: 'pixelation',
  mutationAtSeconds: 38,
  boss: 'null_shepherd',
  difficulty: 'intense',
  ending: 'portal_escape',
  rarity: 'rare',
  shareText: '点亮 3 个能量节点，这座迷城才会放你走。',
  seed: 100004,
  worldCode: 'K3-WORLD-00004',
});

export const SAMPLE_WORLDS: WorldDNA[] = [SAMPLE_DESK, SAMPLE_RAIN, SAMPLE_CAT, SAMPLE_CIRCUIT];

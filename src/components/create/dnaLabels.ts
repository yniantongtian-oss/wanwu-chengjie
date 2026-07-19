/**
 * dnaLabels.ts — DNA 枚举字段的中文标签与程序化预览色板。
 * 引擎仅导出 BIOME_LABELS / RARITY_LABELS，其余字段的展示名在此补充。
 */

import type {
  Sky,
  Lighting,
  Weather,
  Terrain,
  Collectible,
  Mutation,
  Boss,
  Palette,
} from '@/engine';

export const SKY_LABELS: Record<Sky, string> = {
  dark_room_nebula: '暗室星云',
  rain_void: '雨之虚空',
  twin_moons: '双月悬空',
  starless_grid: '无星网格',
  aurora_dust: '极光尘埃',
  eclipse_ring: '蚀环',
};

export const LIGHTING_LABELS: Record<Lighting, string> = {
  lamp_sun: '台灯太阳',
  backlit_rain: '逆光雨',
  moon_glow: '月亮微光',
  node_pulse: '节点脉冲',
  ember_fall: '余烬坠落',
  portal_rim: '门缘光',
};

export const WEATHER_LABELS: Record<Weather, string> = {
  floating_dust: '浮尘',
  reverse_rain: '逆雨',
  time_snow: '时之雪',
  static_sparks: '静电火花',
  petal_drift: '花瓣漂流',
  clear: '晴朗',
};

export const TERRAIN_LABELS: Record<Terrain, string> = {
  keyboard_steps: '键盘阶梯',
  lamp_islands: '灯之浮岛',
  paw_pad_isles: '肉垫群岛',
  circuit_plateaus: '电路高原',
  crystal_dunes: '晶簇沙丘',
  book_terraces: '书页梯田',
};

export const COLLECTIBLE_LABELS: Record<Collectible, string> = {
  memory_shard: '记忆碎片',
  star_scale: '星鳞',
  purr_crystal: '呼噜水晶',
  volt_cell: '伏特电池',
  ink_drop: '墨滴',
  sun_seed: '太阳种子',
};

export const MUTATION_LABELS: Record<Mutation, string> = {
  gravity_flip: '重力反转',
  sun_blackout: '太阳熄灭',
  reverse_rain: '逆雨降临',
  pixelation: '像素化',
  faction_flip: '阵营倒转',
  time_freeze: '时间冻结',
  color_theft: '色彩失窃',
  mirror_world: '镜像世界',
};

export const BOSS_LABELS: Record<Boss, string> = {
  cursor_m01: '失控光标 M-01',
  umbrella_warden: '伞形守门人',
  static_howler: '静电嚎者',
  null_shepherd: '虚空牧者',
  ember_maw: '余烬之口',
  mirror_double: '镜像分身',
};

/** 程序化世界预览的双色组合（无缩略图世界的兜底视觉） */
export const PALETTE_COLORS: Record<Palette, [string, string]> = {
  cyan_amber: ['#57E6F0', '#F5B84C'],
  cyan_mono: ['#57E6F0', '#1B8FA3'],
  violet_cyan: ['#8B7CF6', '#57E6F0'],
  gold_cyan: ['#E8C876', '#57E6F0'],
  ember_red: ['#FF4D5E', '#F5B84C'],
  verdant_glow: ['#5EE0A0', '#57E6F0'],
};

/** 毫秒 → mm:ss */
export function formatTimeMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

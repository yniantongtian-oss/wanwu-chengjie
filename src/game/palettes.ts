/**
 * palettes.ts — DNA → 3D 视觉参数映射 + 中文标签
 */

import type { Boss, Collectible, Lighting, Mutation, Palette, Sky, Weather } from '@/engine';

export interface VisualPalette {
  /** 主光色（青系） */
  primary: string;
  /** 点缀光色（琥珀/金等） */
  accent: string;
  /** 地面基色 */
  ground: string;
  /** 地形侧面 */
  groundSide: string;
  fog: string;
  skyTop: string;
  skyBottom: string;
  shard: string;
}

export const PALETTE_MAP: Record<Palette, VisualPalette> = {
  cyan_amber: {
    primary: '#57E6F0',
    accent: '#F5B84C',
    ground: '#0D1622',
    groundSide: '#070C14',
    fog: '#05070D',
    skyTop: '#04060C',
    skyBottom: '#0A1420',
    shard: '#7CF3FF',
  },
  cyan_mono: {
    primary: '#57E6F0',
    accent: '#9BE8F2',
    ground: '#0B121C',
    groundSide: '#060A10',
    fog: '#04070C',
    skyTop: '#030509',
    skyBottom: '#0A121C',
    shard: '#6FE9F5',
  },
  violet_cyan: {
    primary: '#8B7CF6',
    accent: '#57E6F0',
    ground: '#100E1E',
    groundSide: '#090714',
    fog: '#07060F',
    skyTop: '#060412',
    skyBottom: '#14102A',
    shard: '#B7A8FF',
  },
  gold_cyan: {
    primary: '#E8C876',
    accent: '#57E6F0',
    ground: '#141109',
    groundSide: '#0B0906',
    fog: '#0A0806',
    skyTop: '#0A0805',
    skyBottom: '#1A1408',
    shard: '#FFE9A8',
  },
  ember_red: {
    primary: '#FF8A5C',
    accent: '#F5B84C',
    ground: '#180D0A',
    groundSide: '#0D0705',
    fog: '#0B0605',
    skyTop: '#0C0505',
    skyBottom: '#200D08',
    shard: '#FFB28A',
  },
  verdant_glow: {
    primary: '#5EE0A0',
    accent: '#57E6F0',
    ground: '#0A1512',
    groundSide: '#060D0A',
    fog: '#050B09',
    skyTop: '#040A08',
    skyBottom: '#0C1A15',
    shard: '#8FF5C4',
  },
};

export const SKY_LABELS: Record<Sky, string> = {
  dark_room_nebula: '暗室星云',
  rain_void: '倒悬雨',
  twin_moons: '双月',
  starless_grid: '静电虚空',
  aurora_dust: '极光尘',
  eclipse_ring: '蚀环',
};

export const MUTATION_LABELS: Record<Mutation, string> = {
  gravity_flip: '重力反转',
  sun_blackout: '太阳熄灭',
  reverse_rain: '逆雨倒灌',
  pixelation: '像素崩解',
  faction_flip: '立场倒转',
  time_freeze: '时间凝滞',
  color_theft: '色彩失窃',
  mirror_world: '镜面世界',
};

/** 突变后的任务提示文案 */
export const MUTATION_HINTS: Record<Mutation, string> = {
  gravity_flip: '重力已反转 · 跳跃方向颠倒',
  sun_blackout: '太阳熄灭了 · 只有任务物还在发光',
  reverse_rain: '雨开始向上坠落',
  pixelation: '世界的边缘正在像素化',
  faction_flip: '熟悉的规则倒转了',
  time_freeze: '时间凝滞了一瞬',
  color_theft: '世界的颜色被抽走了',
  mirror_world: '一切都成了镜像',
};

export const BOSS_LABELS: Record<Boss, string> = {
  cursor_m01: '光标 M-01',
  umbrella_warden: '伞下守门人',
  static_howler: '静电嚎兽',
  null_shepherd: '虚空牧者',
  ember_maw: '余烬之口',
  mirror_double: '镜像替身',
};

export const COLLECTIBLE_LABELS: Record<Collectible, string> = {
  memory_shard: '记忆碎片',
  star_scale: '星鳞',
  purr_crystal: '呼噜结晶',
  volt_cell: '伏特电芯',
  ink_drop: '墨滴',
  sun_seed: '太阳种子',
};

export const WEATHER_LABELS: Record<Weather, string> = {
  floating_dust: '浮尘',
  reverse_rain: '逆雨',
  time_snow: '时之雪',
  static_sparks: '静电火花',
  petal_drift: '花瓣漂流',
  clear: '晴朗',
};

export const LIGHTING_LABELS: Record<Lighting, string> = {
  lamp_sun: '台灯小太阳',
  backlit_rain: '逆光雨幕',
  moon_glow: '月光',
  node_pulse: '节点脉冲',
  ember_fall: '余烬坠落',
  portal_rim: '门边光',
};

/** 失败结算的"世界遗言"风格原因（不显示"你输了"） */
export const DEFEAT_REASONS = [
  '迷失于世界之中',
  '世界在你身后合上了门',
  '稳定度归零，世界轻轻坍缩',
  '最后一块碎片沉入雾中',
];

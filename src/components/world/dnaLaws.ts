/**
 * dnaLaws.ts — 把世界 DNA 字段翻译成人类可读的法则表（world.md S2）
 */

import type {
  Biome,
  Boss,
  Collectible,
  Difficulty,
  Ending,
  Hazard,
  Lighting,
  Mutation,
  Palette,
  Sky,
  Structure,
  Terrain,
  Weather,
  WorldDNA,
} from '@/engine';
import { BIOME_LABELS } from '@/engine';

export interface LawRow {
  key: string;
  /** 法则名（中文 + 英文字段） */
  name: string;
  /** mono 值 */
  value: string;
  /** 一句人话解释 */
  lore: string;
}

const SKY_LABELS: Record<Sky, string> = {
  dark_room_nebula: '暗室星云',
  rain_void: '雨之虚空',
  twin_moons: '双月',
  starless_grid: '无星网格',
  aurora_dust: '极光尘',
  eclipse_ring: '蚀环',
};

const SKY_LORE: Record<Sky, string> = {
  dark_room_nebula: '抬头是一间黑暗的屋子，和一片星云',
  rain_void: '天空是盛满雨的深渊，雨从那里向上坠落',
  twin_moons: '两轮月亮悬在深空，像一双注视你的眼睛',
  starless_grid: '没有星星，只有一张发光的网格铺开天幕',
  aurora_dust: '极光碎成尘埃，在夜空里缓慢飘落',
  eclipse_ring: '一枚被蚀的光环钉在天顶，边缘漏着微光',
};

const LIGHTING_LABELS: Record<Lighting, string> = {
  lamp_sun: '台灯太阳',
  backlit_rain: '逆光之雨',
  moon_glow: '月光浸染',
  node_pulse: '节点脉冲',
  ember_fall: '余烬落照',
  portal_rim: '门缘光',
};

const LIGHTING_LORE: Record<Lighting, string> = {
  lamp_sun: '一盏台灯是这个世界唯一的太阳',
  backlit_rain: '光从雨的背后打来，每滴雨都是轮廓',
  moon_glow: '冷色的月光浸透了一切边缘',
  node_pulse: '能量节点一明一灭，是世界的心跳',
  ember_fall: '余烬从高处落下，把影子烧出暖色',
  portal_rim: '光只聚集在门的边缘，指引出口',
};

const WEATHER_LABELS: Record<Weather, string> = {
  floating_dust: '浮尘',
  reverse_rain: '逆雨',
  time_snow: '时间雪',
  static_sparks: '静电火花',
  petal_drift: '花瓣漂流',
  clear: '晴朗',
};

const WEATHER_LORE: Record<Weather, string> = {
  floating_dust: '尘埃不落地，只是在空气里慢慢巡游',
  reverse_rain: '雨往天上走，别相信脚下的方向',
  time_snow: '雪落得极慢，每一片都冻着一小段时间',
  static_sparks: '空气里全是细小的放电声，头发会竖起来',
  petal_drift: '花瓣没有来处，也没有去处',
  clear: '难得晴朗，连风都屏住了呼吸',
};

const TERRAIN_LABELS: Record<Terrain, string> = {
  keyboard_steps: '键盘阶梯',
  lamp_islands: '台灯浮岛',
  paw_pad_isles: '肉垫浮岛',
  circuit_plateaus: '电路台地',
  crystal_dunes: '晶簇沙丘',
  book_terraces: '书页梯田',
};

const TERRAIN_LORE: Record<Terrain, string> = {
  keyboard_steps: '按键塌陷成阶梯，每一级都还记得指尖',
  lamp_islands: '一座座灯罩浮在虚空里，光是它们的岸',
  paw_pad_isles: '肉垫形状的小岛，踩上去是温的',
  circuit_plateaus: '电路板隆起成台地，走线在脚下发光',
  crystal_dunes: '晶体堆成沙丘，风一吹就响',
  book_terraces: '书页层层叠成梯田，字句长成了苔藓',
};

const STRUCTURE_LABELS: Record<Structure, string> = {
  cup_tower: '杯塔',
  cable_vines: '线缆藤蔓',
  streetlamp_beacon: '路灯信标',
  whisker_bridge: '胡须光桥',
  chip_spire: '芯片高塔',
  solder_node: '焊点节点',
  ink_obelisk: '墨水方尖碑',
  glass_conservatory: '玻璃温室',
  ring_gate: '环形门',
  anchor_shrine: '锚点神龛',
};

const HAZARD_LABELS: Record<Hazard, string> = {
  data_bramble: '数据荆棘',
  static_field: '静电力场',
  gravity_well: '重力井',
  lava_seam: '熔岩裂缝',
  mirror_trap: '镜面陷阱',
  fading_floor: '消逝地板',
};

const HAZARD_LORE: Record<Hazard, string> = {
  data_bramble: '缠住你的不是刺，是损坏的数据',
  static_field: '走进去，方向感会被静电洗乱',
  gravity_well: '那里的重力是个漩涡，靠近就会被拖住',
  lava_seam: '裂缝里流动着这个世界的怒火',
  mirror_trap: '镜子里的你，不一定跟你走',
  fading_floor: '地板正在消失，站住不动就会掉下去',
};

const COLLECTIBLE_LABELS: Record<Collectible, string> = {
  memory_shard: '记忆碎片',
  star_scale: '星之鳞',
  purr_crystal: '呼噜水晶',
  volt_cell: '伏特电芯',
  ink_drop: '墨滴',
  sun_seed: '太阳种子',
};

const MUTATION_LABELS: Record<Mutation, string> = {
  gravity_flip: '重力反转',
  sun_blackout: '太阳熄灭',
  reverse_rain: '逆向之雨',
  pixelation: '像素崩解',
  faction_flip: '阵营倒转',
  time_freeze: '时间冻结',
  color_theft: '色彩窃取',
  mirror_world: '镜像世界',
};

const MUTATION_LORE: Record<Mutation, (at: number) => string> = {
  gravity_flip: (at) => `第 ${at} 秒，上会变成下，下会变成上`,
  sun_blackout: (at) => `第 ${at} 秒，这个世界的太阳将会熄灭`,
  reverse_rain: (at) => `第 ${at} 秒，雨会调转方向，向天空坠落`,
  pixelation: (at) => `第 ${at} 秒，世界会碎成色块，再艰难重组`,
  faction_flip: (at) => `第 ${at} 秒，朋友与敌人将互换面孔`,
  time_freeze: (at) => `第 ${at} 秒，时间会开始一格一格地冻结`,
  color_theft: (at) => `第 ${at} 秒，颜色会被偷走一部分`,
  mirror_world: (at) => `第 ${at} 秒，世界会翻转到镜子的另一面`,
};

const BOSS_LABELS: Record<Boss, string> = {
  cursor_m01: '失控光标 M-01',
  umbrella_warden: '雨伞守卫',
  static_howler: '静电嚎者',
  null_shepherd: '虚空牧者',
  ember_maw: '余烬之口',
  mirror_double: '镜中重影',
};

const BOSS_LORE: Record<Boss, string> = {
  cursor_m01: '一枚失去主人的光标，后半程它会追猎你',
  umbrella_warden: '它撑着伞站在雨里，不允许任何人带走碎片',
  static_howler: '静电聚成的嚎叫，靠近它的信号都会失真',
  null_shepherd: '它放牧着虚空，把迷路的人引向更深处',
  ember_maw: '一张烧红的嘴，想把世界最后的光吞掉',
  mirror_double: '另一个你正在赶来，它先到你就算输',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  gentle: '温和',
  standard: '标准',
  intense: '激烈',
};

const DIFFICULTY_LORE: Record<Difficulty, string> = {
  gentle: '适合第一次进入世界的人，规则对你很宽容',
  standard: '标准的一局，紧张，但刚刚好',
  intense: '规则更凶，Boss 更快，别眨眼',
};

const ENDING_LABELS: Record<Ending, string> = {
  portal_escape: '穿越传送门',
  world_restored: '世界被修复',
  fading_light: '微光渐熄',
};

const ENDING_LORE: Record<Ending, string> = {
  portal_escape: '收齐碎片，穿过那扇门，就算赢',
  world_restored: '你的离开，会让这个世界重新亮起来',
  fading_light: '光在变淡，带着碎片离开，是它最好的结局',
};

const PALETTE_LABELS: Record<Palette, string> = {
  cyan_amber: '青蓝 × 琥珀',
  cyan_mono: '青蓝单色',
  violet_cyan: '紫 × 青',
  gold_cyan: '金 × 青',
  ember_red: '余烬红',
  verdant_glow: '翠绿辉光',
};

const BIOME_LORE: Record<Biome, string> = {
  mechanical_ruins: '机器的残骸，长成了文明的骨骼',
  inverted_city: '整座城市倒挂在天空上',
  storybook_harbor: '像从童话书里掉出来的港口',
  circuit_maze: '电流在城市的走线里流淌',
  crystal_wilds: '晶体在原野上缓慢生长',
  floating_archive: '记忆被装订成册，悬浮在空中',
  tide_observatory: '观测一片不存在之海的潮汐',
  ember_forge: '火还没熄，只是睡着了',
};

function gravityLore(g: number): string {
  if (g < 0.7) return '跳得很高，落得很慢，像踩在梦里';
  if (g < 1) return '跳得更高，落得更慢';
  if (g === 1) return '和现实世界一样，不多不少';
  if (g <= 1.3) return '身体更重，坠落更快，起跳要果断';
  return '每一步都像被世界拽住，小心落点';
}

/** 构建完整法则表（顺序即展示顺序） */
export function buildLawRows(dna: WorldDNA): LawRow[] {
  return [
    { key: 'biome', name: '生态 biome', value: dna.biome, lore: `${BIOME_LABELS[dna.biome]} —— ${BIOME_LORE[dna.biome]}` },
    { key: 'gravity', name: '重力 gravity', value: dna.gravity.toFixed(2), lore: gravityLore(dna.gravity) },
    { key: 'sky', name: '天空 sky', value: dna.sky, lore: SKY_LORE[dna.sky] },
    {
      key: 'lighting',
      name: '光照 lighting',
      value: dna.lighting,
      lore: `${LIGHTING_LABELS[dna.lighting]} —— ${LIGHTING_LORE[dna.lighting]}`,
    },
    { key: 'palette', name: '色谱 palette', value: dna.palette, lore: `世界的配色基因：${PALETTE_LABELS[dna.palette]}` },
    { key: 'weather', name: '天气 weather', value: dna.weather, lore: WEATHER_LORE[dna.weather] },
    { key: 'terrain', name: '地形 terrain', value: dna.terrain, lore: TERRAIN_LORE[dna.terrain] },
    {
      key: 'structures',
      name: '地标 structures',
      value: dna.structures.join(' + '),
      lore: `世界的骨骼：${dna.structures.map((s) => STRUCTURE_LABELS[s]).join('、')}`,
    },
    {
      key: 'hazards',
      name: '危险 hazards',
      value: dna.hazards.join(' + '),
      lore: `${dna.hazards.map((h) => HAZARD_LABELS[h]).join('、')} —— ${dna.hazards.map((h) => HAZARD_LORE[h]).join('；')}`,
    },
    {
      key: 'mutation',
      name: '突变 mutation',
      value: `${dna.mutation} @ ${dna.mutationAtSeconds}s`,
      lore: MUTATION_LORE[dna.mutation](dna.mutationAtSeconds),
    },
    { key: 'boss', name: 'Boss', value: dna.boss, lore: BOSS_LORE[dna.boss] },
    {
      key: 'collectible',
      name: '收集 collectible',
      value: `${dna.collectible} × ${dna.collectibleCount}`,
      lore:
        dna.mission === 'collect_and_activate'
          ? `${dna.collectibleCount} 枚${COLLECTIBLE_LABELS[dna.collectible]}，收齐才能激活出口`
          : `${dna.collectibleCount} 枚${COLLECTIBLE_LABELS[dna.collectible]}，收齐之后，逃出去`,
    },
    { key: 'difficulty', name: '难度 difficulty', value: dna.difficulty, lore: DIFFICULTY_LORE[dna.difficulty] },
    { key: 'ending', name: '结局 ending', value: dna.ending, lore: ENDING_LORE[dna.ending] },
  ];
}

/** 供卡片等场景单独取突变文案 */
export function mutationLabel(m: Mutation): string {
  return MUTATION_LABELS[m];
}

export { SKY_LABELS, WEATHER_LABELS, TERRAIN_LABELS, BOSS_LABELS, MUTATION_LABELS, COLLECTIBLE_LABELS, DIFFICULTY_LABELS, ENDING_LABELS };

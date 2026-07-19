/**
 * level.ts — 由世界 DNA 种子驱动的程序化关卡生成（纯函数，确定性）
 * 三套地形骨架：steps 阶梯城市 / isles 浮岛 / canyon 峡谷台地
 * groundHeight 供角色运动学控制器做地面检测。
 */

import type { Hazard, Structure, Terrain, WorldDNA } from '@/engine';
import { createRng } from '@/engine';

export type TerrainSkeleton = 'steps' | 'isles' | 'canyon';

export interface Platform {
  x: number;
  z: number;
  w: number;
  d: number;
  topY: number;
  h: number;
  kind: 'platform' | 'obstacle';
}

export interface Isle {
  x: number;
  z: number;
  r: number;
  topY: number;
}

export interface ShardSpot {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface NodeSpot {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface StructureSpot {
  kind: Structure | 'wall_segment' | 'floating_platform';
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  seed: number;
}

export interface HazardSpot {
  kind: Hazard;
  x: number;
  z: number;
  r: number;
}

export interface LevelData {
  skeleton: TerrainSkeleton;
  /** 世界半径（可活动范围） */
  radius: number;
  spawn: { x: number; y: number; z: number };
  portal: { x: number; y: number; z: number };
  bossSpawn: { x: number; y: number; z: number };
  /** 重力反转后玩家落到的"天空地面"高度 */
  skyFloorY: number;
  shards: ShardSpot[];
  nodes: NodeSpot[];
  structures: StructureSpot[];
  hazards: HazardSpot[];
  platforms: Platform[];
  isles: Isle[];
  /** 主路径：给定 z 返回路径中心 x（S 曲线） */
  pathX: (z: number) => number;
  /** 地表 + 平台顶面中，不超过 maxY 的最高面；无则 -1000（虚空） */
  groundHeight: (x: number, z: number, maxY: number) => number;
  /** 纯地形高度（不含平台），用于摆放物件与渲染 */
  terrainHeight: (x: number, z: number) => number;
  /**
   * 水平阻挡检测：在 (feetY+stepUp, feetY+headroom] 区间内存在表面则为墙。
   * 高于头顶的表面（悬浮平台下方）可通过。
   */
  isBlocked: (x: number, z: number, feetY: number) => boolean;
}

export const VOID_Y = -1000;

// ── 确定性 2D 值噪声 ──────────────────────────────────

function makeNoise2D(seed: number): (x: number, z: number) => number {
  const s = seed | 0;
  const hash = (ix: number, iz: number): number => {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(s, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = smooth(x - ix);
    const fz = smooth(z - iz);
    const a = hash(ix, iz);
    const b = hash(ix + 1, iz);
    const c = hash(ix, iz + 1);
    const d = hash(ix + 1, iz + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  };
}

function skeletonOf(terrain: Terrain): TerrainSkeleton {
  switch (terrain) {
    case 'keyboard_steps':
    case 'book_terraces':
      return 'steps';
    case 'lamp_islands':
    case 'paw_pad_isles':
      return 'isles';
    case 'circuit_plateaus':
    case 'crystal_dunes':
      return 'canyon';
  }
}

const PATH_AMPLITUDE = 6;
const PATH_FREQ = 0.08;

export function generateLevel(dna: WorldDNA): LevelData {
  const rng = createRng(dna.seed ^ 0x5f3759df);
  const noise = makeNoise2D(dna.seed);
  const skeleton = skeletonOf(dna.terrain);
  const radius = 52;
  const skyFloorY = 24;

  const pathX = (z: number) => Math.sin(z * PATH_FREQ) * PATH_AMPLITUDE;
  const corridorWeight = (x: number, z: number) => {
    const dist = Math.abs(x - pathX(z));
    return Math.max(0, 1 - dist / 7);
  };

  // ── 地形高度 ───────────────────────────────────────
  let terrainHeight: (x: number, z: number) => number;
  const isles: Isle[] = [];

  if (skeleton === 'steps') {
    terrainHeight = (x, z) => {
      const raw = noise(x * 0.055 + 31, z * 0.055 + 7) * 4.4;
      const w = corridorWeight(x, z);
      const mixed = raw * (1 - w) + 1.1 * w;
      return Math.round(mixed / 1.1) * 1.1;
    };
  } else if (skeleton === 'canyon') {
    terrainHeight = (x, z) => {
      const n = noise(x * 0.05 + 3, z * 0.05 + 41);
      let h = 0;
      if (n > 0.56) h = Math.min(4, Math.ceil((n - 0.56) * 14)) * 1.2;
      else if (n < 0.3) h = -1.4;
      const w = corridorWeight(x, z);
      return h * (1 - w);
    };
  } else {
    // isles：主链 + 侧岛
    const chainTop = (i: number) => 0.4 + Math.round(noise(i * 3.7, 91) * 3) * 1.1;
    for (let i = 0; i < 10; i++) {
      const z = 6 - i * 5.4;
      isles.push({
        x: pathX(z) + rng.range(-1.6, 1.6),
        z,
        r: rng.range(3.4, 4.6),
        topY: chainTop(i),
      });
    }
    for (let i = 0; i < 12; i++) {
      const z = rng.range(-46, 10);
      const side = rng.next() < 0.5 ? -1 : 1;
      isles.push({
        x: pathX(z) + side * rng.range(7, 16),
        z,
        r: rng.range(2.4, 3.6),
        topY: 0.4 + Math.round(rng.range(0, 4)) * 1.1,
      });
    }
    terrainHeight = (x, z) => {
      let best = VOID_Y;
      for (const isle of isles) {
        const dx = x - isle.x;
        const dz = z - isle.z;
        if (dx * dx + dz * dz <= isle.r * isle.r && isle.topY > best) best = isle.topY;
      }
      return best;
    };
  }

  // ── 平台与障碍 ─────────────────────────────────────
  const platforms: Platform[] = [];
  // 悬浮平台（部分作为收集路线的高点）
  for (let i = 0; i < 5; i++) {
    const z = -6 - i * 8 + rng.range(-2, 2);
    platforms.push({
      x: pathX(z) + (rng.next() < 0.5 ? -1 : 1) * rng.range(3.5, 6.5),
      z,
      w: rng.range(2.6, 3.6),
      d: rng.range(2.6, 3.6),
      topY: rng.range(2.6, 5.4),
      h: 0.5,
      kind: 'platform',
    });
  }
  // 教学矮障碍（开局走廊两处）
  for (const z of [0.5, -9.5]) {
    platforms.push({ x: pathX(z), z, w: 3.6, h: 0.55, d: 0.6, topY: 0, kind: 'obstacle' });
  }
  // 障碍物 topY 需要贴地
  for (const p of platforms) {
    if (p.kind === 'obstacle') {
      const g = terrainHeight(p.x, p.z);
      p.topY = (g === VOID_Y ? 0.4 : g) + 0.55;
    }
  }

  const groundHeight = (x: number, z: number, maxY: number): number => {
    let best = terrainHeight(x, z);
    if (best > maxY) best = VOID_Y;
    for (const p of platforms) {
      if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2) {
        if (p.topY <= maxY && p.topY > best) best = p.topY;
      }
    }
    return best;
  };

  /** 放置辅助：找一个可行走点（isles 骨架下拒绝虚空） */
  const walkableY = (x: number, z: number): number => groundHeight(x, z, 500);

  const STEP_UP = 0.62;
  const HEADROOM = 1.5;
  const isBlocked = (x: number, z: number, feetY: number): boolean => {
    const t = terrainHeight(x, z);
    if (t > feetY + STEP_UP && t <= feetY + HEADROOM) return true;
    for (const p of platforms) {
      if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2) {
        if (p.topY > feetY + STEP_UP && p.topY <= feetY + HEADROOM) return true;
      }
    }
    return false;
  };

  // ── 出生点 / 传送门 / Boss ─────────────────────────
  const spawnGround = walkableY(pathX(8), 8);
  const spawn = { x: pathX(8), y: (spawnGround === VOID_Y ? 0.4 : spawnGround) + 1.2, z: 8 };
  const portalGround = walkableY(pathX(-44), -44);
  const portal = { x: pathX(-44), y: portalGround === VOID_Y ? 0.4 : portalGround, z: -44 };
  // Boss 出生点需在可站立区域上空（isles 主链末端在 z≈-42.6，-48 是虚空）
  const bossGround = walkableY(pathX(-42.5), -42.5);
  const bossSpawn = { x: pathX(-42.5), y: (bossGround === VOID_Y ? portal.y : bossGround) + 3, z: -42.5 };

  // ── 碎片（沿路径分布，高度贴地） ───────────────────
  const shards: ShardSpot[] = [];
  const count = Math.max(8, Math.min(15, Math.round(dna.collectibleCount)));
  if (skeleton === 'isles') {
    // 全部放在主链岛上（侧岛可能跳不过去，避免软锁）
    const chain = isles.slice(0, 10);
    for (let i = 0; i < count; i++) {
      const isle = chain[i % chain.length];
      const x = isle.x + rng.range(-1.2, 1.2);
      const z = isle.z + rng.range(-1.2, 1.2);
      // 抖动可能落到更高的相邻岛上：以实际地面为准，避免埋进岛体
      const g = walkableY(x, z);
      shards.push({
        id: i,
        x,
        y: Math.max(isle.topY, g === VOID_Y ? isle.topY : g) + 1.1,
        z,
      });
    }
  } else {
    for (let i = 0; i < count; i++) {
      const z = 3 - (i / (count - 1)) * 42 + rng.range(-1.2, 1.2);
      const x = pathX(z) + rng.range(-2.4, 2.4);
      const g = walkableY(x, z);
      shards.push({ id: i, x, y: (g === VOID_Y ? 0 : g) + 1.1, z });
    }
  }

  // ── 能量节点（3 个，分布在场地中段两侧） ───────────
  const nodes: NodeSpot[] = [];
  const nodeZs = [-13, -24, -35];
  for (let i = 0; i < 3; i++) {
    const z = nodeZs[i] + rng.range(-1.5, 1.5);
    const side = i % 2 === 0 ? -1 : 1;
    let x = pathX(z) + side * rng.range(5.5, 9);
    let g = walkableY(x, z);
    if (g === VOID_Y) {
      // isles：为节点造一座岛
      const isle: Isle = { x, z, r: 2.8, topY: 0.4 + i * 1.1 };
      isles.push(isle);
      g = isle.topY;
      x = isle.x;
    }
    nodes.push({ id: i, x, y: g, z });
  }

  // ── 建筑模块（12 种变体循环摆放） ──────────────────
  const MODULE_CYCLE: Array<Structure | 'wall_segment' | 'floating_platform'> = [
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
    'wall_segment',
    'floating_platform',
  ];
  const preferred: Structure[] = dna.structures.length > 0 ? dna.structures : ['cup_tower', 'ring_gate'];
  const structures: StructureSpot[] = [];
  for (let i = 0; i < 18; i++) {
    const kind = i < preferred.length ? preferred[i] : MODULE_CYCLE[(dna.seed + i) % MODULE_CYCLE.length];
    const z = rng.range(-48, 12);
    const side = rng.next() < 0.5 ? -1 : 1;
    // 1/3 建筑靠近主路径边缘，沿途有景；其余拉开纵深
    const nearPath = i % 3 === 0;
    const x = pathX(z) + side * (nearPath ? rng.range(5.5, 9) : rng.range(8, 26));
    const g = terrainHeight(x, z);
    structures.push({
      kind,
      x,
      y: g === VOID_Y ? rng.range(2, 7) : g,
      z,
      rotY: rng.range(0, Math.PI * 2),
      scale: rng.range(0.85, 1.5),
      seed: Math.floor(rng.range(0, 1e9)),
    });
  }

  // ── 危险区 ─────────────────────────────────────────
  const hazards: HazardSpot[] = dna.hazards.slice(0, 4).map((kind, i) => {
    const z = -8 - i * 9 + rng.range(-2, 2);
    const side = i % 2 === 0 ? 1 : -1;
    return { kind, x: pathX(z) + side * rng.range(3.4, 6), z, r: 2.4 };
  });

  return {
    skeleton,
    radius,
    spawn,
    portal,
    bossSpawn,
    skyFloorY,
    shards,
    nodes,
    structures,
    hazards,
    platforms,
    isles,
    pathX,
    groundHeight,
    terrainHeight,
    isBlocked,
  };
}

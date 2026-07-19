/* eslint-disable @typescript-eslint/no-explicit-any */
// 关卡生成冒烟测试（esbuild 打包后由 node 运行）
// 校验：全部地形 × 多种子下，出生点/出口/碎片/节点可达，数值无 NaN。
import { createDefaultDNA, TERRAINS } from '../src/engine';
import type { WorldDNA } from '../src/engine';
import { generateLevel, VOID_Y } from '../src/game/level';

let checked = 0;
let failed = 0;

function fail(msg: string) {
  failed++;
  console.error('FAIL:', msg);
}

function finite(v: number, name: string, ctx: string) {
  if (!Number.isFinite(v)) fail(`${ctx}: ${name} 非有限数 (${v})`);
}

function walkable(level: ReturnType<typeof generateLevel>, x: number, z: number, ctx: string) {
  const g = level.groundHeight(x, z, 500);
  if (g === VOID_Y) fail(`${ctx}: (${x.toFixed(1)}, ${z.toFixed(1)}) 不可站立`);
  return g;
}

async function main() {
  for (const terrain of TERRAINS) {
    for (let seed = 1; seed <= 24; seed++) {
      const dna: WorldDNA = createDefaultDNA({ seed: seed * 7919 + 13, terrain });
      const level = generateLevel(dna);
      const ctx = `${terrain}/seed${dna.seed}`;
      checked++;

      // 出生点 / 出口 / Boss
      walkable(level, level.spawn.x, level.spawn.z, `${ctx} spawn`);
      walkable(level, level.portal.x, level.portal.z, `${ctx} portal`);
      walkable(level, level.bossSpawn.x, level.bossSpawn.z, `${ctx} bossSpawn`);

      // 碎片可达：下方 1.4m 内有站立面
      level.shards.forEach((s, i) => {
        finite(s.x, 'shard.x', ctx);
        finite(s.y, 'shard.y', ctx);
        finite(s.z, 'shard.z', ctx);
        const g = level.groundHeight(s.x, s.z, 500);
        if (g === VOID_Y || s.y - g > 2.2 || s.y - g < 0.2) {
          fail(`${ctx} shard#${i}: 高度差 ${(s.y - g).toFixed(2)}，可能不可达`);
        }
      });

      // 节点可达
      level.nodes.forEach((n, i) => {
        const g = walkable(level, n.x, n.z, `${ctx} node#${i}`);
        if (Math.abs(n.y - g) > 1) fail(`${ctx} node#${i}: 节点悬空 ${(n.y - g).toFixed(2)}`);
      });

      // 建筑数值合法
      level.structures.forEach((s, i) => {
        finite(s.x, 'structure.x', ctx);
        finite(s.y, 'structure.y', ctx);
        finite(s.z, 'structure.z', ctx);
        finite(s.rotY, 'structure.rotY', ctx);
        finite(s.scale, 'structure.scale', ctx);
        if (s.scale <= 0.2 || s.scale > 3) fail(`${ctx} structure#${i}: 缩放异常 ${s.scale}`);
      });

      // 危险区不在出生点上
      level.hazards.forEach((h, i) => {
        const d = Math.hypot(h.x - level.spawn.x, h.z - level.spawn.z);
        if (d < h.r + 1.5) fail(`${ctx} hazard#${i}: 压在出生点上`);
      });

      // 主路径连续性：沿 z 采样应有地面（isles 主链）
      for (let z = 8; z >= -44; z -= 4) {
        const x = level.pathX(z);
        const g = level.groundHeight(x, z, 500);
        if (g === VOID_Y) fail(`${ctx}: 主路径 z=${z} 断裂`);
      }
    }
  }
  console.log(`checked ${checked} 个关卡`);
  if (failed === 0) console.log('ALL LEVEL CHECKS PASSED');
  else {
    console.error(`${failed} 项失败`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

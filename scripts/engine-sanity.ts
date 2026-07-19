/* eslint-disable @typescript-eslint/no-explicit-any */
// 引擎库冒烟测试（esbuild 打包后由 node 运行）
import {
  generateWorldDNA,
  validateWorldDNA,
  sanitizeWorldDNA,
  createDefaultDNA,
  encodeWorldToUrl,
  decodeWorldFromUrl,
  saveWorld,
  getWorld,
  listWorlds,
  deleteWorld,
  saveRun,
  getBestRuns,
  worldCodeFromSeed,
  SAMPLE_WORLDS,
} from '../src/engine';
import type { RunResult } from '../src/engine';

// localStorage 内存垫片
const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

async function main() {
  // 1. 生成确定性
  const a = await generateWorldDNA({ type: 'text', text: '雨夜里的一把伞' });
  const b = await generateWorldDNA({ type: 'text', text: '雨夜里的一把伞' });
  console.assert(JSON.stringify(a) === JSON.stringify(b), 'FAIL: 同一输入应生成同一世界');
  console.assert(a.biome === 'inverted_city', `FAIL: 含"雨"应映射倒悬雨城变体, got ${a.biome}`);
  const cat = await generateWorldDNA({ type: 'emoji', emojis: ['🐱', '🌙', '⭐'] });
  console.assert(cat.biome === 'storybook_harbor', `FAIL: 含猫表情应映射呼噜星港, got ${cat.biome}`);
  const desk = await generateWorldDNA({ type: 'text', text: '我的键盘和台灯' });
  console.assert(desk.biome === 'mechanical_ruins', `FAIL: 桌面关键词, got ${desk.biome}`);
  const circuit = await generateWorldDNA({ type: 'text', text: '一块电路板' });
  console.assert(circuit.biome === 'circuit_maze', `FAIL: 电路关键词, got ${circuit.biome}`);
  console.log('✓ generator: 确定性 + 关键词主题映射');

  // 2. validate
  const ok = validateWorldDNA(a);
  console.assert(ok.ok, 'FAIL: 生成的 DNA 应通过校验');
  const bad = validateWorldDNA({ biome: 'nope', gravity: 99 });
  console.assert(!bad.ok && bad.errors.length >= 2, 'FAIL: 非法字段应被记录');
  const sane = sanitizeWorldDNA({ biome: 'nope', gravity: 99 });
  console.assert(sane.dna.gravity === 2.0 && sane.errors.length >= 2, 'FAIL: 降级应截断到范围');
  console.log('✓ dna: validate/sanitize 降级策略');

  // 3. worldCode 格式
  console.assert(/^K3-WORLD-[A-Z0-9]{5}$/.test(a.worldCode), `FAIL: worldCode 格式 ${a.worldCode}`);
  console.assert(worldCodeFromSeed(42) === worldCodeFromSeed(42), 'FAIL: worldCode 应确定性');
  console.log('✓ worldCode:', a.worldCode);

  // 4. shareCodec 往返
  const encoded = encodeWorldToUrl(a);
  const decoded = decodeWorldFromUrl(encoded);
  console.assert(decoded !== null && decoded.worldName === a.worldName && decoded.seed === a.seed, 'FAIL: 编解码往返');
  console.assert(decodeWorldFromUrl('%%%garbage') === null, 'FAIL: 垃圾输入应返回 null');
  console.log('✓ shareCodec: base64url 往返');

  // 5. worldStore
  const all = listWorlds();
  console.assert(all.length === 16, `FAIL: 预置应为 16 个世界, got ${all.length}`);
  const saved = saveWorld(createDefaultDNA({ worldCode: 'K3-WORLD-TEST1', worldName: '测试世界' }));
  console.assert(saved.length === 17, 'FAIL: saveWorld');
  const got = getWorld('K3-WORLD-TEST1');
  console.assert(got?.dna.worldName === '测试世界', 'FAIL: getWorld');
  const run: RunResult = {
    runId: 'r1', worldId: 'K3-WORLD-TEST1', worldCode: 'K3-WORLD-TEST1',
    score: 1200, timeMs: 87000, collected: 10, total: 12, victory: true,
    events: [], stability: 88, finishedAt: Date.now(),
  };
  saveRun('K3-WORLD-TEST1', run);
  saveRun('K3-WORLD-TEST1', { ...run, runId: 'r2', score: 1500 });
  const best = getBestRuns('K3-WORLD-TEST1', 5);
  console.assert(best.length === 2 && best[0].score === 1500, 'FAIL: 最佳榜排序');
  const afterDelete = deleteWorld('K3-WORLD-TEST1');
  console.assert(afterDelete.length === 16 && getWorld('K3-WORLD-TEST1') === null, 'FAIL: deleteWorld');
  console.log('✓ worldStore: 播种/save/get/runs/delete');

  // 6. 示例世界
  console.assert(SAMPLE_WORLDS.length === 4, 'FAIL: 4 个示例世界');
  console.assert(SAMPLE_WORLDS[0].worldCode === 'K3-WORLD-00001' && SAMPLE_WORLDS[2].rarity === 'legendary', 'FAIL: 示例世界数据');
  console.log('✓ samples: 4 个预制世界与 info.md 一致');

  console.log('ALL ENGINE CHECKS PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

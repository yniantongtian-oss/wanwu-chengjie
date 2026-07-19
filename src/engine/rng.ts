/**
 * rng.ts — 种子随机数（确定性，同一种子同一序列）
 * mulberry32 + hashSeed
 */

/** FNV-1a 风格字符串哈希 → 32 位无符号整数种子 */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 额外搅拌，避免短字符串聚集
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}

export type Rng = {
  /** [0, 1) */
  next(): number;
  /** [min, max) 浮点 */
  range(min: number, max: number): number;
  /** [min, max] 整数 */
  int(min: number, max: number): number;
  /** 从数组中挑一个 */
  pick<T>(arr: readonly T[]): T;
  /** 洗牌（返回新数组） */
  shuffle<T>(arr: readonly T[]): T[];
  /** 概率命中 */
  chance(p: number): boolean;
};

/** mulberry32 伪随机数生成器 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number): number => min + next() * (max - min);
  const int = (min: number, max: number): number => Math.floor(range(min, max + 1));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const chance = (p: number): boolean => next() < p;
  return { next, range, int, pick, shuffle, chance };
}

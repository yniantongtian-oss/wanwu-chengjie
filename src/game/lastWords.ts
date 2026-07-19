/**
 * lastWords.ts — 世界遗言存取 helper
 * key: `k3:lastWords:{worldId}`，值为字符串数组（新→旧，最多 20 条，每条 ≤10 字）。
 * 档案页 (/world/:worldId) 读取同一 key 展示。
 */

const PREFIX = 'k3:lastWords:';
const MAX_ITEMS = 20;
export const LAST_WORD_MAX_LEN = 10;

export const PRESET_LAST_WORDS = [
  '别回头。',
  '雨往上走。',
  '替我看看出口。',
  '碎片会记得我。',
  '下次，更快。',
  '灯灭了，路还在。',
];

function key(worldId: string): string {
  return `${PREFIX}${worldId}`;
}

export function getLastWords(worldId: string): string[] {
  try {
    const raw = window.localStorage.getItem(key(worldId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((w): w is string => typeof w === 'string').slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addLastWord(worldId: string, word: string): string[] {
  const clean = word.trim().slice(0, LAST_WORD_MAX_LEN);
  if (!clean) return getLastWords(worldId);
  try {
    const list = [clean, ...getLastWords(worldId).filter((w) => w !== clean)].slice(0, MAX_ITEMS);
    window.localStorage.setItem(key(worldId), JSON.stringify(list));
    return list;
  } catch {
    return [clean];
  }
}

/**
 * lastWords.ts — 世界遗言读取（跨页面契约）
 * 游戏页把遗言写入 localStorage: k3:lastWords:{worldId}（JSON 数组）。
 * 数组元素的历史形态不确定（字符串或对象），这里做防御式归一化。
 */

export interface LastWordEntry {
  /** 遗言正文（≤10 字约定，读取端做宽松截断） */
  text: string;
  /** 署名，如 VISITOR-2B9C */
  author?: string;
  /** 消失坐标 */
  x?: number;
  y?: number;
  /** 留下时间（epoch ms） */
  at?: number;
}

export const LAST_WORDS_PREFIX = 'k3:lastWords:';

function asStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumberField(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeEntry(item: unknown): LastWordEntry | null {
  if (typeof item === 'string') {
    const text = item.trim();
    return text ? { text: text.slice(0, 40) } : null;
  }
  if (typeof item === 'object' && item !== null) {
    const raw = item as Record<string, unknown>;
    // 兼容游戏页可能使用的字段名
    const text =
      asStringField(raw.text) ??
      asStringField(raw.words) ??
      asStringField(raw.message) ??
      asStringField(raw.word) ??
      asStringField(raw.content);
    if (!text) return null;
    const author =
      asStringField(raw.author) ?? asStringField(raw.visitor) ?? asStringField(raw.visitorId) ?? asStringField(raw.name);
    const at = asNumberField(raw.at) ?? asNumberField(raw.time) ?? asNumberField(raw.createdAt);
    return {
      text: text.slice(0, 40),
      author,
      x: asNumberField(raw.x),
      y: asNumberField(raw.y),
      at,
    };
  }
  return null;
}

/** 读取某世界的遗言列表（新的在前）。无存储 / 解析失败时返回空数组。 */
export function readLastWords(worldId: string): LastWordEntry[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(`${LAST_WORDS_PREFIX}${worldId}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries = parsed
      .map(normalizeEntry)
      .filter((e): e is LastWordEntry => e !== null);
    // 有时间的按时间倒序，无时间的保持原顺序（假定写入方追加在尾部 → 反转后新的在前）
    if (entries.length > 0 && entries.every((e) => typeof e.at === 'number')) {
      entries.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
    } else {
      entries.reverse();
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * inputTypes.ts — 创造页输入载荷与识别标签推导。
 * 标签仅作本地"模拟识别"展示与引擎主题匹配，不离开浏览器。
 */

import type { GenerationInput } from '@/engine';
import { hashSeed, createRng } from '@/engine';

export type InputMethod = 'camera' | 'upload' | 'text' | 'emoji';

export type InputPayload =
  | { type: 'photo'; dataUrl: string; tags: string[]; origin: 'camera' | 'upload' }
  | { type: 'text'; text: string }
  | { type: 'emoji'; emojis: string[] };

/** 生成序列会话：输入载荷 + 并行发起的 DNA Promise */
export interface GenSession {
  payload: InputPayload;
  dnaPromise: Promise<import('@/engine').WorldDNA>;
  /** 示例世界跳过扫描阶段 */
  skipScan: boolean;
  /** 示例世界的预设缩略图 */
  sampleThumbnail?: string;
}

export function toGenerationInput(payload: InputPayload): GenerationInput {
  switch (payload.type) {
    case 'photo':
      return { type: 'photo', photoTags: payload.tags };
    case 'text':
      return { type: 'text', text: payload.text };
    case 'emoji':
      return { type: 'emoji', emojis: payload.emojis };
  }
}

/** 识别标签展示用：从输入载荷取 3–5 个标签 */
export function tagsForPayload(payload: InputPayload): string[] {
  if (payload.type === 'photo') return payload.tags.slice(0, 5);
  if (payload.type === 'text') return tagsFromText(payload.text);
  return tagsFromEmojis(payload.emojis);
}

// ── 照片：预设标签池，按文件名+尺寸伪随机选取（确定性） ──

const PHOTO_TAG_POOL = [
  '键盘', '台灯', '数据线', '马克杯', '显示器', '便签', '耳机', '书本',
  '绿植', '窗户', '咖啡', '椅子', '手机', '鼠标', '眼镜', '笔筒',
  '相框', '音箱', '手表', '背包', '雨伞', '猫', '路灯', '电路板',
];

export function photoTagsFromFile(name: string, size: number): string[] {
  const rng = createRng(hashSeed(`PHOTO::${name}:${size}`));
  const count = 3 + rng.int(0, 2); // 3–5 个
  return rng.shuffle(PHOTO_TAG_POOL).slice(0, count);
}

// ── 文字：关键词命中 + 切片填充 ──

const TEXT_KEYWORDS = [
  '台灯', '键盘', '书桌', '显示器', '鼠标', '咖啡', '雨伞', '路灯', '雨夜',
  '猫', '喵', '月亮', '太阳', '星星', '电路', '芯片', '失眠', '梦', '海',
  '山', '雪', '风', '云', '雾', '花', '树', '火', '冰', '光', '影子',
  '歌', '信', '门', '窗', '桥', '岛', '塔', '井', '船', '纸船', '钟',
  '城市', '夜', '森林', '沙漠', '书', '图书馆', '车站', '剧场',
];

/** 虚词：切片首尾出现时不作为识别标签 */
const STOP_CHARS = '的了在和是我你他她它们这那有没不就都也很之与及或而把被让向着呢吗啊呀吧';

function isCleanPiece(piece: string): boolean {
  if (piece.length < 2) return false;
  const first = piece[0];
  const last = piece[piece.length - 1];
  return !STOP_CHARS.includes(first) && !STOP_CHARS.includes(last);
}

export function tagsFromText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const hits: string[] = [];
  for (const kw of TEXT_KEYWORDS) {
    if (trimmed.includes(kw) && !hits.includes(kw)) hits.push(kw);
    if (hits.length >= 5) break;
  }
  if (hits.length >= 3) return hits.slice(0, 5);
  // 命中不足：把文本按标点切段，2/3 字滑窗切片，seeded 洗牌补足
  const rng = createRng(hashSeed(`TEXT::${trimmed}`));
  const segments = trimmed.split(/[\s,，。.!！?？、;；:"'"'"''""''「」()（）]+/).filter((s) => s.length > 0);
  const pieces: string[] = [];
  for (const seg of segments) {
    if (seg.length <= 4) {
      pieces.push(seg);
    } else {
      for (let i = 0; i < seg.length - 1; i++) {
        pieces.push(seg.slice(i, i + 2));
        if (i + 3 <= seg.length) pieces.push(seg.slice(i, i + 3));
      }
    }
  }
  const fill = rng
    .shuffle([...new Set(pieces)])
    .filter((p) => !hits.includes(p) && isCleanPiece(p));
  const merged = [...new Set([...hits, ...fill])];
  // 极短文本：以原文本身兜底一个标签
  if (merged.length < 3 && !merged.includes(trimmed)) merged.unshift(trimmed.slice(0, 8));
  return merged.slice(0, 5);
}

// ── 表情：emoji 本体 + 映射词 ──

const EMOJI_WORDS: Record<string, string> = {
  '🐱': '猫', '🐈': '猫', '😺': '猫', '😸': '猫', '🐾': '猫爪',
  '🌧': '雨', '☔': '雨伞', '💧': '水滴', '🌊': '海',
  '💡': '灯', '🕯': '烛火', '🌙': '月亮', '⭐': '星星', '🌟': '星星',
  '🔥': '火', '❄': '雪', '🌸': '花', '🌲': '树', '🍃': '叶',
  '📚': '书', '☕': '咖啡', '💻': '电脑', '⌨': '键盘', '🖥': '显示器',
  '😴': '失眠', '🌃': '夜', '🏙': '城市', '🚪': '门', '🪟': '窗',
  '⚡': '电', '🔮': '水晶', '🎐': '风铃', '🕰': '钟',
};

export function tagsFromEmojis(emojis: string[]): string[] {
  const tags: string[] = [];
  for (const e of emojis) {
    tags.push(e);
    const word = EMOJI_WORDS[e];
    if (word && !tags.includes(word)) tags.push(word);
  }
  return tags.slice(0, 5);
}

/** 快速选择表情池（三个表情输入的辅助按钮） */
export const EMOJI_PRESETS = [
  '🐱', '🌧', '💡', '🌙', '⭐', '🔥',
  '🌊', '❄', '📚', '☕', '🌸', '🔮',
];

/** 按字素簇切分（支持复合 emoji），降级 Array.from */
export function splitGraphemes(input: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter('zh', { granularity: 'grapheme' });
    return Array.from(seg.segment(input), (s) => s.segment).filter((s) => s.trim().length > 0);
  }
  return Array.from(input).filter((s) => s.trim().length > 0);
}

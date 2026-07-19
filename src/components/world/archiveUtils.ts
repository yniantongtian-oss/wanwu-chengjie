/**
 * archiveUtils.ts — 广场 / 档案页共用的小工具（真实数据格式化，无占位）
 */

import { hashSeed } from '@/engine';
import type { Palette } from '@/engine';

/** 毫秒 → mm:ss（超过一小时退化为 h:mm:ss） */
export function formatRunTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** epoch ms → YYYY-MM-DD */
export function formatDate(at: number): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 由 runId 确定性派生匿名访客代号 VISITOR-XXXX */
export function visitorCodeFromRunId(runId: string): string {
  const hex = (hashSeed(runId) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `VISITOR-${hex}`;
}

/** 种子 → 档案风格十六进制 0xXXXX-XXXX */
export function formatSeedHex(seed: number): string {
  const hex = (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `0x${hex.slice(0, 4)}-${hex.slice(4)}`;
}

/** 复制文本到剪贴板；返回是否成功（调用方负责 toast 反馈，不吞异常） */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 剪贴板 API 被拒（权限 / 非安全上下文）→ 走 execCommand 回退
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** 世界色谱 → 程序化封面渐变取色 */
export const PALETTE_COLORS: Record<Palette, [string, string]> = {
  cyan_amber: ['#57E6F0', '#F5B84C'],
  cyan_mono: ['#57E6F0', '#1B8FA3'],
  violet_cyan: ['#8B7CF6', '#57E6F0'],
  gold_cyan: ['#E8C876', '#57E6F0'],
  ember_red: ['#FF4D5E', '#F5B84C'],
  verdant_glow: ['#5EE0A0', '#57E6F0'],
};

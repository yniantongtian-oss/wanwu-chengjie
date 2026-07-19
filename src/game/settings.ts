/**
 * settings.ts — 游戏页设置持久化
 * 静音 key 与 Navbar 共用 'k3.muted.v1'，其余设置在 'k3:playSettings.v1'。
 */

import type { PlaySettings } from '@/engine';
import { DEFAULT_PLAY_SETTINGS } from '@/engine';

export const MUTE_KEY = 'k3.muted.v1';
const SETTINGS_KEY = 'k3:playSettings.v1';
const TUTORIAL_KEY = 'k3:tutorialDone.v1';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readMuted(): boolean {
  try {
    return storage()?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    storage()?.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}

export function readPlaySettings(): PlaySettings {
  const base: PlaySettings = { ...DEFAULT_PLAY_SETTINGS, muted: readMuted() };
  // 系统级减少动态效果 → 默认开启 reduceMotion / 低晕动
  try {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      base.reduceMotion = true;
      base.lowMotionSickness = true;
    }
  } catch {
    // ignore
  }
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    if (!raw) return base;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return base;
    const p = parsed as Partial<PlaySettings>;
    return {
      muted: readMuted(),
      reduceMotion: typeof p.reduceMotion === 'boolean' ? p.reduceMotion : base.reduceMotion,
      lowMotionSickness:
        typeof p.lowMotionSickness === 'boolean' ? p.lowMotionSickness : base.lowMotionSickness,
      colorAssist: typeof p.colorAssist === 'boolean' ? p.colorAssist : base.colorAssist,
      subtitles: typeof p.subtitles === 'boolean' ? p.subtitles : base.subtitles,
    };
  } catch {
    return base;
  }
}

export function writePlaySettings(settings: PlaySettings): void {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next: Record<string, unknown> = { ...parsed, ...settings };
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  writeMuted(settings.muted);
}

export function readVolume(): number {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    if (!raw) return 0.8;
    const parsed = JSON.parse(raw) as { volume?: unknown };
    return typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : 0.8;
  } catch {
    return 0.8;
  }
}

export function writeVolume(volume: number): void {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed.volume = Math.min(1, Math.max(0, volume));
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function isTutorialDone(): boolean {
  try {
    return storage()?.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialDone(): void {
  try {
    storage()?.setItem(TUTORIAL_KEY, '1');
  } catch {
    // ignore
  }
}

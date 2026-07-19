/**
 * gameTypes.ts — 游戏运行时类型（纯类型，无 React / 无 three 依赖）
 */

/** 单局中的关键事件（用于结算卡"独特事件"展示） */
export interface RunEvent {
  atSeconds: number;
  kind: 'collect' | 'mutation' | 'boss' | 'hazard' | 'portal' | 'system';
  text: string;
}

/** 单局结算数据 */
export interface RunResult {
  /** 本地 run id（用于 /result/:runId） */
  runId: string;
  worldId: string;
  worldCode: string;
  score: number;
  /** 用时（毫秒） */
  timeMs: number;
  /** 已收集碎片数 */
  collected: number;
  /** 碎片总数 */
  total: number;
  /** 是否通关（穿过出口） */
  victory: boolean;
  events: RunEvent[];
  /** 结算时的世界稳定度 0–100 */
  stability: number;
  finishedAt: number;
}

/** 最佳成绩榜条目（worldStore 持久化） */
export interface BestRun {
  runId: string;
  score: number;
  timeMs: number;
  collected: number;
  total: number;
  victory: boolean;
  stability: number;
  finishedAt: number;
}

/** 游戏页 HUD 阶段（五段式） */
export type RunPhase = 'observe' | 'act' | 'mutate' | 'boss' | 'sprint';

/** 无障碍 / 表现设置 */
export interface PlaySettings {
  muted: boolean;
  reduceMotion: boolean;
  lowMotionSickness: boolean;
  colorAssist: boolean;
  subtitles: boolean;
}

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  muted: false,
  reduceMotion: false,
  lowMotionSickness: false,
  colorAssist: false,
  subtitles: true,
};

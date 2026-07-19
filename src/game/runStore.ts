/**
 * runStore.ts — 单局运行时状态（zustand）
 * 高频瞬时量（玩家坐标等）在 bus.ts，本 store 只存会影响 UI 的离散状态。
 */

import { create } from 'zustand';
import type { PlaySettings, RunEvent, RunPhase } from '@/engine';
import { readPlaySettings, readVolume } from './settings';

export type RunStatus = 'boot' | 'playing' | 'paused' | 'portal' | 'collapsing' | 'ended';
export type MutationStage = 'none' | 'omen' | 'transform' | 'done';

export interface TutorialState {
  /** 三张教学卡已播完/被跳过 */
  cardsDone: boolean;
  cardIndex: number;
  moved: boolean;
  collectedOne: boolean;
  jumpedObstacle: boolean;
}

interface RunStore {
  status: RunStatus;
  phase: RunPhase;
  runSeconds: number;
  totalSeconds: number;
  collected: number;
  total: number;
  combo: number;
  maxCombo: number;
  lastCollectAt: number;
  stability: number;
  stabilityWarned: boolean;
  nodesActivated: number;
  nodeGoal: number;
  /** 已激活节点 id 列表 */
  nodesLit: number[];
  /** HUD 长按完成后请求激活节点，由 run loop 校验距离后消费 */
  pendingNodeId: number | null;
  bossSpawned: boolean;
  bossDefeated: boolean;
  /** Boss 是否参与本局（dna.boss 为空时 false） */
  hasBoss: boolean;
  portalActive: boolean;
  mutationStage: MutationStage;
  gravityFlipped: boolean;
  blackout: boolean;
  victory: boolean | null;
  events: RunEvent[];
  tutorial: TutorialState;
  settings: PlaySettings;
  volume: number;
  /** 重新开始时 +1，强制场景重挂载 */
  resetNonce: number;
  /** 运行时性能降级（帧率看门狗触发后关闭泛光并降低渲染分辨率，不重置局内状态） */
  perfDegraded: boolean;

  // actions
  boot: (opts: {
    totalSeconds: number;
    total: number;
    stability: number;
    hasBoss: boolean;
    tutorialDone: boolean;
  }) => void;
  setStatus: (s: RunStatus) => void;
  setPhase: (p: RunPhase) => void;
  addTime: (dt: number) => void;
  collectOne: (atSeconds: number) => void;
  litNode: (id: number) => void;
  requestNodeActivation: (id: number) => void;
  clearPendingNode: () => void;
  spawnBoss: () => void;
  defeatBoss: () => void;
  activatePortal: () => void;
  setMutationStage: (s: MutationStage) => void;
  applyMutation: (kind: 'gravity_flip' | 'sun_blackout' | 'shift') => void;
  damage: (amount: number) => void;
  addEvent: (kind: RunEvent['kind'], text: string) => void;
  setVictory: (v: boolean) => void;
  tutorialCardNext: () => void;
  tutorialSkipCards: () => void;
  tutorialMark: (key: 'moved' | 'collectedOne' | 'jumpedObstacle') => void;
  setSettings: (s: PlaySettings) => void;
  setVolume: (v: number) => void;
  setPerfDegraded: (v: boolean) => void;
  restart: () => void;
}

export const useRunStore = create<RunStore>()((set) => ({
  status: 'boot',
  phase: 'observe',
  runSeconds: 0,
  totalSeconds: 75,
  collected: 0,
  total: 12,
  combo: 0,
  maxCombo: 0,
  lastCollectAt: -10,
  stability: 80,
  stabilityWarned: false,
  nodesActivated: 0,
  nodeGoal: 3,
  nodesLit: [],
  pendingNodeId: null,
  bossSpawned: false,
  bossDefeated: false,
  hasBoss: true,
  portalActive: false,
  mutationStage: 'none',
  gravityFlipped: false,
  blackout: false,
  victory: null,
  events: [],
  tutorial: { cardsDone: true, cardIndex: 0, moved: false, collectedOne: false, jumpedObstacle: false },
  settings: readPlaySettings(),
  volume: readVolume(),
  resetNonce: 0,
  perfDegraded: false,

  boot: ({ totalSeconds, total, stability, hasBoss, tutorialDone }) =>
    set({
      status: 'playing',
      phase: 'observe',
      runSeconds: 0,
      totalSeconds,
      collected: 0,
      total,
      combo: 0,
      maxCombo: 0,
      lastCollectAt: -10,
      stability,
      stabilityWarned: stability < 40,
      nodesActivated: 0,
      nodeGoal: 3,
      nodesLit: [],
      pendingNodeId: null,
      bossSpawned: false,
      bossDefeated: !hasBoss,
      hasBoss,
      portalActive: false,
      mutationStage: 'none',
      gravityFlipped: false,
      blackout: false,
      victory: null,
      events: [],
      tutorial: {
        cardsDone: tutorialDone,
        cardIndex: 0,
        moved: tutorialDone,
        collectedOne: tutorialDone,
        jumpedObstacle: tutorialDone,
      },
    }),

  setStatus: (status) => set({ status }),
  setPhase: (phase) => set({ phase }),
  addTime: (dt) => set((s) => ({ runSeconds: s.runSeconds + dt })),

  collectOne: (atSeconds) =>
    set((s) => {
      const combo = atSeconds - s.lastCollectAt <= 3 ? s.combo + 1 : 1;
      return {
        collected: s.collected + 1,
        combo,
        maxCombo: Math.max(s.maxCombo, combo),
        lastCollectAt: atSeconds,
      };
    }),

  litNode: (id) =>
    set((s) =>
      s.nodesLit.includes(id)
        ? s
        : { nodesLit: [...s.nodesLit, id], nodesActivated: s.nodesActivated + 1, pendingNodeId: null },
    ),
  requestNodeActivation: (id) => set({ pendingNodeId: id }),
  clearPendingNode: () => set({ pendingNodeId: null }),
  spawnBoss: () => set({ bossSpawned: true }),
  defeatBoss: () => set({ bossDefeated: true }),
  activatePortal: () => set({ portalActive: true }),
  setMutationStage: (mutationStage) => set({ mutationStage }),

  applyMutation: (kind) =>
    set({
      gravityFlipped: kind === 'gravity_flip',
      blackout: kind === 'sun_blackout',
    }),

  damage: (amount) =>
    set((s) => ({ stability: Math.max(0, Math.round((s.stability - amount) * 10) / 10) })),

  addEvent: (kind, text) =>
    set((s) => ({
      events: [...s.events, { atSeconds: Math.round(s.runSeconds * 10) / 10, kind, text }].slice(-24),
    })),

  setVictory: (victory) => set({ victory }),

  tutorialCardNext: () =>
    set((s) => {
      const next = s.tutorial.cardIndex + 1;
      return { tutorial: { ...s.tutorial, cardIndex: next, cardsDone: next >= 3 } };
    }),

  tutorialSkipCards: () => set((s) => ({ tutorial: { ...s.tutorial, cardsDone: true } })),

  tutorialMark: (key) =>
    set((s) => (s.tutorial[key] ? s : { tutorial: { ...s.tutorial, [key]: true } })),

  setSettings: (settings) => set({ settings }),
  setVolume: (volume) => set({ volume }),
  setPerfDegraded: (perfDegraded) => set({ perfDegraded }),

  restart: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),
}));

/** 任务卡文案（按阶段/进度推导） */
export function missionText(s: {
  phase: RunPhase;
  collected: number;
  total: number;
  nodesActivated: number;
  nodeGoal: number;
  bossDefeated: boolean;
  hasBoss: boolean;
  portalActive: boolean;
  gravityFlipped: boolean;
  blackout: boolean;
}): { title: string; progress: string } {
  switch (s.phase) {
    case 'observe':
      return { title: '熟悉这个世界 · 找到碎片的分布', progress: '' };
    case 'act':
      if (s.collected >= s.total) return { title: '碎片集齐了 · 世界要变了', progress: '' };
      return { title: '收集世界碎片', progress: `碎片 ${s.collected}/${s.total}` };
    case 'mutate':
      return { title: '世界规则正在被重写', progress: '' };
    case 'boss': {
      if (s.hasBoss && !s.bossDefeated) {
        const sub = s.collected < s.total ? ` · 碎片 ${s.collected}/${s.total}` : '';
        return { title: '点亮能量节点，逼退它', progress: `节点 ${s.nodesActivated}/${s.nodeGoal}${sub}` };
      }
      if (s.collected < s.total) {
        const hint = s.blackout ? '在黑暗中，找到仍在发光的碎片' : s.gravityFlipped ? '在颠倒的重力中继续收集' : '收集剩余的碎片';
        return { title: hint, progress: `碎片 ${s.collected}/${s.total}` };
      }
      return { title: '激活出口', progress: '' };
    }
    case 'sprint':
      return { title: '穿过那扇门', progress: s.collected < s.total ? `碎片 ${s.collected}/${s.total}` : '' };
  }
}

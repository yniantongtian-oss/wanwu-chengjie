/**
 * bus.ts — 跨 Canvas/DOM 的每帧可变数据总线（不进 React 状态，避免重渲染）
 * - input: 键盘 + 虚拟摇杆合成
 * - relays: 玩家/Boss 位置等供 3D 与 HUD 共享的瞬时量
 */

export interface InputState {
  /** 键盘移动向量（已归一化，相机相对前尚未应用） */
  keyX: number;
  keyZ: number;
  /** 虚拟摇杆向量 [-1,1] */
  joyX: number;
  joyY: number;
  jump: boolean;
  /** 相机拖拽增量（像素，由 GameScene 消费后清零） */
  lookDX: number;
  lookDY: number;
  /** 本帧是否有有效触摸输入（用于决定是否显示摇杆） */
  touchSeen: boolean;
}

export const input: InputState = {
  keyX: 0,
  keyZ: 0,
  joyX: 0,
  joyY: 0,
  jump: false,
  lookDX: 0,
  lookDY: 0,
  touchSeen: false,
};

export interface Relays {
  playerX: number;
  playerY: number;
  playerZ: number;
  /** 玩家是否着地 */
  grounded: boolean;
  /** 本局移动总距离（教学"前进 3 米"用） */
  distanceMoved: number;
  bossX: number;
  bossY: number;
  bossZ: number;
  bossActive: boolean;
  /** 距离最近的未激活能量节点（米），Infinity 表示无可注入 */
  nearestNodeDist: number;
  nearestNodeId: number;
  /** 屏幕震动请求（幅度 px，HUD 消费，≤2px） */
  shakePx: number;
  /** 收集时屏幕边缘青光 / 受击红光闪烁请求（时间戳 ms） */
  flashCyanAt: number;
  flashRedAt: number;
  flashGoldAt: number;
  /** 字幕提示（由 HUD 字幕条展示几秒） */
  subtitle: string;
  subtitleAt: number;
  /** 粒子悬停（突变预兆 0.5s） */
  particlesFrozen: boolean;
  /** Boss 击退冲量（玩家控制器消费后清零） */
  knockX: number;
  knockZ: number;
}

export const relays: Relays = {
  playerX: 0,
  playerY: 2,
  playerZ: 0,
  grounded: false,
  distanceMoved: 0,
  bossX: 0,
  bossY: -100,
  bossZ: 0,
  bossActive: false,
  nearestNodeDist: Infinity,
  nearestNodeId: -1,
  shakePx: 0,
  flashCyanAt: 0,
  flashRedAt: 0,
  flashGoldAt: 0,
  subtitle: '',
  subtitleAt: 0,
  particlesFrozen: false,
  knockX: 0,
  knockZ: 0,
};

export function resetRelays(): void {
  relays.playerX = 0;
  relays.playerY = 2;
  relays.playerZ = 0;
  relays.grounded = false;
  relays.distanceMoved = 0;
  relays.bossX = 0;
  relays.bossY = -100;
  relays.bossZ = 0;
  relays.bossActive = false;
  relays.nearestNodeDist = Infinity;
  relays.nearestNodeId = -1;
  relays.shakePx = 0;
  relays.flashCyanAt = 0;
  relays.flashRedAt = 0;
  relays.flashGoldAt = 0;
  relays.subtitle = '';
  relays.subtitleAt = 0;
  relays.particlesFrozen = false;
  relays.knockX = 0;
  relays.knockZ = 0;
  input.keyX = 0;
  input.keyZ = 0;
  input.joyX = 0;
  input.joyY = 0;
  input.jump = false;
  input.lookDX = 0;
  input.lookDY = 0;
}

export function requestShake(px: number): void {
  relays.shakePx = Math.max(relays.shakePx, Math.min(2, px));
}

export function showSubtitle(text: string): void {
  relays.subtitle = text;
  relays.subtitleAt = Date.now();
}

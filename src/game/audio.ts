/**
 * audio.ts — WebAudio 合成音效引擎（无外部音频资源）
 * 收集清脆音 / 突变低频轰 / Boss 预警 / 节点激活 / 传送门 / 结算钟声 / 心跳 / 环境嗡鸣。
 * 尊重全局静音（key 与 Navbar 一致：'k3.muted.v1'）。
 */

import { readMuted, readVolume } from './settings';

type OscType = OscillatorType;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode } | null = null;
  private muted = readMuted();
  private volume = readVolume();

  /** 必须在用户手势中调用（click/keydown/touchstart） */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMaster();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyMaster();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private applyMaster(): void {
    if (!this.ctx || !this.master) return;
    const target = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscType; gain?: number; attack?: number; slideTo?: number; delay?: number } = {},
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const { type = 'sine', gain = 0.18, attack = 0.008, slideTo, delay = 0 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noiseBurst(dur: number, gain: number, filterFreq: number, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  /** 收集碎片：清脆双音 + 高频闪烁 */
  collect(combo = 0): void {
    const lift = Math.min(combo, 8) * 40;
    this.tone(880 + lift, 0.12, { type: 'sine', gain: 0.16 });
    this.tone(1320 + lift, 0.16, { type: 'triangle', gain: 0.12, delay: 0.05 });
    this.noiseBurst(0.06, 0.05, 8000, 0.02);
  }

  /** 突变预兆：环境音骤停由 stopAmbient 处理，此处为一声干涩提示 */
  omen(): void {
    this.tone(440, 0.4, { type: 'sine', gain: 0.1, slideTo: 220 });
  }

  /** 突变：低频轰 */
  mutationBoom(): void {
    this.tone(70, 1.4, { type: 'sine', gain: 0.4, slideTo: 28 });
    this.noiseBurst(1.2, 0.22, 240);
    this.tone(140, 0.9, { type: 'sawtooth', gain: 0.06, slideTo: 50, delay: 0.1 });
  }

  /** Boss 预警：三次低频脉冲 */
  bossWarn(): void {
    for (let i = 0; i < 3; i++) {
      this.tone(110, 0.22, { type: 'square', gain: 0.12, delay: i * 0.32 });
      this.tone(55, 0.3, { type: 'sine', gain: 0.2, delay: i * 0.32 });
    }
  }

  /** Boss 触碰：闷击 */
  bossHit(): void {
    this.noiseBurst(0.25, 0.3, 500);
    this.tone(90, 0.3, { type: 'sine', gain: 0.3, slideTo: 40 });
  }

  /** 节点激活：金色和弦 */
  nodeActivate(): void {
    this.tone(523.25, 0.5, { type: 'triangle', gain: 0.14 });
    this.tone(659.25, 0.55, { type: 'triangle', gain: 0.12, delay: 0.06 });
    this.tone(783.99, 0.7, { type: 'sine', gain: 0.12, delay: 0.12 });
  }

  /** Boss 解体 */
  bossDown(): void {
    this.tone(392, 0.8, { type: 'triangle', gain: 0.16, slideTo: 784 });
    this.noiseBurst(0.8, 0.16, 3000, 0.1);
    this.tone(1046.5, 0.9, { type: 'sine', gain: 0.1, delay: 0.25 });
  }

  /** 传送门激活：上行琶音 */
  portalOpen(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.5, { type: 'sine', gain: 0.12, delay: i * 0.09 }),
    );
  }

  /** 结算钟声（胜利=明亮，失败=低沉） */
  chime(victory: boolean): void {
    if (victory) {
      this.tone(523.25, 1.8, { type: 'sine', gain: 0.2 });
      this.tone(784, 1.6, { type: 'sine', gain: 0.1, delay: 0.02 });
      this.tone(1046.5, 2.2, { type: 'sine', gain: 0.08, delay: 0.3 });
    } else {
      this.tone(220, 2.2, { type: 'sine', gain: 0.2, slideTo: 196 });
      this.tone(110, 2.6, { type: 'sine', gain: 0.16, delay: 0.05 });
    }
  }

  /** 倒计时心跳 */
  heartbeat(): void {
    this.tone(60, 0.12, { type: 'sine', gain: 0.26 });
    this.tone(55, 0.14, { type: 'sine', gain: 0.2, delay: 0.16 });
  }

  /** 跳跃：轻上扬气流 */
  jump(): void {
    this.tone(520, 0.09, { type: 'sine', gain: 0.06, slideTo: 780 });
    this.noiseBurst(0.05, 0.025, 5200);
  }

  /** 落地：闷响，strength 0–1 */
  land(strength = 0.5): void {
    const k = Math.min(1, Math.max(0.15, strength));
    this.noiseBurst(0.1 + k * 0.08, 0.08 + k * 0.12, 320);
    this.tone(95 - k * 25, 0.13, { type: 'sine', gain: 0.08 + k * 0.08, slideTo: 55 });
  }

  /** UI 滴答 */
  uiTick(): void {
    this.tone(1400, 0.04, { type: 'square', gain: 0.05 });
  }

  /** 教学步骤完成 */
  stepDone(): void {
    this.tone(987.77, 0.14, { type: 'triangle', gain: 0.1 });
    this.tone(1318.5, 0.2, { type: 'sine', gain: 0.09, delay: 0.07 });
  }

  /** 环境嗡鸣（循环，突变预兆时停止，之后以更暗的音恢复） */
  startAmbient(dark = false): void {
    if (!this.ctx || !this.master || this.muted) return;
    this.stopAmbient();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = dark ? 55 : 82.4;
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(dark ? 0.05 : 0.035, this.ctx.currentTime, 1.2);
    lfo.type = 'sine';
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = dark ? 6 : 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.ambient = { osc, gain, lfo };
  }

  stopAmbient(): void {
    if (!this.ambient || !this.ctx) return;
    const { osc, gain, lfo } = this.ambient;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    window.setTimeout(() => {
      try {
        osc.stop();
        lfo.stop();
      } catch {
        // already stopped
      }
    }, 600);
    this.ambient = null;
  }
}

export const sound = new SoundEngine();

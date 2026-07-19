/**
 * PauseMenu.tsx — 暂停菜单（Esc / ⏸）：继续 / 重新开始 / 设置 / 退出
 * 所有开关真实生效并持久化 localStorage。
 */

import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Home, RotateCcw, Play, Settings2, Compass } from 'lucide-react';
import type { PlaySettings, WorldDNA } from '@/engine';
import { useRunStore } from '../runStore';
import { sound } from '../audio';
import { writePlaySettings, writeVolume } from '../settings';
import { cn } from '@/lib/utils';

interface PauseMenuProps {
  dna: WorldDNA;
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
    >
      <span>
        <span className="block text-[14px] text-star">{label}</span>
        {desc && <span className="mt-0.5 block text-[12px] text-star-faint">{desc}</span>}
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-cyan bg-cyan/25' : 'border-star-faint bg-transparent',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all',
            checked ? 'left-[18px] bg-cyan' : 'left-[3px] bg-star-faint',
          )}
        />
      </span>
    </button>
  );
}

export default function PauseMenu({ dna, open, onResume, onRestart }: PauseMenuProps) {
  const settings = useRunStore((s) => s.settings);
  const volume = useRunStore((s) => s.volume);
  const setSettings = useRunStore((s) => s.setSettings);
  const setVolume = useRunStore((s) => s.setVolume);
  const [showSettings, setShowSettings] = useState(false);

  const update = (patch: Partial<PlaySettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    writePlaySettings(next);
    sound.setMuted(next.muted);
  };

  const itemCls =
    'group relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[15px] text-star transition-colors hover:bg-white/5';
  const barCls = 'absolute left-0 top-1/2 h-0 w-[2px] -translate-y-1/2 bg-cyan transition-all group-hover:h-6';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center bg-void/60 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="panel w-full max-w-[400px] p-6"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="暂停菜单"
          >
            <p className="font-mono text-[11px] tracking-[0.2em] text-star-faint">PAUSED</p>
            <h2 className="mt-1 font-serif text-[24px] font-bold text-star">{dna.worldName}</h2>
            <p className="mt-0.5 font-mono text-[12px] text-star-faint">{dna.worldCode}</p>

            <div className="mt-5 space-y-1">
              <button type="button" className={itemCls} onClick={onResume} autoFocus>
                <span className={barCls} />
                <Play className="h-4 w-4 text-cyan" /> 继续
              </button>
              <button type="button" className={itemCls} onClick={onRestart}>
                <span className={barCls} />
                <RotateCcw className="h-4 w-4 text-star-dim" /> 重新开始（同种子）
              </button>
              <button type="button" className={itemCls} onClick={() => setShowSettings((v) => !v)}>
                <span className={barCls} />
                <Settings2 className="h-4 w-4 text-star-dim" /> 设置
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-0.5 rounded-xl border border-white/10 bg-void-3/60 p-2">
                    <Toggle
                      label="音效"
                      checked={!settings.muted}
                      onChange={(v) => update({ muted: !v })}
                    />
                    <div className="px-3 py-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[13px] text-star-dim">
                          {settings.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          音量
                        </span>
                        <span className="font-mono text-[11px] text-star-faint">{Math.round(volume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        aria-label="音量"
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          setVolume(v);
                          writeVolume(v);
                          sound.setVolume(v);
                        }}
                        className="w-full accent-[#57E6F0]"
                      />
                    </div>
                    <Toggle
                      label="低晕动模式"
                      desc="固定镜头 · 取消震动与翻转"
                      checked={settings.lowMotionSickness}
                      onChange={(v) => update({ lowMotionSickness: v })}
                    />
                    <Toggle
                      label="减少动态效果"
                      desc="关闭粒子与脉冲动画"
                      checked={settings.reduceMotion}
                      onChange={(v) => update({ reduceMotion: v })}
                    />
                    <Toggle
                      label="色盲辅助"
                      desc="任务物叠加形状：碎片=菱形 · 节点=三角 · 出口=圆环"
                      checked={settings.colorAssist}
                      onChange={(v) => update({ colorAssist: v })}
                    />
                    <Toggle
                      label="字幕"
                      desc="Boss / 突变提示文字化"
                      checked={settings.subtitles}
                      onChange={(v) => update({ subtitles: v })}
                    />
                    <div className="px-3 py-2 text-[12px] leading-relaxed text-star-faint">
                      <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-star-faint">操作</p>
                      WASD / 方向键移动 · 空格跳跃 · 拖动转视角 · Esc 暂停
                      <br />
                      移动端：左侧摇杆移动 · 右下按钮跳跃 · 右侧滑动转视角
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
              <Link to="/" className={itemCls}>
                <span className={barCls} />
                <Home className="h-4 w-4 text-star-dim" /> 退出到首页
              </Link>
              <Link to="/square" className={itemCls}>
                <span className={barCls} />
                <Compass className="h-4 w-4 text-star-dim" /> 退出到世界广场
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

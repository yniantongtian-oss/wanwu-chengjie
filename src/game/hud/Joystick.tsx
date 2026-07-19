/**
 * Joystick.tsx — 触屏/鼠标输入覆盖层
 * 左半屏：虚拟摇杆（96px 底座 + 48px 摇杆头）；其余区域：拖动转视角；右下：跳跃按钮。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowBigUp } from 'lucide-react';
import { input } from '../bus';
import { sound } from '../audio';
import { cn } from '@/lib/utils';

const JOY_RADIUS = 40;

interface JoyState {
  active: boolean;
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  pointerId: number;
}

export default function TouchControls() {
  const [joy, setJoy] = useState<JoyState>({ active: false, originX: 0, originY: 0, dx: 0, dy: 0, pointerId: -1 });
  const [touchMode, setTouchMode] = useState(false);
  const [jumpHeld, setJumpHeld] = useState(false);
  const lookRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const joyRef = useRef<JoyState>(joy);
  useEffect(() => {
    joyRef.current = joy;
  }, [joy]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    sound.ensure();
    if (e.pointerType === 'touch') {
      input.touchSeen = true;
      setTouchMode(true);
    }
    const isJoyZone = e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45 && e.clientY > window.innerHeight * 0.4;
    if (isJoyZone) {
      setJoy({ active: true, originX: e.clientX, originY: e.clientY, dx: 0, dy: 0, pointerId: e.pointerId });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } else {
      lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const j = joyRef.current;
    if (j.active && e.pointerId === j.pointerId) {
      let dx = e.clientX - j.originX;
      let dy = e.clientY - j.originY;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) {
        dx = (dx / len) * JOY_RADIUS;
        dy = (dy / len) * JOY_RADIUS;
      }
      input.joyX = dx / JOY_RADIUS;
      input.joyY = dy / JOY_RADIUS;
      setJoy({ ...j, dx, dy });
      return;
    }
    const look = lookRef.current;
    if (look && e.pointerId === look.id) {
      input.lookDX += e.clientX - look.x;
      input.lookDY += e.clientY - look.y;
      look.x = e.clientX;
      look.y = e.clientY;
    }
  }, []);

  const onPointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const j = joyRef.current;
    if (j.active && e.pointerId === j.pointerId) {
      input.joyX = 0;
      input.joyY = 0;
      setJoy({ active: false, originX: 0, originY: 0, dx: 0, dy: 0, pointerId: -1 });
    }
    if (lookRef.current && e.pointerId === lookRef.current.id) {
      lookRef.current = null;
    }
  }, []);

  useEffect(() => {
    const seen = () => {
      input.touchSeen = true;
      setTouchMode(true);
    };
    window.addEventListener('touchstart', seen, { passive: true, once: true });
    return () => window.removeEventListener('touchstart', seen);
  }, []);

  return (
    <>
      {/* 全屏输入层（摇杆 + 视角拖动） */}
      <div
        className="absolute inset-0 z-10 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {/* 摇杆底座 */}
        {joy.active && (
          <div
            className="pointer-events-none fixed z-10 rounded-full border border-cyan/40 bg-cyan/5"
            style={{
              width: 96,
              height: 96,
              left: joy.originX - 48,
              top: joy.originY - 48,
              boxShadow: '0 0 24px rgba(87,230,240,.15) inset',
            }}
          >
            <div
              className="absolute rounded-full bg-cyan/50"
              style={{
                width: 48,
                height: 48,
                left: 24 + joy.dx,
                top: 24 + joy.dy,
                boxShadow: '0 0 16px rgba(87,230,240,.5)',
              }}
            />
          </div>
        )}
        {/* 移动端静态摇杆提示 */}
        {touchMode && !joy.active && (
          <div className="pointer-events-none fixed bottom-8 left-8 z-10 flex h-24 w-24 items-center justify-center rounded-full border border-cyan/25 bg-cyan/5">
            <div className="h-12 w-12 rounded-full bg-cyan/20" />
          </div>
        )}
      </div>

      {/* 跳跃按钮（触屏常显；桌面hover可见） */}
      <button
        type="button"
        aria-label="跳跃"
        className={cn(
          'absolute bottom-8 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-full border transition-all',
          jumpHeld ? 'scale-95 border-cyan bg-cyan/25' : 'border-cyan/50 bg-cyan/10',
          touchMode ? 'opacity-90' : 'opacity-40 hover:opacity-80',
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          sound.ensure();
          input.jump = true;
          setJumpHeld(true);
          e.currentTarget.setPointerCapture?.(e.pointerId);
          e.stopPropagation();
        }}
        onPointerUp={() => {
          input.jump = false;
          setJumpHeld(false);
        }}
        onPointerCancel={() => {
          input.jump = false;
          setJumpHeld(false);
        }}
      >
        <ArrowBigUp className="h-7 w-7 text-cyan" />
      </button>
    </>
  );
}

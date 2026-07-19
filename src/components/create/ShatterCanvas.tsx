import { useEffect, useRef } from 'react';

export type ShatterMode = 'hidden' | 'gather' | 'ring';

interface SourceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ShatterCanvasProps {
  mode: ShatterMode;
  /** 输入卡在视口中的位置（粒子起点）；空则取屏幕中央 */
  sourceRect: SourceRect | null;
}

interface Particle {
  sx: number;
  sy: number;
  angle0: number;
  radius0: number;
  spin: number;
  size: number;
  tint: number; // 0 cyan / 1 white / 2 amber
  ringAngle: number;
  ringRadius: number;
  tw: number;
}

const COUNT = 2000;
const GATHER_MS = 1700;
const RING_FORM_MS = 1200;

/**
 * 碎裂粒子画布（~2000 粒）：
 * gather —— 输入卡崩解为粒子，螺旋吸入屏幕中心（power2.in）
 * ring   —— 粒子自中心展开为有景深的环形门（内亮外雾）
 */
export default function ShatterCanvas({ mode, sourceRect }: ShatterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 初始 'hidden'：保证首个 effect 必检测到变化并生成粒子
  const modeRef = useRef<ShatterMode>('hidden');
  const modeStartRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const rectRef = useRef<SourceRect | null>(sourceRect);

  useEffect(() => {
    rectRef.current = sourceRect;
  }, [sourceRect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = () => {
      const rect = rectRef.current ?? {
        x: width / 2 - 180,
        y: height / 2 - 140,
        w: 360,
        h: 280,
      };
      const base = Math.min(width, height);
      const ringBase = base * 0.21;
      const list: Particle[] = [];
      for (let i = 0; i < COUNT; i++) {
        const sx = rect.x + Math.random() * rect.w;
        const sy = rect.y + Math.random() * rect.h;
        const dx = sx - width / 2;
        const dy = sy - height / 2;
        const depth = Math.random(); // 0 内圈（亮）→ 1 外圈（雾）
        list.push({
          sx,
          sy,
          angle0: Math.atan2(dy, dx),
          radius0: Math.hypot(dx, dy),
          spin: 2.2 + Math.random() * 3.6,
          size: (0.7 + Math.random() * 1.7) * dpr,
          tint: Math.random() < 0.12 ? 1 : Math.random() < 0.1 ? 2 : 0,
          ringAngle: Math.random() * Math.PI * 2,
          ringRadius: ringBase * (0.82 + depth * 0.42) * (1 + (Math.random() - 0.5) * 0.1),
          tw: Math.random() * Math.PI * 2,
        });
      }
      particlesRef.current = list;
    };

    if (modeRef.current !== mode) {
      modeRef.current = mode;
      modeStartRef.current = performance.now();
      if (mode === 'gather') spawn();
    }

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const m = modeRef.current;
      if (m === 'hidden') return;
      const particles = particlesRef.current;
      if (particles.length === 0) return;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const t = now - modeStartRef.current;

      if (m === 'gather') {
        const p = Math.min(1, t / GATHER_MS);
        const e = p * p; // power2.in
        for (const pt of particles) {
          const r = pt.radius0 * (1 - e) * dpr;
          const a = pt.angle0 + pt.spin * e;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          const alpha = Math.min(1, p * 4 + 0.15) * (1 - p * 0.35);
          ctx.fillStyle =
            pt.tint === 1
              ? `rgba(232,240,255,${alpha})`
              : pt.tint === 2
                ? `rgba(245,184,76,${alpha})`
                : `rgba(87,230,240,${alpha})`;
          ctx.fillRect(x, y, pt.size, pt.size);
        }
        return;
      }

      // ring：中心 → 环形展开，随后缓慢环绕 + 明暗呼吸
      const p = Math.min(1, t / RING_FORM_MS);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const drift = Math.max(0, t - RING_FORM_MS) / 1000;
      for (const pt of particles) {
        const depth = (pt.ringRadius / (Math.min(width, height) * 0.21 * 1.24) - 0.82) / 0.42;
        const r = pt.ringRadius * e * dpr;
        const a = pt.ringAngle + drift * 0.12 * (1.2 - depth);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const breathe = p >= 1 ? 0.55 + 0.45 * Math.sin(drift * 2 + pt.tw) : 1;
        const alpha = (1 - depth * 0.6) * breathe * Math.min(1, e * 2);
        ctx.fillStyle =
          pt.tint === 1
            ? `rgba(232,240,255,${alpha})`
            : pt.tint === 2
              ? `rgba(245,184,76,${alpha * 0.9})`
              : `rgba(87,230,240,${alpha})`;
        ctx.fillRect(x, y, pt.size, pt.size);
      }
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      aria-hidden
    />
  );
}

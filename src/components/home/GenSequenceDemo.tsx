import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TAGS = ['键盘', '台灯', '数据线', '马克杯', '便签'];
const RULES = [
  ['重力', '0.82'],
  ['天空', '暗室星云'],
  ['天气', '浮尘'],
  ['突变', '太阳熄灭 · 35s'],
  ['Boss', '失控光标 M-01'],
];

const PHASES = [
  {
    key: 'scan',
    step: 'PHASE 01',
    title: '扫描',
    body: '一道光带自上而下扫过你的输入。K3 正在看它——真正地看它。',
  },
  {
    key: 'understand',
    step: 'PHASE 02',
    title: '理解',
    body: '物体被命名，法则被写下：重力、天空、天气、突变与 Boss，全部成为一份世界 DNA。',
  },
  {
    key: 'become',
    step: 'PHASE 03',
    title: '成界',
    body: '输入碎裂成粒子，螺旋汇聚成一扇门。门内，是你从未见过的世界。',
  },
];

/** 粒子碎裂画布：~1500 粒从卡片边缘螺旋吸入中心，由滚动进度驱动 */
function useShatterCanvas(progressRef: React.MutableRefObject<number>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let particles: Array<{ sx: number; sy: number; angle: number; radius: number; spin: number; size: number; hue: number }> = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      const w = canvas.width;
      const h = canvas.height;
      const N = 1500;
      particles = Array.from({ length: N }, () => {
        // 起点分布在四周边缘
        const edge = Math.random();
        const t = Math.random();
        let sx = 0;
        let sy = 0;
        if (edge < 0.25) { sx = t * w; sy = 0; }
        else if (edge < 0.5) { sx = t * w; sy = h; }
        else if (edge < 0.75) { sx = 0; sy = t * h; }
        else { sx = w; sy = t * h; }
        const dx = sx - w / 2;
        const dy = sy - h / 2;
        return {
          sx,
          sy,
          angle: Math.atan2(dy, dx),
          radius: Math.hypot(dx, dy),
          spin: 2.5 + Math.random() * 3.5,
          size: (0.8 + Math.random() * 1.8) * dpr,
          hue: Math.random(),
        };
      });
    };

    const render = () => {
      raf = requestAnimationFrame(render);
      const p = progressRef.current; // 0..1（阶段 C 内部进度）
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (p <= 0.001 || p >= 0.999) return;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const ease = p * p * (3 - 2 * p);
      for (const pt of particles) {
        const r = pt.radius * (1 - ease);
        const a = pt.angle + ease * pt.spin;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const alpha = Math.min(1, ease * 3) * (1 - ease * 0.55);
        ctx.fillStyle = pt.hue > 0.82
          ? `rgba(245,184,76,${alpha})`
          : `rgba(87,230,240,${alpha})`;
        ctx.fillRect(x, y, pt.size, pt.size);
      }
    };

    resize();
    render();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [progressRef]);

  return canvasRef;
}

/**
 * S3 · 生成序列滚动演示（pin 250vh，ScrollTrigger scrub 驱动）
 * 阶段 A 扫描 → 阶段 B 理解 → 阶段 C 成界。
 */
export default function GenSequenceDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const rulesRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const portalImgRef = useRef<HTMLImageElement>(null);
  const phaseRefs = useRef<Array<HTMLDivElement | null>>([]);
  const shatterProgress = useRef(0);
  const canvasRef = useShatterCanvas(shatterProgress);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=250%',
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
        },
      });

      // ── 阶段 A（0–30%）：扫描线 2 次扫过
      tl.fromTo(
        scanRef.current,
        { top: '-8%', opacity: 1 },
        { top: '108%', duration: 0.15, ease: 'power1.inOut' },
        0,
      ).fromTo(
        scanRef.current,
        { top: '-8%' },
        { top: '108%', duration: 0.15, ease: 'power1.inOut' },
        0.15,
      );
      tl.to(scanRef.current, { opacity: 0, duration: 0.03 }, 0.3);

      // 阶段文案：A 亮 → A 暗/B 亮 → B 暗/C 亮
      tl.set(phaseRefs.current[0], { autoAlpha: 1 }, 0);
      tl.to(phaseRefs.current[0], { autoAlpha: 0.12, duration: 0.06 }, 0.3);
      tl.fromTo(phaseRefs.current[1], { autoAlpha: 0.12 }, { autoAlpha: 1, duration: 0.06 }, 0.3);
      tl.to(phaseRefs.current[1], { autoAlpha: 0.12, duration: 0.06 }, 0.62);
      tl.fromTo(phaseRefs.current[2], { autoAlpha: 0.12 }, { autoAlpha: 1, duration: 0.06 }, 0.62);

      // ── 阶段 B（30–60%）：标签 + 法则逐条
      const tagEls = tagsRef.current?.children ?? [];
      tl.fromTo(
        tagEls,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.04, stagger: 0.035, ease: 'power2.out' },
        0.31,
      );
      const ruleEls = rulesRef.current?.children ?? [];
      tl.fromTo(
        ruleEls,
        { autoAlpha: 0, x: -14 },
        { autoAlpha: 1, x: 0, duration: 0.04, stagger: 0.03, ease: 'power2.out' },
        0.42,
      );

      // ── 阶段 C（60–100%）：碎裂 → 汇聚 → 门
      tl.to(cardRef.current, {
        autoAlpha: 0,
        duration: 0.1,
        onStart: () => { shatterProgress.current = 0.001; },
        onUpdate: function () {
          shatterProgress.current = this.progress();
        },
        onComplete: () => { shatterProgress.current = 0; },
      }, 0.6);
      tl.to([tagsRef.current, rulesRef.current], { autoAlpha: 0, duration: 0.08 }, 0.62);
      tl.fromTo(
        portalRef.current,
        { autoAlpha: 0, scale: 0.4 },
        { autoAlpha: 1, scale: 1, duration: 0.18, ease: 'power3.out' },
        0.74,
      );
      tl.fromTo(portalImgRef.current, { scale: 1 }, { scale: 1.15, duration: 0.26, ease: 'power1.out' }, 0.74);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-void py-20" aria-label="生成序列演示">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 lg:grid-cols-[1fr_560px]">
        {/* 左侧：阶段文案 */}
        <div className="relative min-h-[300px]">
          <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-star-faint">// 生成序列 · 微缩复刻</p>
          {PHASES.map((phase, i) => (
            <div
              key={phase.key}
              ref={(el) => { phaseRefs.current[i] = el; }}
              className="mt-10"
              style={{ opacity: i === 0 ? 1 : 0.12 }}
            >
              <p className="font-mono text-[12px] tracking-widest text-cyan">{phase.step}</p>
              <h3 className="mt-2 font-serif text-[32px] font-bold text-star">{phase.title}</h3>
              <p className="mt-3 max-w-md text-[15px] leading-[1.75] text-star-dim">{phase.body}</p>
            </div>
          ))}
        </div>

        {/* 右侧：演示舞台 */}
        <div className="panel relative mx-auto aspect-[13/16] w-full max-w-[520px] overflow-hidden rounded-2xl">
          {/* 输入卡（示意照片） */}
          <div ref={cardRef} className="absolute inset-6 overflow-hidden rounded-xl border border-white/10">
            <img src="/world-desk.png" alt="示意输入：一张桌面照片" className="h-full w-full object-cover" />
            {/* 扫描线 */}
            <div
              ref={scanRef}
              className="absolute left-0 right-0 h-[3px] bg-cyan shadow-[0_0_18px_4px_rgba(87,230,240,.5)]"
              style={{ top: '-8%' }}
            />
          </div>

          {/* 识别标签 */}
          <div ref={tagsRef} className="absolute left-10 top-10 flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <span key={tag} className="rounded-full border border-cyan/50 bg-void/80 px-2.5 py-1 font-mono text-[11px] text-cyan opacity-0">
                {tag}
              </span>
            ))}
          </div>

          {/* 世界法则 */}
          <div ref={rulesRef} className="absolute bottom-10 left-10 space-y-2">
            {RULES.map(([k, v]) => (
              <p key={k} className="flex items-center gap-2 font-mono text-[12px] text-star-dim opacity-0">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_6px_rgba(87,230,240,.8)]" />
                {k} · <span className="text-star">{v}</span>
              </p>
            ))}
          </div>

          {/* 碎裂粒子画布 */}
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

          {/* 传送门 */}
          <div ref={portalRef} className="absolute inset-0 flex items-center justify-center opacity-0">
            <div className="relative h-[72%] w-[72%] overflow-hidden rounded-full shadow-[0_0_60px_rgba(87,230,240,.35),inset_0_0_40px_rgba(87,230,240,.2)] ring-1 ring-cyan/60">
              <img ref={portalImgRef} src="/portal-frame.png" alt="传送门内的世界" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

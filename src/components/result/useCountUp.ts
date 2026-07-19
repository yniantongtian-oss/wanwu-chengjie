import { useEffect, useState } from 'react';

/** 数字滚动：active 后从 0 滚到 target（easeOutCubic），reducedMotion 直接到终值 */
export function useCountUp(target: number, duration: number, active: boolean, reducedMotion = false): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || reducedMotion || duration <= 0) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active, reducedMotion]);

  if (!active) return 0;
  if (reducedMotion || duration <= 0) return target;
  return value;
}

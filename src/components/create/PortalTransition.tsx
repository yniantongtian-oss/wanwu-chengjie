import { motion } from 'framer-motion';
import type { WorldDNA } from '@/engine';
import ProceduralWorld from './ProceduralWorld';

interface PortalTransitionProps {
  dna: WorldDNA | null;
  sampleThumbnail?: string;
  /** 跳过动画进入：压缩转场时长 */
  fast?: boolean;
  reducedMotion: boolean;
  /** 转场结束（白场覆盖后）→ 路由跳转 */
  onDone: () => void;
}

/** 状态 C · 穿越：镜头推进穿门 → 青白过曝 → 跳转 */
export default function PortalTransition({
  dna,
  sampleThumbnail,
  fast = false,
  reducedMotion,
  onDone,
}: PortalTransitionProps) {
  // reduced-motion：400ms 黑场淡入淡出替代穿越
  if (reducedMotion) {
    return (
      <motion.div
        className="fixed inset-0 z-[60] bg-void"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={onDone}
      >
        <span className="absolute left-5 top-4 font-mono text-[12px] tracking-[0.3em] text-star-faint sm:left-8">
          STEP 3/3 · 穿越
        </span>
      </motion.div>
    );
  }

  const duration = fast ? 0.8 : 2.1;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-void">
      <span className="absolute left-5 top-4 z-20 font-mono text-[12px] tracking-[0.3em] text-star-faint sm:left-8">
        STEP 3/3 · 穿越
      </span>

      {/* 推进的门 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 1, filter: 'blur(0px)' }}
          animate={{ scale: 9, filter: ['blur(0px)', 'blur(6px)', 'blur(0px)'] }}
          transition={{
            duration,
            times: [0, 0.55, 1],
            ease: [0.6, 0, 0.2, 1],
          }}
          className="relative h-[200px] w-[200px] overflow-hidden rounded-full sm:h-[260px] sm:w-[260px]"
          style={{
            border: '1px solid rgba(87,230,240,.55)',
            boxShadow:
              '0 0 44px rgba(87,230,240,.35), inset 0 0 32px rgba(87,230,240,.22), 0 0 120px rgba(87,230,240,.12)',
          }}
        >
          {sampleThumbnail ? (
            <img src={sampleThumbnail} alt="" className="h-full w-full object-cover" />
          ) : dna ? (
            <ProceduralWorld dna={dna} className="h-full w-full" />
          ) : (
            <img src="/portal-frame.png" alt="" className="h-full w-full object-cover" />
          )}
        </motion.div>
      </div>

      {/* 星尘四散（视差加速） */}
      {!fast &&
        Array.from({ length: 24 }, (_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          const x = Math.cos(angle) * 60;
          const y = Math.sin(angle) * 60;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-[2px] w-[2px] rounded-full bg-cyan"
              initial={{ x: 0, y: 0, opacity: 0.8 }}
              animate={{ x: `${x}vmax`, y: `${y}vmax`, opacity: 0 }}
              transition={{ duration: duration * 0.85, ease: [0.6, 0, 0.2, 1] }}
            />
          );
        })}

      {/* 青白过曝 */}
      <motion.div
        className="absolute inset-0 z-10"
        style={{ background: 'radial-gradient(circle at center, #E8F0FF 0%, rgba(87,230,240,.9) 70%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration, times: [0, 0.72, 1], ease: 'linear' }}
        onAnimationComplete={onDone}
      />
    </div>
  );
}

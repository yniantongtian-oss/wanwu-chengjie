import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CharRevealProps {
  text: string;
  className?: string;
  /** 每字间隔秒数，默认 0.05 */
  stagger?: number;
  /** 起始延迟秒数 */
  delay?: number;
  as?: 'h1' | 'p' | 'span';
}

/** 字符级拆分动画：逐字上浮 24px + 模糊消退（design.md §5.3） */
export default function CharReveal({ text, className, stagger = 0.05, delay = 0, as = 'span' }: CharRevealProps) {
  const chars = Array.from(text);
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const child = {
    hidden: { y: 24, opacity: 0, filter: 'blur(8px)' },
    show: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
  };
  const Tag = motion[as];
  return (
    <Tag
      className={cn('inline-block', className)}
      variants={container}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {chars.map((ch, i) => (
        <motion.span key={i} variants={child} className="inline-block will-change-transform" aria-hidden>
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </Tag>
  );
}

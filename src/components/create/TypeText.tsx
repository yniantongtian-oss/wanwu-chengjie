import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TypeTextProps {
  text: string;
  /** 每字间隔 ms，默认 45 */
  speed?: number;
  /** 开始延迟 ms */
  delay?: number;
  /** 跳过上场的打字过程，直接显示全文 */
  instant?: boolean;
  showCursor?: boolean;
  className?: string;
  onDone?: () => void;
}

/** 打字机文字：逐字浮现，reduced-motion / instant 时直接显示 */
export default function TypeText({
  text,
  speed = 45,
  delay = 0,
  instant = false,
  showCursor = false,
  className,
  onDone,
}: TypeTextProps) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    doneRef.current = false;
    let interval = 0;
    const timer = window.setTimeout(() => {
      let i = 0;
      interval = window.setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) {
          window.clearInterval(interval);
          if (!doneRef.current) {
            doneRef.current = true;
            onDoneRef.current?.();
          }
        }
      }, speed);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [text, speed, delay]);

  const shown = instant ? text.length : Math.min(count, text.length);
  const typing = shown < text.length;
  return (
    <span className={cn(className)} aria-label={text}>
      <span aria-hidden>{text.slice(0, shown)}</span>
      {showCursor && typing && (
        <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-caret-blink bg-cyan" />
      )}
    </span>
  );
}

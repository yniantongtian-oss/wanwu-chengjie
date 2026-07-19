/**
 * Toast — 底部居中黑面板 + 青描点，3s 消失（design.md §7.5）
 */

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ToastMsg {
  id: number;
  text: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  const push = useCallback((text: string) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, push };
}

export function ToastHost({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[80] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 rounded-full border border-white/10 bg-void-2/95 px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,.5)] backdrop-blur-md"
            role="status"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_rgba(87,230,240,.9)]" />
            <span className="text-[13px] text-star">{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

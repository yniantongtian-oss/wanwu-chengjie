import { AnimatePresence, motion } from 'framer-motion';

/** 底部居中 Toast（design.md §7.5）：黑面板 + 青描点，3s 消失 */
export default function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-8 left-1/2 z-[80] -translate-x-1/2"
          role="status"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-void-2/95 px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,.5)] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_8px_rgba(87,230,240,.8)]" />
            <span className="whitespace-nowrap text-[14px] text-star">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

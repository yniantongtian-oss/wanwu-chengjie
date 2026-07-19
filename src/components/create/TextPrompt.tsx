import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

export const TEXT_MAX = 50;

interface TextPromptProps {
  value: string;
  onChange: (text: string) => void;
}

/** 一句话面板：textarea ≤50 字，mono 字数计数 */
export default function TextPrompt({ value, onChange }: TextPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="panel p-5"
    >
      <label htmlFor="k3-text-input" className="flex items-center gap-2 text-[13px] text-star-dim">
        <Quote className="h-4 w-4 text-cyan" />
        用一句话描述一个东西、一个场景，或一种心情
      </label>
      <textarea
        id="k3-text-input"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, TEXT_MAX))}
        placeholder="一只失眠的台灯"
        rows={3}
        maxLength={TEXT_MAX}
        className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-void px-4 py-3 font-serif text-[18px] leading-relaxed text-star placeholder:text-star-faint focus:border-cyan/50 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[12px] text-star-faint">K3 会记住这句话的每一个字。</p>
        <span className="font-mono text-[12px] tracking-wider text-star-faint">
          {value.length}/{TEXT_MAX}
        </span>
      </div>
    </motion.div>
  );
}

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Smile, X } from 'lucide-react';
import { EMOJI_PRESETS, splitGraphemes } from './inputTypes';
import { cn } from '@/lib/utils';

interface EmojiPromptProps {
  value: string[];
  onChange: (emojis: string[]) => void;
}

/** 三个表情面板：恰好 3 个槽位，支持键盘输入 / 粘贴 / 快捷点选 */
export default function EmojiPrompt({ value, onChange }: EmojiPromptProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const graphemes = splitGraphemes(raw);
    if (graphemes.length === 0) return;
    const next = [...value];
    for (const g of graphemes) {
      if (next.length >= 3) break;
      next.push(g);
    }
    onChange(next.slice(0, 3));
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="panel p-5"
    >
      <p className="flex items-center gap-2 text-[13px] text-star-dim">
        <Smile className="h-4 w-4 text-cyan" />
        挑三个表情，不多不少——它们就是这个世界的三原色
      </p>

      {/* 三个槽位 */}
      <div className="mt-4 flex items-center gap-3">
        {[0, 1, 2].map((i) => {
          const emoji = value[i];
          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => hiddenInputRef.current?.focus()}
                aria-label={emoji ? `第 ${i + 1} 个表情：${emoji}` : `第 ${i + 1} 个表情槽位，点击输入`}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-xl border text-[26px] transition-all',
                  emoji
                    ? 'border-cyan/50 bg-cyan/5 shadow-[0_0_16px_rgba(87,230,240,.12)]'
                    : 'border-dashed border-white/15 bg-void hover:border-cyan/40',
                )}
              >
                {emoji ?? <span className="font-mono text-[13px] text-star-faint">{i + 1}</span>}
              </button>
              {emoji && (
                <button
                  type="button"
                  aria-label={`移除 ${emoji}`}
                  onClick={() => removeAt(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-void-3 text-star-dim transition-colors hover:border-red/60 hover:text-red"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <span className="font-mono text-[12px] tracking-wider text-star-faint">{value.length}/3</span>
      </div>

      {/* 隐藏输入：接收键盘 emoji / 粘贴 */}
      <input
        ref={hiddenInputRef}
        type="text"
        aria-label="输入表情"
        className="mt-3 w-full rounded-xl border border-white/10 bg-void px-4 py-2.5 text-[16px] text-star placeholder:text-star-faint focus:border-cyan/50 focus:outline-none"
        placeholder="在这里直接输入或粘贴表情…"
        value=""
        onChange={(e) => commit(e.target.value)}
      />

      {/* 快捷点选 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {EMOJI_PRESETS.map((e) => (
          <button
            key={e}
            type="button"
            disabled={value.length >= 3}
            onClick={() => onChange([...value, e].slice(0, 3))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[18px] transition-all hover:border-cyan/50 hover:bg-cyan/5 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={`选择 ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

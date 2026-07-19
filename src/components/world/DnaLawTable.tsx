/**
 * DnaLawTable — 世界法则表 + 原始 JSON 折叠面板（world.md S2）
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Braces, Check, ChevronDown, Copy } from 'lucide-react';
import type { WorldDNA } from '@/engine';
import { buildLawRows } from '@/components/world/dnaLaws';
import { copyText } from '@/components/world/archiveUtils';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** 极简 JSON 语法着色：键青、字符串琥珀、数字白、布尔/空紫 */
function highlightJson(json: string): ReactNode[] {
  const tokenRe = /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = tokenRe.exec(json)) !== null) {
    if (match.index > last) out.push(json.slice(last, match.index));
    const [full, str, colon] = match;
    if (str !== undefined) {
      out.push(
        <span key={i++} className={colon !== undefined ? 'text-cyan' : 'text-amber'}>
          {str}
        </span>,
      );
      if (colon !== undefined) out.push(colon);
    } else if (/^(true|false|null)$/.test(full)) {
      out.push(
        <span key={i++} className="text-violet">
          {full}
        </span>,
      );
    } else {
      out.push(
        <span key={i++} className="text-star">
          {full}
        </span>,
      );
    }
    last = match.index + full.length;
  }
  if (last < json.length) out.push(json.slice(last));
  return out;
}

interface DnaLawTableProps {
  dna: WorldDNA;
  onToast: (text: string) => void;
}

export default function DnaLawTable({ dna, onToast }: DnaLawTableProps) {
  const rows = useMemo(() => buildLawRows(dna), [dna]);
  const json = useMemo(() => JSON.stringify(dna, null, 2), [dna]);
  const highlighted = useMemo(() => highlightJson(json), [json]);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyJson = async () => {
    const ok = await copyText(json);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      onToast('原始 DNA JSON 已复制');
    } else {
      onToast('复制失败，请手动选择文本复制');
    }
  };

  return (
    <div>
      {/* 法则行 */}
      <div className="panel overflow-hidden">
        {rows.map((row, i) => (
          <motion.div
            key={row.key}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-25%' }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: EASE_OUT }}
            className={cn(
              'group grid grid-cols-1 gap-1.5 px-5 py-4 transition-colors duration-300 hover:bg-white/[0.02] sm:grid-cols-[3fr_3fr] sm:gap-4 md:grid-cols-[220px_minmax(0,1fr)]',
              i > 0 && 'border-t border-white/5',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: '-25%' }}
                transition={{ duration: 0.4, delay: i * 0.07 + 0.15, ease: EASE_OUT }}
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_rgba(87,230,240,.9)]"
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-star">{row.name}</p>
                <p className="truncate font-mono text-[12px] tracking-wider text-star-faint">{row.value}</p>
              </div>
            </div>
            <p className="pl-[18px] text-[13px] leading-relaxed text-star-dim sm:pl-0 sm:pt-0.5">{row.lore}</p>
          </motion.div>
        ))}
      </div>

      {/* 查看原始 JSON */}
      <button
        type="button"
        onClick={() => setJsonOpen((o) => !o)}
        aria-expanded={jsonOpen}
        className="mt-5 inline-flex items-center gap-2 font-mono text-[13px] tracking-wider text-star-dim transition-colors hover:text-cyan"
      >
        <Braces className="h-4 w-4" />
        {jsonOpen ? '收起原始 JSON' : '查看原始 JSON'}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', jsonOpen && 'rotate-180')} />
      </button>

      <motion.div
        initial={false}
        animate={{ height: jsonOpen ? 'auto' : 0, opacity: jsonOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="overflow-hidden"
      >
        <div className="panel relative mt-4">
          <button
            type="button"
            onClick={handleCopyJson}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-void/70 px-3 py-1.5 font-mono text-[11px] tracking-wider text-star-dim backdrop-blur transition-all hover:border-cyan/50 hover:text-cyan"
          >
            {copied ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3" />}
            {copied ? '已复制' : '复制'}
          </button>
          <pre className="max-h-[420px] overflow-auto p-5 pr-20 font-mono text-[12px] leading-[1.7] text-star-dim">
            <code>{highlighted}</code>
          </pre>
        </div>
      </motion.div>
    </div>
  );
}

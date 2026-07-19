import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, X } from 'lucide-react';
import type { RunResult, WorldDNA } from '@/engine';
import { BIOME_LABELS, RARITY_LABELS } from '@/engine';
import { formatTimeMs } from '@/components/create/dnaLabels';

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  dna: WorldDNA;
  run: RunResult | null;
  stability: number;
  victory: boolean;
  challengeUrl: string;
  onError: (message: string) => void;
}

/** 生成分享卡：html-to-image 导出 1200×630 静态卡（og-cover 底 + 成绩 + 二维码） */
export default function ShareCardModal({
  open,
  onClose,
  dna,
  run,
  stability,
  victory,
  challengeUrl,
  onError,
}: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // 等一帧，确保离屏节点完成布局与图片加载
    const timer = window.setTimeout(() => {
      const node = cardRef.current;
      if (!node) return;
      setPngUrl(null);
      setRendering(true);
      toPng(node, { pixelRatio: 1, cacheBust: true, backgroundColor: '#05070D' })
        .catch(() => toPng(node, { pixelRatio: 1, skipFonts: true, backgroundColor: '#05070D' }))
        .then((url) => {
          if (cancelled) return;
          setPngUrl(url);
          setRendering(false);
        })
        .catch(() => {
          if (cancelled) return;
          setRendering(false);
          onError('分享卡生成失败，请再试一次');
          onClose();
        });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, onClose, onError]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const scoreLine = run
    ? `用时 ${formatTimeMs(run.timeMs)} · 碎片 ${run.collected}/${run.total} · 稳定度 ${Math.round(stability)}% · SCORE ${run.score.toLocaleString()}`
    : `SEED ${dna.seed} · 稳定度 ${Math.round(stability)}%`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-void/85 p-4 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="分享卡预览"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="panel w-full max-w-[760px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[12px] tracking-[0.25em] text-star-faint">SHARE CARD // 1200×630</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-star-dim transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-xl border border-white/10 bg-void">
              {rendering || !pngUrl ? (
                <div className="flex flex-col items-center gap-3 py-16 text-star-dim">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan" />
                  <p className="font-mono text-[12px] tracking-widest">正在绘制分享卡…</p>
                </div>
              ) : (
                <img src={pngUrl} alt={`${dna.worldName} 分享卡`} className="w-full rounded-xl" />
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-ghost h-11 px-6 text-[14px]">
                关闭
              </button>
              {pngUrl && (
                <a
                  href={pngUrl}
                  download={`${dna.worldCode}-share.png`}
                  className="btn-primary h-11 px-6 text-[14px]"
                >
                  <Download className="h-4 w-4" /> 下载 PNG
                </a>
              )}
            </div>
          </motion.div>

          {/* ── 离屏分享卡节点（1200×630，html-to-image 导出源） ── */}
          <div style={{ position: 'fixed', left: -2400, top: 0 }} aria-hidden>
            <div
              ref={cardRef}
              style={{
                width: 1200,
                height: 630,
                position: 'relative',
                overflow: 'hidden',
                background: '#05070D',
                fontFamily: '"Noto Sans SC", system-ui, sans-serif',
                color: '#E8F0FF',
              }}
            >
              <img
                src="/og-cover.png"
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(100deg, rgba(5,7,13,.94) 30%, rgba(5,7,13,.55) 70%, rgba(5,7,13,.85))',
                }}
              />
              {/* 顶部档案行 */}
              <div
                style={{
                  position: 'absolute',
                  top: 36,
                  left: 56,
                  right: 56,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 16,
                  letterSpacing: 6,
                  color: '#4A5568',
                }}
              >
                <span>K3-WORLD ARCHIVE</span>
                <span>{victory ? 'CLEARED' : 'FADED'}</span>
              </div>
              {/* 主体 */}
              <div style={{ position: 'absolute', left: 56, top: 150, width: 760 }}>
                <div
                  style={{
                    fontFamily: '"Noto Serif SC", serif',
                    fontWeight: 900,
                    fontSize: 64,
                    lineHeight: 1.25,
                  }}
                >
                  {dna.worldName}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 22,
                    letterSpacing: 3,
                    color: '#57E6F0',
                  }}
                >
                  {dna.worldCode}
                </div>
                <div style={{ marginTop: 18, display: 'flex', gap: 14, fontSize: 18, color: '#93A0B8' }}>
                  <span style={{ border: '1px solid rgba(147,160,184,.35)', borderRadius: 999, padding: '5px 16px' }}>
                    {BIOME_LABELS[dna.biome]}
                  </span>
                  <span style={{ border: '1px solid rgba(87,230,240,.45)', borderRadius: 999, padding: '5px 16px', color: '#57E6F0' }}>
                    {dna.rarity.toUpperCase()} · {RARITY_LABELS[dna.rarity]}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 26,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 20,
                    color: '#93A0B8',
                  }}
                >
                  {scoreLine}
                </div>
                <div
                  style={{
                    marginTop: 22,
                    fontFamily: '"Noto Serif SC", serif',
                    fontStyle: 'italic',
                    fontSize: 24,
                    color: '#E8F0FF',
                    opacity: 0.92,
                  }}
                >
                  「{dna.shareText}」
                </div>
              </div>
              {/* 二维码 */}
              <div
                style={{
                  position: 'absolute',
                  right: 56,
                  bottom: 48,
                  background: '#E8F0FF',
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <QRCodeSVG value={challengeUrl} size={132} level="M" bgColor="#E8F0FF" fgColor="#05070D" />
              </div>
              {/* 底部链接 */}
              <div
                style={{
                  position: 'absolute',
                  left: 56,
                  bottom: 52,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 14,
                  letterSpacing: 2,
                  color: '#4A5568',
                }}
              >
                扫码进入这个世界 · POWERED BY KIMI K3
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

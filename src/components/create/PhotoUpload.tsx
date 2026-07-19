import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { fileToCleanDataUrl, isImageFile } from './photoUtils';

interface PhotoUploadProps {
  value: string | null;
  onReady: (dataUrl: string, meta: { name: string; size: number }) => void;
  onClear: () => void;
  /** 从拍照降级而来时展示的提示 */
  notice?: string | null;
}

/** 上传照片面板：点击选择 / 拖拽，FileReader 读 dataURL + 画布重编码清 EXIF */
export default function PhotoUpload({ value, onReady, onClear, notice }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      setError('');
      if (!isImageFile(file)) {
        setError('这个文件不是图片，换一张试试。');
        return;
      }
      setReading(true);
      fileToCleanDataUrl(file)
        .then((dataUrl) => onReady(dataUrl, { name: file.name, size: file.size }))
        .catch(() => setError('图片读取失败，换一张试试。'))
        .finally(() => setReading(false));
    },
    [onReady],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="panel overflow-hidden"
    >
      {notice && (
        <div className="border-b border-amber/20 bg-amber/5 px-5 py-2.5 text-[12px] text-amber">
          {notice}，已为你切换为上传照片。
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {value ? (
        <div className="relative">
          <img src={value} alt="已上传照片预览" className="max-h-[320px] w-full object-contain bg-void" />
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <p className="flex items-center gap-1.5 text-[12px] text-star-faint">
              <ShieldCheck className="h-3.5 w-3.5 text-green" />
              已清除 EXIF · 照片仅本地处理，公开世界不展示原图
            </p>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-star-faint px-4 py-2 text-[13px] text-star-dim transition-colors hover:border-cyan/60 hover:text-cyan"
            >
              <RefreshCw className="h-3.5 w-3.5" /> 换一张
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-[220px] w-full flex-col items-center justify-center gap-4 border-2 border-dashed transition-all ${
            dragOver ? 'border-cyan/70 bg-cyan/5' : 'border-white/10 hover:border-cyan/40 hover:bg-cyan/[.02]'
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan/30 bg-cyan/5">
            <ImagePlus className="h-6 w-6 text-cyan" />
          </span>
          <span className="text-[15px] text-star">
            {reading ? '正在读取…' : '点击选择，或把照片拖到这里'}
          </span>
          <span className="max-w-sm px-6 text-center text-[12px] leading-relaxed text-star-faint">
            照片仅在你的浏览器本地处理，已自动清除 EXIF 信息；公开世界不会展示原图。
          </span>
          {error && <span className="text-[12px] text-red">{error}</span>}
        </button>
      )}
    </motion.div>
  );
}

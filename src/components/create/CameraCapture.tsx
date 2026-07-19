import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, RefreshCw, Upload, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  /** 拍下照片（canvas 重编码后的 dataURL，天然不含 EXIF） */
  onCapture: (dataUrl: string, meta: { name: string; size: number }) => void;
  /** 摄像头不可用 / 被拒绝：通知父级自动切换到上传 */
  onFallbackToUpload: (reason: string) => void;
}

type CamState = 'starting' | 'ready' | 'error';

/** 拍照面板：getUserMedia 取景 → 捕获帧 → 本地 dataURL */
export default function CameraCapture({ onCapture, onFallbackToUpload }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const notifiedRef = useRef(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stopStream();
    setState('starting');
    setErrorMsg('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setErrorMsg('当前浏览器不支持摄像头调用');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setState('ready');
    } catch (err) {
      stopStream();
      setState('error');
      const name = err instanceof DOMException ? err.name : '';
      setErrorMsg(
        name === 'NotAllowedError'
          ? '摄像头权限被拒绝'
          : name === 'NotFoundError'
            ? '没有找到可用的摄像头'
            : '摄像头暂时不可用',
      );
    }
  }, [stopStream]);

  useEffect(() => {
    // 延迟到宏任务，避免在 effect 体内同步 setState
    const id = window.setTimeout(() => void start(), 0);
    return () => {
      window.clearTimeout(id);
      stopStream();
    };
  }, [start, stopStream]);

  // 失败 / 被拒绝：优雅降级，自动切到上传（仅通知一次）
  useEffect(() => {
    if (state === 'error' && !notifiedRef.current) {
      notifiedRef.current = true;
      const timer = window.setTimeout(() => onFallbackToUpload(errorMsg), 1600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [state, errorMsg, onFallbackToUpload]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    // 不停止流：允许用户立即重拍；流在组件卸载时统一释放
    onCapture(dataUrl, {
      name: `camera-${Date.now()}.jpg`,
      size: Math.round(dataUrl.length * 0.75),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="panel overflow-hidden"
    >
      <div className="relative aspect-[4/3] w-full bg-void">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          aria-label="摄像头取景画面"
        />
        {/* 取景框四角 */}
        {state === 'ready' && (
          <div aria-hidden className="pointer-events-none absolute inset-4">
            {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map(
              (pos) => (
                <span key={pos} className={`absolute h-6 w-6 border-cyan/80 ${pos}`} />
              ),
            )}
          </div>
        )}
        {state === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-star-dim">
            <Loader2 className="h-6 w-6 animate-spin text-cyan" />
            <p className="font-mono text-[12px] tracking-widest">正在唤醒摄像头…</p>
          </div>
        )}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Camera className="h-6 w-6 text-amber" />
            <p className="text-[14px] text-star-dim">{errorMsg}，已为你切换为上传照片。</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void start()}
                className="inline-flex items-center gap-1.5 rounded-full border border-star-faint px-4 py-2 text-[13px] text-star-dim transition-colors hover:border-cyan/60 hover:text-cyan"
              >
                <RefreshCw className="h-3.5 w-3.5" /> 重试
              </button>
              <button
                type="button"
                onClick={() => onFallbackToUpload(errorMsg)}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan/60 px-4 py-2 text-[13px] text-cyan transition-colors hover:bg-cyan/10"
              >
                <Upload className="h-3.5 w-3.5" /> 去上传
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <p className="text-[12px] leading-relaxed text-star-faint">
          照片仅在本地处理，已自动清除 EXIF 信息；公开世界不会展示原图。
        </p>
        <button
          type="button"
          onClick={capture}
          disabled={state !== 'ready'}
          className="btn-primary h-11 shrink-0 px-6 text-[14px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Camera className="h-4 w-4" /> 拍摄
        </button>
      </div>
    </motion.div>
  );
}

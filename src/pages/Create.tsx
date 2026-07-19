import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ImagePlus, Quote, Smile, Sparkles, RefreshCw } from 'lucide-react';
import { createDefaultDNA, generateWorldDNA, saveWorld } from '@/engine';
import type { WorldDNA } from '@/engine';
import type { GenSession, InputMethod, InputPayload } from '@/components/create/inputTypes';
import { photoTagsFromFile, tagsForPayload, toGenerationInput } from '@/components/create/inputTypes';
import CameraCapture from '@/components/create/CameraCapture';
import PhotoUpload from '@/components/create/PhotoUpload';
import TextPrompt from '@/components/create/TextPrompt';
import EmojiPrompt from '@/components/create/EmojiPrompt';
import SampleWorlds from '@/components/create/SampleWorlds';
import type { SampleEntry } from '@/components/create/SampleWorlds';
import GeneratingSequence from '@/components/create/GeneratingSequence';
import PortalTransition from '@/components/create/PortalTransition';
import { usePrefersReducedMotion } from '@/components/create/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

type PageState = 'input' | 'generating' | 'portal';

const METHOD_META: Array<{
  key: InputMethod;
  title: string;
  desc: string;
  icon: typeof Camera;
}> = [
  { key: 'camera', title: '拍一张', desc: '调用摄像头，就地取材', icon: Camera },
  { key: 'upload', title: '上传照片', desc: '支持拖拽，本地处理', icon: ImagePlus },
  { key: 'text', title: '一句话', desc: '≤50 字，写给 K3', icon: Quote },
  { key: 'emoji', title: '三个表情', desc: '恰好 3 个，不多不少', icon: Smile },
];

const METHOD_LABEL: Record<InputMethod, string> = {
  camera: '拍摄的照片',
  upload: '上传的照片',
  text: '一句话',
  emoji: '三个表情',
};

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** 创造页 /create：input → generating → portal 三状态状态机 */
export default function Create() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  const [pageState, setPageState] = useState<PageState>('input');
  const [activeMethod, setActiveMethod] = useState<InputMethod | null>(null);
  const [inputs, setInputs] = useState<Record<InputMethod, InputPayload | null>>({
    camera: null,
    upload: null,
    text: null,
    emoji: null,
  });
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  /** 表情草稿：允许 0–3 个中间态，恰好 3 个时才算有效输入 */
  const [emojiDraft, setEmojiDraft] = useState<string[]>([]);
  const [session, setSession] = useState<GenSession | null>(null);
  const [dna, setDna] = useState<WorldDNA | null>(null);
  const [portalFast, setPortalFast] = useState(false);
  const worldIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 生成 / 穿越期间锁定背景滚动
  useEffect(() => {
    if (pageState === 'input') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pageState]);

  // ── 输入收集 ───────────────────────────────────────

  const setInput = useCallback((method: InputMethod, payload: InputPayload | null) => {
    setInputs((prev) => ({ ...prev, [method]: payload }));
  }, []);

  const handlePhotoReady = useCallback(
    (origin: 'camera' | 'upload') => (dataUrl: string, meta: { name: string; size: number }) => {
      const tags = photoTagsFromFile(meta.name, meta.size);
      setInput(origin, { type: 'photo', dataUrl, tags, origin });
    },
    [setInput],
  );

  const handleCameraFallback = useCallback(
    (reason: string) => {
      setCameraNotice(reason || '摄像头不可用');
      setActiveMethod('upload');
    },
    [],
  );

  /** 当前有效输入：优先当前面板，其次任一已填方式 */
  const currentPayload = useMemo<InputPayload | null>(() => {
    if (activeMethod && inputs[activeMethod]) return inputs[activeMethod];
    for (const m of METHOD_META) {
      if (inputs[m.key]) return inputs[m.key];
    }
    return null;
  }, [activeMethod, inputs]);

  const currentMethod = useMemo<InputMethod | null>(() => {
    if (!currentPayload) return null;
    if (activeMethod && inputs[activeMethod]) return activeMethod;
    for (const m of METHOD_META) {
      if (inputs[m.key]) return m.key;
    }
    return null;
  }, [activeMethod, inputs, currentPayload]);

  const clearCurrent = () => {
    if (!currentMethod) return;
    setInput(currentMethod, null);
    if (currentMethod === 'emoji') setEmojiDraft([]);
    setActiveMethod(currentMethod);
  };

  // ── 生成会话 ───────────────────────────────────────

  const beginSession = useCallback((sess: GenSession) => {
    worldIdRef.current = null;
    setDna(null);
    setSession(sess);
    setPageState('generating');
    // DNA 异步生成与分镜并行：分镜结束时数据必然就绪
    sess.dnaPromise
      .then((d) => {
        if (!mountedRef.current) return;
        saveWorld(d);
        worldIdRef.current = d.worldCode;
        setDna(d);
      })
      .catch(() => {
        // dnaPromise 已内置兜底，这里仅是最后保险
        if (!mountedRef.current) return;
        const fallback = createDefaultDNA();
        saveWorld(fallback);
        worldIdRef.current = fallback.worldCode;
        setDna(fallback);
      });
  }, []);

  const startGeneration = () => {
    if (!currentPayload) return;
    // 生成失败降级到引擎默认模板 DNA，不阻断用户
    const dnaPromise = generateWorldDNA(toGenerationInput(currentPayload)).catch(() =>
      createDefaultDNA(),
    );
    beginSession({ payload: currentPayload, dnaPromise, skipScan: false });
  };

  const startSample = (entry: SampleEntry) => {
    const payload: InputPayload = { type: 'text', text: entry.dna.worldName };
    beginSession({
      payload,
      dnaPromise: Promise.resolve(entry.dna),
      skipScan: true,
      sampleThumbnail: entry.thumbnail,
    });
  };

  const enterPortal = useCallback(
    (fast: boolean) => {
      const go = () => {
        if (!mountedRef.current) return;
        setPortalFast(fast);
        setPageState('portal');
      };
      if (worldIdRef.current || !session) {
        go();
        return;
      }
      // 跳过时分镜可能刚起步：等 DNA 就绪并保存后再穿越
      session.dnaPromise
        .then((d) => {
          if (!worldIdRef.current) {
            saveWorld(d);
            worldIdRef.current = d.worldCode;
            if (mountedRef.current) setDna(d);
          }
          go();
        })
        .catch(() => {
          if (!worldIdRef.current) {
            const fallback = createDefaultDNA();
            saveWorld(fallback);
            worldIdRef.current = fallback.worldCode;
            if (mountedRef.current) setDna(fallback);
          }
          go();
        });
    },
    [session],
  );

  const handlePortalDone = useCallback(() => {
    const id = worldIdRef.current;
    if (id) {
      navigate(`/play/${encodeURIComponent(id)}`);
    } else {
      // 理论上不可达（dnaPromise 必 resolve），保底回输入态
      setPageState('input');
    }
  }, [navigate]);

  const sequenceTags = useMemo(() => {
    if (!session) return [];
    if (dna?.sourceTags?.length) return dna.sourceTags.slice(0, 5);
    return tagsForPayload(session.payload);
  }, [session, dna]);

  // ── 渲染 ───────────────────────────────────────────

  if (pageState === 'generating' && session) {
    return (
      <GeneratingSequence
        session={session}
        dna={dna}
        tags={sequenceTags}
        reducedMotion={reducedMotion}
        onEnter={() => enterPortal(false)}
        onSkip={() => enterPortal(true)}
      />
    );
  }

  if (pageState === 'portal') {
    return (
      <PortalTransition
        dna={dna}
        sampleThumbnail={session?.sampleThumbnail}
        fast={portalFast}
        reducedMotion={reducedMotion}
        onDone={handlePortalDone}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
      {/* 步骤暗示 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center font-mono text-[12px] tracking-[0.3em] text-star-faint"
      >
        STEP 1/3 · 输入
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="mt-4 text-center font-serif text-[32px] font-bold leading-tight text-star sm:text-[40px]"
      >
        给它看点什么
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: EASE_OUT }}
        className="mt-3 text-center text-[15px] leading-[1.75] text-star-dim"
      >
        一张照片、一句话，或者三个表情。剩下的交给 K3。
      </motion.p>

      {/* 输入四宫格 */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {METHOD_META.map((m, i) => {
          const Icon = m.icon;
          const active = activeMethod === m.key;
          const filled = inputs[m.key] !== null;
          return (
            <motion.button
              key={m.key}
              type="button"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.45, ease: EASE_OUT }}
              onClick={() => setActiveMethod(m.key)}
              aria-pressed={active}
              className={cn(
                'group relative flex h-[200px] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border bg-void-2 transition-all duration-300 hover:-translate-y-1',
                active
                  ? 'border-cyan/60 shadow-[0_0_32px_rgba(87,230,240,.12)]'
                  : 'border-white/10 hover:border-cyan/40',
              )}
            >
              {/* 拍照卡 hover：取景框四角点亮 */}
              {m.key === 'camera' && (
                <div aria-hidden className="pointer-events-none absolute inset-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {[
                    'left-0 top-0 border-l-2 border-t-2',
                    'right-0 top-0 border-r-2 border-t-2',
                    'bottom-0 left-0 border-b-2 border-l-2',
                    'bottom-0 right-0 border-b-2 border-r-2',
                  ].map((pos) => (
                    <span key={pos} className={`absolute h-5 w-5 border-cyan/70 ${pos}`} />
                  ))}
                </div>
              )}
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(87,230,240,.25)]',
                  active ? 'border-cyan/60 bg-cyan/10' : 'border-white/10 bg-white/[.03]',
                )}
              >
                <Icon className={cn('h-6 w-6 transition-colors', active ? 'text-cyan' : 'text-star-dim group-hover:text-cyan')} />
              </span>
              <span className="font-serif text-[18px] font-bold text-star">{m.title}</span>
              <span className="text-[12px] text-star-faint">{m.desc}</span>
              {filled && (
                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-cyan">
                  <span className="h-1 w-1 rounded-full bg-cyan" /> 已就绪
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 输入面板（AnimatePresence 交叉淡入 250ms） */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          {activeMethod === 'camera' && (
            <CameraCapture
              key="camera"
              onCapture={handlePhotoReady('camera')}
              onFallbackToUpload={handleCameraFallback}
            />
          )}
          {activeMethod === 'upload' && (
            <PhotoUpload
              key="upload"
              value={inputs.upload?.type === 'photo' ? inputs.upload.dataUrl : null}
              onReady={handlePhotoReady('upload')}
              onClear={() => setInput('upload', null)}
              notice={cameraNotice}
            />
          )}
          {activeMethod === 'text' && (
            <TextPrompt
              key="text"
              value={inputs.text?.type === 'text' ? inputs.text.text : ''}
              onChange={(text) => setInput('text', text.trim() ? { type: 'text', text } : null)}
            />
          )}
          {activeMethod === 'emoji' && (
            <EmojiPrompt
              key="emoji"
              value={emojiDraft}
              onChange={(emojis) => {
                setEmojiDraft(emojis);
                setInput('emoji', emojis.length === 3 ? { type: 'emoji', emojis } : null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 已选输入预览条 */}
      <AnimatePresence>
        {currentPayload && currentMethod && (
          <motion.div
            key="preview-bar"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="panel sticky bottom-6 z-30 mt-8 flex flex-col items-stretch gap-4 p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {currentPayload.type === 'photo' ? (
                <img
                  src={currentPayload.dataUrl}
                  alt="输入预览"
                  className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/5 font-serif text-[20px] text-cyan">
                  {currentPayload.type === 'text' ? '“' : currentPayload.emojis[0]}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[0.2em] text-star-faint">
                  INPUT // {METHOD_LABEL[currentMethod]}
                </p>
                <p className="mt-1 truncate text-[14px] text-star">
                  {currentPayload.type === 'photo' && `识别到：${currentPayload.tags.join('、')}`}
                  {currentPayload.type === 'text' && `「${currentPayload.text}」`}
                  {currentPayload.type === 'emoji' && currentPayload.emojis.join(' ')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={clearCurrent}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-star-faint px-5 text-[13px] text-star-dim transition-colors hover:border-cyan/60 hover:text-cyan"
              >
                <RefreshCw className="h-3.5 w-3.5" /> 重新选择
              </button>
              <button
                type="button"
                onClick={startGeneration}
                className="btn-primary h-11 px-6 text-[14px]"
              >
                <Sparkles className="h-4 w-4" /> 生成我的世界
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 示例世界 */}
      <SampleWorlds onPick={startSample} />

      {/* 隐私提示 */}
      <p className="mt-12 text-center text-[13px] leading-relaxed text-star-faint">
        无需注册。你的世界默认私密，公开前只属于你。原始照片不会被公开。
      </p>
    </div>
  );
}

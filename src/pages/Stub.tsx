import { useParams } from 'react-router';
import { Link } from 'react-router';

interface StubPageProps {
  title: string;
}

/** 占位 stub 页：Layout 由 App 统一包裹，此处仅渲染居中文案 */
export default function StubPage({ title }: StubPageProps) {
  const params = useParams();
  const paramText = Object.values(params).filter(Boolean).join(' / ');
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-star-faint">
        {paramText ? `// ${paramText}` : '// UNDER CONSTRUCTION'}
      </p>
      <h1 className="font-serif text-[32px] font-bold text-star">{title} · 建设中</h1>
      <p className="max-w-md text-[15px] leading-[1.75] text-star-dim">
        这扇传送门还在组装。世界档案局正在连夜施工。
      </p>
      <Link to="/" className="btn-ghost mt-4">
        返回首页
      </Link>
    </div>
  );
}

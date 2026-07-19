import { Link } from 'react-router';

/** Footer (design.md §7.2)：三列 + 英文斜体分隔线 + 等宽小字 */
export default function Footer() {
  return (
    <footer className="relative mt-24">
      {/* 顶部 1px 渐变线 + 英文斜体 */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <p className="pt-6 text-center font-garamond text-[15px] italic text-star-dim">
        Everything becomes a world.
      </p>

      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-14 sm:grid-cols-3">
        {/* 品牌与口号 */}
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-6 w-6" />
            <span className="font-serif text-[17px] font-bold text-star">万物成界</span>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-star-dim">
            我没有让 K3 生成一张图片；我让它把这张图片，变成了一个世界。
          </p>
        </div>

        {/* 导航 */}
        <div>
          <h4 className="font-mono text-[12px] uppercase tracking-widest text-star-faint">导航</h4>
          <ul className="mt-4 space-y-2.5 text-[14px] text-star-dim">
            <li><Link to="/create" className="transition-colors hover:text-cyan">创造</Link></li>
            <li><Link to="/square" className="transition-colors hover:text-cyan">世界广场</Link></li>
            <li><Link to="/square" className="transition-colors hover:text-cyan">每日世界</Link></li>
          </ul>
        </div>

        {/* 原则 */}
        <div>
          <h4 className="font-mono text-[12px] uppercase tracking-widest text-star-faint">原则</h4>
          <ul className="mt-4 space-y-2.5 text-[14px] text-star-dim">
            <li>无需注册即可试玩</li>
            <li>默认私密，公开前只属于你</li>
            <li>种子可复现，世界可重返</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 py-6 text-center font-mono text-[11px] tracking-widest text-star-faint">
        POWERED BY KIMI K3 · 世界档案局
      </div>
    </footer>
  );
}

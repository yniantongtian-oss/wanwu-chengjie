/**
 * EmptyState — 广场空状态（square.md S4）
 * empty-orbit.png 插图 + 衬线文案 + 「创造第一个世界」主按钮。
 */

import { Link } from 'react-router';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  /** 是否有激活的筛选（决定展示「清除筛选」次按钮） */
  filtersActive: boolean;
  onClearFilters?: () => void;
}

export default function EmptyState({ filtersActive, onClearFilters }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-5 py-20 text-center"
    >
      <img src="/empty-orbit.png" alt="一艘发光纸船绕着空轨道飞行" className="w-56 max-w-full opacity-90 md:w-64" />
      <h3 className="font-serif text-[24px] font-bold text-star">
        {filtersActive ? '这片星域没有匹配的世界' : '这片星域还没有世界'}
      </h3>
      <p className="max-w-sm text-[14px] leading-[1.75] text-star-dim">
        {filtersActive
          ? '换一个关键词，或者放宽稀有度筛选，再巡一遍星域。'
          : '拍下任何东西，让它成为第一个被点亮的世界。'}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <Link to="/create" className="btn-primary">
          创造第一个世界
        </Link>
        {filtersActive && onClearFilters && (
          <button type="button" onClick={onClearFilters} className="btn-ghost h-12 px-6 text-[14px]">
            清除筛选
          </button>
        )}
      </div>
    </motion.div>
  );
}

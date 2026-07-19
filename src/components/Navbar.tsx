import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { Menu, X, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

const MUTE_KEY = 'k3.muted.v1';

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

const NAV_LINKS = [
  { to: '/create', label: '创造' },
  { to: '/square', label: '世界广场' },
  { to: '/#how-it-works', label: '玩法说明', anchor: 'how-it-works' },
];

/** Navbar (design.md §7.1)：sticky top-0 z-50，高 64px，滚动 >40px 背景渐变 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // ignore
    }
  }, [muted]);

  const goAnchor = (id: string) => {
    setDrawerOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-16 border-b transition-all duration-300',
        scrolled
          ? 'border-white/10 bg-void/80 backdrop-blur-md'
          : 'border-white/5 bg-transparent backdrop-blur-sm',
      )}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        {/* 左：Logo */}
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
          <img src="/logo.svg" alt="万物成界" className="h-6 w-6" />
          <span className="font-serif text-[17px] font-bold tracking-wide text-star">万物成界</span>
        </Link>

        {/* 中：导航（桌面） */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="主导航">
          {NAV_LINKS.map((link) =>
            link.anchor ? (
              <button
                key={link.label}
                type="button"
                onClick={() => goAnchor(link.anchor!)}
                className="text-[14px] text-star-dim transition-colors hover:text-cyan"
              >
                {link.label}
              </button>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'text-[14px] transition-colors hover:text-cyan',
                    isActive ? 'text-cyan' : 'text-star-dim',
                  )
                }
              >
                {link.label}
              </NavLink>
            ),
          )}
        </nav>

        {/* 右：静音 + 主按钮 + 汉堡 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? '取消静音' : '静音'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-star-dim transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <Link to="/create" className="btn-primary hidden h-10 px-5 text-[14px] sm:inline-flex">
            创造我的世界
          </Link>
          <button
            type="button"
            aria-label="打开菜单"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-star md:hidden"
          >
            {drawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 移动端抽屉 */}
      {drawerOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-void/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-2 px-6 py-10" aria-label="移动端导航">
            {NAV_LINKS.map((link) =>
              link.anchor ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => goAnchor(link.anchor!)}
                  className="border-b border-white/5 py-4 text-left font-serif text-[26px] font-bold text-star"
                >
                  {link.label}
                </button>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setDrawerOpen(false)}
                  className="border-b border-white/5 py-4 font-serif text-[26px] font-bold text-star"
                >
                  {link.label}
                </NavLink>
              ),
            )}
            <Link to="/create" onClick={() => setDrawerOpen(false)} className="btn-primary mt-8 w-full">
              创造我的世界
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

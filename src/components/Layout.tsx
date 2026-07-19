import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/**
 * Layout — children 模式（与 App.tsx 的 <Layout><Routes/></Layout> 配套）。
 * Navbar 为 sticky 布局，页面无需自行补偿导航高度。
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-void text-star">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

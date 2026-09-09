import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import TopProgressBar from './TopProgressBar';
import BottomNav from './BottomNav';

function PageFallback() {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
      <div className="w-7 h-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">جاري التحميل...</span>
    </div>
  );
}

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 max-w-full overflow-x-hidden">
      <TopProgressBar />
      <Header />
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <Sidebar />
        <main className="flex-1 p-2.5 sm:p-5 md:p-6 lg:p-8 pb-20 lg:pb-8 w-full max-w-full min-w-0">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <div className="pb-16 lg:pb-0">
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}



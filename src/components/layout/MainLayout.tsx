import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import TopProgressBar from './TopProgressBar';
import BottomNav from './BottomNav';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 max-w-full overflow-x-hidden">
      <TopProgressBar />
      <Header />
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <Sidebar />
        <main className="flex-1 p-2.5 sm:p-5 md:p-6 lg:p-8 pb-20 lg:pb-8 w-full max-w-full min-w-0">
          <Outlet />
        </main>
      </div>
      <div className="pb-16 lg:pb-0">
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}



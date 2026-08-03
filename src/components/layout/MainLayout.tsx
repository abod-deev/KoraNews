import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <Header />
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

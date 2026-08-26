import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Home,
  Newspaper,
  Calendar,
  Settings,
  LogIn,
  LogOut,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useEffect, useRef } from 'react';

interface SideNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideNavDrawer({ isOpen, onClose }: SideNavDrawerProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);

  const canAccessAdmin = !!(
    user &&
    (user.isAdmin ||
      user.role === 'admin' ||
      user.role === 'superadmin' ||
      user.email === 'abod46071@gmail.com')
  );

  const mainNavItems = [
    { name: 'الرئيسية', path: '/', icon: Home, description: 'الصفحة الرئيسية والمستجدات' },
    { name: 'جميع الأخبار', path: '/news', icon: Newspaper, description: 'أخبار الكرة العالمية والمحلية' },
    { name: 'مباريات اليوم', path: '/matches', icon: Calendar, description: 'مواعيد ونتائج المباريات الحية' },
  ];

  // Auto close on route/URL change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname, location.search]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeCategoryParam = new URLSearchParams(location.search).get('category');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden dir-rtl"
          id="side-nav-drawer-root"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop with click to dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-hidden="true"
            className="absolute inset-0 bg-black/70 dark:bg-black/85 backdrop-blur-[3px] transition-opacity cursor-pointer"
          />

          {/* Side Drawer Container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex h-full">
            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="pointer-events-auto w-84 sm:w-96 max-w-[90vw] h-full flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-2xl border-l border-gray-200 dark:border-gray-800 select-none"
            >
              {/* 1. Drawer Header (Pinned at Top) */}
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/90">
                <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-brand/25 group-hover:scale-105 transition-transform">
                    K
                  </div>
                  <div>
                    <span className="text-lg font-black text-brand block leading-tight">كورة نيوز</span>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">المنصة الرياضية المتكاملة</span>
                  </div>
                </Link>

                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm transition-all cursor-pointer"
                  aria-label="إغلاق القائمة"
                  id="close-drawer-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2. Scrollable Body showing ALL sections completely */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-5">
                {/* Main Pages Section */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 pb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand" />
                    <span>الأقسام الرئيسية</span>
                  </div>

                  {/* User Profile Tile in Drawer */}
                  {user && (
                    <Link
                      to="/profile"
                      onClick={onClose}
                      className={`group flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                        location.pathname === '/profile'
                          ? 'bg-brand text-white shadow-md shadow-brand/20'
                          : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/70 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name || 'حسابي'} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(user.name || user.displayName || user.email || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-sm font-black truncate max-w-[170px]">{user.name || user.displayName || 'الملف الشخصي'}</span>
                          <span className={`text-[10px] font-medium ${location.pathname === '/profile' ? 'text-white/80' : 'text-gray-400'}`}>
                            إدارة الحساب والصورة الشخصية
                          </span>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                    </Link>
                  )}

                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    const isExactActive =
                      item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname === item.path && !activeCategoryParam;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`group flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                          isExactActive
                            ? 'bg-brand text-white shadow-md shadow-brand/20'
                            : 'text-gray-700 dark:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 border border-transparent hover:border-gray-200 dark:hover:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                              isExactActive
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-brand/10 group-hover:text-brand'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-sm font-black">{item.name}</span>
                            <span
                              className={`text-[10px] font-medium ${
                                isExactActive ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {item.description}
                            </span>
                          </div>
                        </div>

                        <ChevronLeft
                          className={`w-4 h-4 transition-transform group-hover:-translate-x-0.5 ${
                            isExactActive ? 'text-white/70' : 'text-gray-400 dark:text-gray-600'
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>

                {/* Admin section if authorized */}
                {canAccessAdmin && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-1.5">
                    <div className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 pb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                      <span>الإدارة والتحكم</span>
                    </div>
                    <Link
                      to="/admin"
                      onClick={onClose}
                      className={`group flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                        location.pathname.startsWith('/admin')
                          ? 'bg-brand text-white shadow-md shadow-brand/20'
                          : 'text-gray-700 dark:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 border border-transparent hover:border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            location.pathname.startsWith('/admin')
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-brand/10 group-hover:text-brand'
                          }`}
                        >
                          <Settings className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-sm font-black">لوحة التحكم</span>
                          <span
                            className={`text-[10px] font-medium ${
                              location.pathname.startsWith('/admin')
                                ? 'text-white/80'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            إدارة الأخبار والمستخدمين والمباريات
                          </span>
                        </div>
                      </div>

                      <ChevronLeft className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                    </Link>
                  </div>
                )}

                {/* Theme Toggle Tile */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-800/80 border border-gray-200 dark:border-gray-800 transition-colors cursor-pointer"
                    id="drawer-theme-toggle"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200">
                        {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
                      </div>
                      <span className="text-xs font-bold">
                        {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400">
                      تبديل
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Drawer Bottom Footer (Pinned at Bottom) */}
              <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                {user ? (
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 shadow-xs transition-colors cursor-pointer"
                    id="drawer-logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-brand text-white hover:bg-emerald-600 shadow-md shadow-brand/20 transition-all"
                    id="drawer-login-btn"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

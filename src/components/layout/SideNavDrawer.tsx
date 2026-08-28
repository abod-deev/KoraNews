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
  User as UserIcon,
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
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'الأخبار', path: '/news', icon: Newspaper },
    { name: 'مباريات اليوم', path: '/matches', icon: Calendar },
  ];

  // Auto close on route change
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
          {/* Lighter, smoother backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-hidden="true"
            className="absolute inset-0 bg-black/45 dark:bg-black/65 backdrop-blur-[2px] cursor-pointer"
          />

          {/* Side Drawer Container: Narrower, Compact (approx 78-84% mobile width, max ~300px) */}
          <div className="absolute inset-y-0 right-0 max-w-full flex h-full">
            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="pointer-events-auto w-[80vw] sm:w-76 max-w-[300px] h-full flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-2xl border-l border-gray-200/80 dark:border-gray-800 select-none"
            >
              {/* 1. Compact Header */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-gray-900/60">
                <Link to="/" onClick={onClose} className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shadow-brand/25">
                    K
                  </div>
                  <div>
                    <span className="text-base font-black text-brand tracking-tight">كورة نيوز</span>
                  </div>
                </Link>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  aria-label="إغلاق القائمة"
                  id="close-drawer-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 2. Compact, Streamlined Navigation Links */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-1">
                {/* Main Links */}
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                        isActive
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:text-brand'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-black">{item.name}</span>
                      </div>

                      <ChevronLeft
                        className={`w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 ${
                          isActive ? 'text-white/80' : 'text-gray-400 dark:text-gray-600'
                        }`}
                      />
                    </Link>
                  );
                })}

                {/* User Profile Link (if logged in) */}
                {user && (
                  <Link
                    to="/profile"
                    onClick={onClose}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                      location.pathname === '/profile'
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${
                          location.pathname === '/profile'
                            ? 'bg-white/20 text-white'
                            : 'bg-brand/10 border border-brand/20 text-brand'
                        }`}
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt="حسابي" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-black truncate max-w-[130px]">
                        {user.name || user.displayName || 'الملف الشخصي'}
                      </span>
                    </div>

                    <ChevronLeft
                      className={`w-3.5 h-3.5 ${
                        location.pathname === '/profile' ? 'text-white/80' : 'text-gray-400 dark:text-gray-600'
                      }`}
                    />
                  </Link>
                )}

                {/* Admin Dashboard Link (if authorized) */}
                {canAccessAdmin && (
                  <Link
                    to="/admin"
                    onClick={onClose}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          location.pathname.startsWith('/admin')
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:text-brand'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-black">لوحة التحكم</span>
                    </div>

                    <ChevronLeft
                      className={`w-3.5 h-3.5 ${
                        location.pathname.startsWith('/admin') ? 'text-white/80' : 'text-gray-400 dark:text-gray-600'
                      }`}
                    />
                  </Link>
                )}

                {/* Dark Mode Switch */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 my-1">
                  <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    id="drawer-theme-toggle"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200">
                        {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
                      </div>
                      <span className="text-xs font-bold">
                        {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold text-gray-400">
                      تبديل
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Compact Bottom Action: Login / Logout */}
              <div className="shrink-0 p-3 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-gray-900/60">
                {user ? (
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 bg-white dark:bg-gray-800 border border-red-200/80 dark:border-red-900/40 shadow-2xs transition-colors cursor-pointer"
                    id="drawer-logout-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold text-xs bg-brand text-white hover:bg-emerald-600 shadow-xs transition-all"
                    id="drawer-login-btn"
                  >
                    <LogIn className="w-3.5 h-3.5" />
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

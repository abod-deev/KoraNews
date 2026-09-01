import React, { useEffect, useRef, useState } from 'react';
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
  Trophy,
  Award,
  Medal,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchCategories } from '../../services/api';
import { checkIsAdmin } from '../../utils/authHelpers';
import SiteLogo from './SiteLogo';

interface SideNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideNavDrawer({ isOpen, onClose }: SideNavDrawerProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<{ id: string, name: string, slug?: string }[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);

  const canAccessAdmin = checkIsAdmin(user);

  const mainNavItems = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'الأخبار', path: '/news', icon: Newspaper },
    { name: 'مباريات اليوم', path: '/matches', icon: Calendar },
  ];

  const predictionNavItems = [
    { name: 'توقعات المباريات', path: '/predictions', icon: Trophy },
    { name: 'ترتيب التوقعات', path: '/predictions/leaderboard', icon: Award },
    { name: 'الترتيب الذهبي', path: '/predictions/golden', icon: Medal },
  ];

  const fetchCats = () => {
    setCategoriesError(false);
    fetchCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    }).catch((err) => {
      console.error('Failed to fetch categories:', err);
      setCategoriesError(true);
    });
  };

  useEffect(() => {
    fetchCats();
  }, []);

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

  // Touch listeners for Swipe-Right-to-Close in RTL
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;
    // In RTL, drawer is on the right. Swiping right (positive diffX > 50px) closes it.
    if (diffX > 50) {
      onClose();
    }
    touchStartX.current = null;
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden dir-rtl select-none"
          id="side-nav-drawer-root"
          role="dialog"
          aria-modal="true"
        >
          {/* Overlay Backdrop */}
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
            className="absolute inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 right-0 max-w-full flex h-full">
            <motion.div
              ref={drawerRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="pointer-events-auto w-[78vw] sm:w-72 max-w-[280px] h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xl border-l border-slate-200 dark:border-slate-800"
            >
              {/* Header */}
              <div className="shrink-0 flex items-center justify-between px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
                <Link to="/" onClick={onClose} className="flex items-center gap-2 group">
                  <SiteLogo size="sm" />
                </Link>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="إغلاق القائمة"
                  id="close-drawer-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links Body */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-4 scrollbar-hide">
                {/* Group 1: Main Links */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                    الأقسام الرئيسية
                  </h4>
                  <div className="space-y-1">
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
                          className={`group flex items-center justify-between px-2.5 py-2 rounded-xl font-extrabold text-xs transition-all ${
                            isActive
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span className="font-extrabold">{item.name}</span>
                          </div>

                          <ChevronLeft className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-600'}`} />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Group 2: Predictions & Contests */}
                <div>
                  <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1.5 px-2 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    <span>مسابقة التوقعات</span>
                  </h4>
                  <div className="space-y-1">
                    {predictionNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onClose}
                          className={`group flex items-center justify-between px-2.5 py-2 rounded-xl font-extrabold text-xs transition-all ${
                            isActive
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                            <span className="font-extrabold">{item.name}</span>
                          </div>

                          <ChevronLeft className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-600'}`} />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Group 3: Categories if available */}
                {categoriesError ? (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                      تصنيفات الأخبار
                    </h4>
                    <div className="px-2 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold text-center border border-red-100 dark:border-red-900/30">
                      <p>فشل تحميل التصنيفات</p>
                      <button onClick={fetchCats} className="mt-2 text-[10px] bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 px-3 py-1.5 rounded-lg transition-colors">
                        إعادة المحاولة
                      </button>
                    </div>
                  </div>
                ) : categories.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                      تصنيفات الأخبار
                    </h4>
                    <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                      {categories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/news?category=${cat.slug || cat.id}`}
                          onClick={onClose}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Tag className="w-3 h-3 opacity-60 shrink-0" />
                            <span className="truncate">{cat.name}</span>
                          </div>
                          <ChevronLeft className="w-3 h-3 opacity-40 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group 4: Profile & Admin */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                  {user && (
                    <Link
                      to="/profile"
                      onClick={onClose}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl font-extrabold text-xs transition-all ${
                        location.pathname === '/profile'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                          {user.avatar ? (
                            <img loading="lazy" src={user.avatar} alt="حسابي" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-3 h-3 text-sky-600" />
                          )}
                        </div>
                        <span className="font-extrabold truncate max-w-[120px]">
                          {user.name || user.displayName || 'الملف الشخصي'}
                        </span>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                  )}

                  {canAccessAdmin && (
                    <Link
                      to="/admin"
                      onClick={onClose}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl font-extrabold text-xs transition-all ${
                        location.pathname.startsWith('/admin')
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                        <span className="font-extrabold">لوحة التحكم</span>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                  )}

                  <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                    id="drawer-theme-toggle"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                      <span className="text-xs font-extrabold">
                        {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bottom Login / Logout Action */}
              <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
                {user ? (
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-extrabold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/40 shadow-2xs transition-colors cursor-pointer"
                    id="drawer-logout-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-extrabold text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
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


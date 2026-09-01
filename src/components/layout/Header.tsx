import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, User, LogOut, Settings, Bell, BellRing, Play, Trash2, Trophy, Medal } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMatchReminders } from '../../contexts/MatchRemindersContext';
import { checkIsAdmin } from '../../utils/authHelpers';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SideNavDrawer from './SideNavDrawer';
import SiteLogo from './SiteLogo';

export default function Header() {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { remindedMatches, toggleReminder, triggerTestNotification, setShowLoginModal } = useMatchReminders();
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { name: 'الرئيسية', path: '/' },
    { name: 'الأخبار', path: '/news' },
    { name: 'المباريات', path: '/matches' },
    { name: 'توقعات المباريات', path: '/predictions', isHighlight: true },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      setIsNotificationsOpen(!isNotificationsOpen);
    }
  };

  const canAccessAdmin = checkIsAdmin(user);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-2xs transition-all duration-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button 
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shrink-0" 
              onClick={() => setIsSideDrawerOpen(true)}
              aria-label="فتح القائمة الجانبية"
              id="open-side-drawer-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <SiteLogo size="md" />
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = link.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(link.path);

              return (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400' 
                      : link.isHighlight
                      ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      : 'text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {link.isHighlight && <Trophy className="w-4 h-4 text-amber-500" />}
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Match Reminders Bell Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleBellClick}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all relative cursor-pointer text-slate-600 dark:text-slate-300"
                title="تنبيهات المباريات المفضلة"
                aria-label="تنبيهات المباريات"
                id="header-bell-btn"
              >
                {remindedMatches.length > 0 ? (
                  <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-pulse" />
                ) : (
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                {user && remindedMatches.length > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {remindedMatches.length}
                  </span>
                )}
              </button>

              {/* Reminders Popover Menu */}
              <AnimatePresence>
                {isNotificationsOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden dir-rtl"
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <BellRing className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          تنبيهات المباريات ({remindedMatches.length})
                        </h4>
                      </div>
                      <Link
                        to="/matches"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        جدول المباريات
                      </Link>
                    </div>

                    <div className="max-h-72 overflow-y-auto p-2.5 space-y-2">
                      {remindedMatches.length === 0 ? (
                        <div className="text-center py-6 px-3 text-slate-500 dark:text-slate-400">
                          <Bell className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-xs font-bold">لا يوجد مباريات منبهة حالياً.</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            اضغط على زر التنبيه بجانب أي مباراة لتصلك إشعارات قبل انطلاقها!
                          </p>
                        </div>
                      ) : (
                        remindedMatches.map((match) => (
                          <div
                            key={match.id}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span className="truncate max-w-[150px]">{match.leagueName}</span>
                              <span className="text-amber-500 font-extrabold shrink-0">
                                {match.matchDate ? new Date(match.matchDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'وقت غير متوفر'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1.5 my-0.5">
                              <div className="flex items-center gap-1.5 w-5/12 font-bold text-xs text-slate-800 dark:text-slate-200">
                                <img loading="lazy" src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                                <span className="truncate">{match.homeTeam.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-slate-400">vs</span>
                              <div className="flex items-center gap-1.5 w-5/12 font-bold text-xs text-slate-800 dark:text-slate-200 justify-end">
                                <span className="truncate">{match.awayTeam.name}</span>
                                <img loading="lazy" src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                              <button
                                onClick={() => triggerTestNotification(match)}
                                className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>تجربة الإشعار</span>
                              </button>
                              <button
                                onClick={() => toggleReminder(match)}
                                className="text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>إلغاء</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={toggleDarkMode} 
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="تبديل الوضع الليلي"
              id="header-theme-toggle"
            >
              {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 p-1 pl-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  title="الملف الشخصي"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-extrabold text-xs">
                    {user.avatar ? (
                      <img loading="lazy" src={user.avatar} alt={user.name || 'حسابي'} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.name || user.displayName || user.email || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[90px] truncate">
                    {user.name || user.displayName || 'حسابي'}
                  </span>
                </Link>

                {canAccessAdmin && (
                  <Link to="/admin" className="text-slate-600 dark:text-slate-300 hover:text-sky-600 flex items-center gap-1 font-extrabold text-xs py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors">
                    <Settings className="w-3.5 h-3.5" /> <span>لوحة التحكم</span>
                  </Link>
                )}

                <button onClick={logout} className="text-rose-500 hover:text-rose-600 font-extrabold text-xs flex items-center gap-1 p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer" title="تسجيل الخروج">
                  <LogOut className="w-3.5 h-3.5" /> <span>خروج</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="hidden sm:flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all font-extrabold text-xs sm:text-sm shadow-xs active:scale-95"
              >
                <User className="w-4 h-4" />
                <span>دخول</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Side Navigation Drawer */}
      <SideNavDrawer isOpen={isSideDrawerOpen} onClose={() => setIsSideDrawerOpen(false)} />
    </header>
  );
}


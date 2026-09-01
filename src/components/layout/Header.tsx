import { Link } from 'react-router-dom';
import { Moon, Sun, Menu, User, LogOut, Settings, Bell, BellRing, Sparkles, Trash2, Play } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMatchReminders } from '../../contexts/MatchRemindersContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SideNavDrawer from './SideNavDrawer';
import SiteLogo from './SiteLogo';

export default function Header() {
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
    { name: 'توقعات المباريات', path: '/predictions' },
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

  const canAccessAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin' || user.email === 'abod46071@gmail.com'));

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-gray-200/60 dark:border-gray-800/60 shadow-2xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all cursor-pointer" 
              onClick={() => setIsSideDrawerOpen(true)}
              aria-label="فتح القائمة الجانبية"
              id="open-side-drawer-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2 group">
              <SiteLogo size="md" />
            </Link>
          </div>

          <nav className="hidden lg:flex gap-6">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-brand font-bold transition-colors text-sm"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Match Reminders Bell Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleBellClick}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all relative cursor-pointer"
                title="تنبيهات المباريات المفضلة"
                aria-label="تنبيهات المباريات"
                id="header-bell-btn"
              >
                {remindedMatches.length > 0 ? (
                  <BellRing className="w-5 h-5 text-amber-500 animate-pulse" />
                ) : (
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
                {user && remindedMatches.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
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
                    className="absolute -left-12 sm:left-0 mt-2 w-[calc(100vw-2rem)] max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden dir-rtl"
                  >
                    <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-1.5">
                        <BellRing className="w-4 h-4 text-brand" />
                        <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
                          تنبيهات المباريات ({remindedMatches.length})
                        </h4>
                      </div>
                      <Link
                        to="/matches"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-xs font-bold text-brand hover:underline"
                      >
                        جدول المباريات
                      </Link>
                    </div>

                    <div className="max-h-72 sm:max-h-80 overflow-y-auto p-2.5 sm:p-3 space-y-2">
                      {remindedMatches.length === 0 ? (
                        <div className="text-center py-6 px-3 text-gray-500 dark:text-gray-400">
                          <Bell className="w-7 h-7 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                          <p className="text-xs font-bold">لا يوجد مباريات منبهة حالياً.</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            اضغط على رمز الجرس 🔔 بجانب أي مباراة لتلقي تنبيه عند انطلاقها!
                          </p>
                        </div>
                      ) : (
                        remindedMatches.map((match) => (
                          <div
                            key={match.id}
                            className="p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/60 flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
                              <span className="truncate max-w-[150px]">{match.leagueName}</span>
                              <span className="text-amber-500 font-extrabold shrink-0">
                                {new Date(match.matchDate || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1.5 my-0.5">
                              <div className="flex items-center gap-1.5 w-5/12 font-bold text-xs text-gray-800 dark:text-gray-200">
                                <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                                <span className="truncate">{match.homeTeam.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-gray-400">vs</span>
                              <div className="flex items-center gap-1.5 w-5/12 font-bold text-xs text-gray-800 dark:text-gray-200 justify-end">
                                <span className="truncate">{match.awayTeam.name}</span>
                                <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                              <button
                                onClick={() => triggerTestNotification(match)}
                                className="text-[10px] font-bold text-brand hover:bg-brand/10 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>تجربة الإشعار</span>
                              </button>
                              <button
                                onClick={() => toggleReminder(match)}
                                className="text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors"
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
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all text-gray-600 dark:text-gray-300 cursor-pointer"
              aria-label="تبديل الوضع الليلي"
              id="header-theme-toggle"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {user ? (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 p-1 pl-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  title="الملف الشخصي"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name || 'حسابي'} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.name || user.displayName || user.email || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 max-w-[90px] truncate">
                    {user.name || user.displayName || 'حسابي'}
                  </span>
                </Link>

                {canAccessAdmin && (
                  <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-brand flex items-center gap-1 font-semibold text-xs py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-brand/10 transition-colors">
                    <Settings className="w-3.5 h-3.5" /> لوحة التحكم
                  </Link>
                )}

                <button onClick={logout} className="text-red-500 hover:text-red-600 font-semibold text-xs flex items-center gap-1 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="تسجيل الخروج">
                  <LogOut className="w-3.5 h-3.5" /> خروج
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="hidden sm:flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-semibold text-sm shadow-xs"
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

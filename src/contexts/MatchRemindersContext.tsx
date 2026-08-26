import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Match } from '../services/sportsApi';
import { Bell, BellOff, AlertCircle, CheckCircle2, Clock, PlayCircle, X, Sparkles, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export interface MatchAlert {
  match: Match;
  title: string;
  message: string;
  type: 'SOON' | 'LIVE' | 'TEST';
  timestamp: Date;
}

interface MatchRemindersContextType {
  remindedMatches: Match[];
  remindedIds: string[];
  toggleReminder: (match: Match) => void;
  isReminded: (matchId: string) => boolean;
  activePopup: MatchAlert | null;
  dismissPopup: () => void;
  triggerTestNotification: (match: Match) => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const MatchRemindersContext = createContext<MatchRemindersContextType>({
  remindedMatches: [],
  remindedIds: [],
  toggleReminder: () => {},
  isReminded: () => false,
  activePopup: null,
  dismissPopup: () => {},
  triggerTestNotification: () => {},
  showLoginModal: false,
  setShowLoginModal: () => {},
});

export const MatchRemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [remindedMatches, setRemindedMatches] = useState<Match[]>([]);
  const [activePopup, setActivePopup] = useState<MatchAlert | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [notifiedMatchIds, setNotifiedMatchIds] = useState<Set<string>>(new Set());

  // Load reminders from localStorage whenever user changes
  useEffect(() => {
    if (user) {
      const storageKey = `match_reminders_${user.uid}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setRemindedMatches(JSON.parse(saved));
        } else {
          setRemindedMatches([]);
        }
      } catch (e) {
        console.error("Failed to load match reminders", e);
      }
    } else {
      setRemindedMatches([]);
    }
  }, [user]);

  // Save reminders to localStorage
  const saveReminders = (matches: Match[]) => {
    setRemindedMatches(matches);
    if (user) {
      const storageKey = `match_reminders_${user.uid}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(matches));
      } catch (e) {
        console.error("Failed to save match reminders", e);
      }
    }
  };

  const remindedIds = remindedMatches.map((m) => String(m.id));

  const isReminded = (matchId: string) => {
    return remindedIds.includes(String(matchId));
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const toggleReminder = (match: Match) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const matchIdStr = String(match.id);
    const exists = isReminded(matchIdStr);

    if (exists) {
      const updated = remindedMatches.filter((m) => String(m.id) !== matchIdStr);
      saveReminders(updated);
      showToast(`تم إلغاء التنبيه لمباراة ${match.homeTeam.name} ضد ${match.awayTeam.name}`, 'info');
    } else {
      const updated = [...remindedMatches, match];
      saveReminders(updated);
      showToast(`تم تفعيل التنبيه بنجاح لمباراة ${match.homeTeam.name} ضد ${match.awayTeam.name}! 🔔`, 'success');

      // Request browser notification permission if available
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const dismissPopup = () => {
    setActivePopup(null);
  };

  const triggerTestNotification = (match: Match) => {
    const alert: MatchAlert = {
      match,
      title: '⏰ تجربة تنبيه المباراة!',
      message: `مباراة ${match.homeTeam.name} ضد ${match.awayTeam.name} (${match.leagueName}) ستنطلق قريباً!`,
      type: 'TEST',
      timestamp: new Date(),
    };
    setActivePopup(alert);

    // Also fire a native browser notification if allowed
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`⏰ تنبيه: ${match.homeTeam.name} vs ${match.awayTeam.name}`, {
          body: `اقترب موعد انطلاق المباراة في بطولة ${match.leagueName}!`,
          icon: match.homeTeam.logo || '/icon.png',
        });
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }
  };

  // Periodic background check for match start alerts
  useEffect(() => {
    if (!user || remindedMatches.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();

      remindedMatches.forEach((match) => {
        const matchIdStr = String(match.id);
        if (notifiedMatchIds.has(matchIdStr)) return;

        const matchTime = new Date(match.matchDate || Date.now()).getTime();
        const diffMinutes = (matchTime - now) / (1000 * 60);

        // Alert if match starts within 15 minutes or is live
        if (match.status === 'LIVE') {
          setActivePopup({
            match,
            title: '🔴 المباراة جارية الآن!',
            message: `انطلقت الآن مواجهة ${match.homeTeam.name} ضد ${match.awayTeam.name}!`,
            type: 'LIVE',
            timestamp: new Date(),
          });
          setNotifiedMatchIds((prev) => new Set(prev).add(matchIdStr));
        } else if (diffMinutes > 0 && diffMinutes <= 15) {
          setActivePopup({
            match,
            title: '⏰ اقترب موعد انطلاق المباراة!',
            message: `تبدأ مباراة ${match.homeTeam.name} ضد ${match.awayTeam.name} بعد ${Math.ceil(diffMinutes)} دقيقة.`,
            type: 'SOON',
            timestamp: new Date(),
          });
          setNotifiedMatchIds((prev) => new Set(prev).add(matchIdStr));
        }
      });
    }, 20000); // check every 20 seconds

    return () => clearInterval(interval);
  }, [remindedMatches, user, notifiedMatchIds]);

  return (
    <MatchRemindersContext.Provider
      value={{
        remindedMatches,
        remindedIds,
        toggleReminder,
        isReminded,
        activePopup,
        dismissPopup,
        triggerTestNotification,
        showLoginModal,
        setShowLoginModal,
      }}
    >
      {children}

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 dir-rtl"
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'info' ? (
              <BellOff className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-extrabold flex-1">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Alert Popup Modal */}
      <AnimatePresence>
        {activePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl"
            onClick={dismissPopup}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand via-emerald-400 to-amber-400" />

              <button
                onClick={dismissPopup}
                className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-2xl ${activePopup.type === 'LIVE' ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-brand/10 text-brand'}`}>
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 block">{activePopup.match.leagueName}</span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    {activePopup.title}
                  </h3>
                </div>
              </div>

              {/* Match Card Preview */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/80 my-4 space-y-3">
                <div className="flex items-center justify-between text-center">
                  {/* Home Team */}
                  <div className="flex flex-col items-center gap-1.5 w-5/12">
                    <img src={activePopup.match.homeTeam.logo} alt={activePopup.match.homeTeam.name} className="w-12 h-12 object-contain" />
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{activePopup.match.homeTeam.name}</span>
                  </div>

                  {/* VS / Score */}
                  <div className="w-2/12 flex flex-col items-center">
                    {activePopup.match.status === 'LIVE' ? (
                      <span className="text-xs font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">مباشر</span>
                    ) : (
                      <span className="text-xs font-black text-brand bg-brand/10 px-2 py-1 rounded-lg">ضد</span>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center gap-1.5 w-5/12">
                    <img src={activePopup.match.awayTeam.logo} alt={activePopup.match.awayTeam.name} className="w-12 h-12 object-contain" />
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{activePopup.match.awayTeam.name}</span>
                  </div>
                </div>

                <div className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-t border-gray-200/50 dark:border-gray-700/50 pt-2 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  <span>
                    موعد المباراة: {new Date(activePopup.match.matchDate || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 text-center mb-5">
                {activePopup.message}
              </p>

              <div className="flex items-center gap-3">
                <Link
                  to="/matches"
                  onClick={dismissPopup}
                  className="flex-1 bg-brand text-white font-extrabold text-xs py-3 px-4 rounded-xl hover:bg-emerald-600 transition-colors text-center flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>متابعة المباراة والنتائج</span>
                </Link>
                <button
                  onClick={dismissPopup}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-extrabold text-xs rounded-xl transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal for Non-Registered Users */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative"
            >
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">تفعيل تنبيهات المباريات</h3>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                  هذه الميزة حصرية للمستخدمين المسجلين! سجل دخولك لتصلك إشعارات وتنبيهات عند اقتراب مواعيد مباريات فريقك المفضل.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full bg-brand text-white font-extrabold text-xs py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول الآن</span>
                </Link>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MatchRemindersContext.Provider>
  );
};

export const useMatchReminders = () => useContext(MatchRemindersContext);

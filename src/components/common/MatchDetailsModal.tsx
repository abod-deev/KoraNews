import { motion, AnimatePresence } from 'motion/react';
import { Match } from '../../services/sportsApi';
import { X, Calendar, Clock, Trophy, MapPin, Bell, BellRing, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import { getArabicTeamName } from '../../utils/teamTranslations';
import { useMatchTimer } from './MatchTimeDisplay';
import { useMatchReminders } from '../../contexts/MatchRemindersContext';

interface MatchDetailsModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MatchDetailsModal({ match, isOpen, onClose }: MatchDetailsModalProps) {
  const { toggleReminder, isReminded } = useMatchReminders();

  if (!match) return null;

  const reminded = isReminded(String(match.id));
  const liveState = useMatchTimer(match);

  const homeTeamName = getArabicTeamName(match.homeTeam?.name);
  const awayTeamName = getArabicTeamName(match.awayTeam?.name);

  // Status badge config
  const getStatusBadge = () => {
    if (liveState.isLive || liveState.isHalfTime) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-black animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>مباشر الآن {liveState.timerFormatted ? `(${liveState.timerFormatted})` : ''}</span>
        </span>
      );
    }
    if (liveState.isFinished) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-extrabold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>انتهت المباراة - النتيجة النهائية</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-extrabold">
        <Clock className="w-3.5 h-3.5" />
        <span>قادمة - لم تبدأ بعد</span>
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                  {match.leagueName}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Scrollable Container */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto no-scrollbar">
              
              {/* Status Header Pill */}
              <div className="flex justify-center">
                {getStatusBadge()}
              </div>

              {/* Main Teams & Score Board */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-6 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 shadow-xs">
                
                {/* Home Team */}
                <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-900 p-2.5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <img
                      loading="lazy"
                      src={match.homeTeam?.logo}
                      alt={homeTeamName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                    {homeTeamName}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">صاحب الأرض</span>
                </div>

                {/* Center Score / Time */}
                <div className="w-2/12 flex flex-col items-center justify-center text-center shrink-0">
                  {liveState.isScheduled ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-extrabold text-slate-400">توقيت المباراة</span>
                      <span className="text-sm sm:text-base font-black px-3 py-1 rounded-xl bg-sky-600 text-white shadow-xs">
                        {liveState.kickoffTimeStr}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 dir-ltr bg-white dark:bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <span>{match.homeScore ?? 0}</span>
                        <span className="text-sky-600 text-xl font-bold">:</span>
                        <span>{match.awayScore ?? 0}</span>
                      </div>
                      {liveState.isLive && (
                        <span className="text-[11px] font-bold text-rose-500 animate-pulse">
                          {liveState.minuteBadge}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-900 p-2.5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <img
                      loading="lazy"
                      src={match.awayTeam?.logo}
                      alt={awayTeamName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                    {awayTeamName}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">الفريق الضيف</span>
                </div>

              </div>

              {/* Match Details Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-600" />
                  <span>معلومات المواجهة</span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 font-bold block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-sky-500" />
                      <span>تاريخ المباراة</span>
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {new Date(match.matchDate || Date.now()).toLocaleDateString('ar-EG', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 font-bold block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      <span>موعد الانطلاق</span>
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {liveState.kickoffTimeStr} (بتوقيت المحلي)
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1 col-span-2">
                    <span className="text-slate-400 font-bold block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      <span>البطولة والمنافسة</span>
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {match.leagueName} - موسم 2026/2027
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Match Reminder Toggle */}
              <div className="pt-2">
                <button
                  onClick={() => toggleReminder(match)}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    reminded
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {reminded ? (
                    <>
                      <BellRing className="w-4 h-4 animate-bounce" />
                      <span>التنبيه مفعل لـ هذه المباراة (انقر للإلغاء)</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>تفعيل تنبيه مواعيد المباراة</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

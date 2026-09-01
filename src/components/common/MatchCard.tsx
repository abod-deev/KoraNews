import { useState } from 'react';
import { motion } from 'motion/react';
import { Match } from '../../services/sportsApi';
import { Bell, BellRing, Calendar as CalendarIcon, Clock, ShieldCheck, Play } from 'lucide-react';
import { useMatchReminders } from '../../contexts/MatchRemindersContext';
import MatchTimeDisplay, { useMatchTimer } from './MatchTimeDisplay';
import { getArabicTeamName } from '../../utils/teamTranslations';
import MatchDetailsModal from './MatchDetailsModal';

export interface MatchCardProps {
  match: Match;
  index?: number;
  key?: string | number;
}

export default function MatchCard({ match, index = 0 }: MatchCardProps) {
  const { toggleReminder, isReminded } = useMatchReminders();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const reminded = isReminded(String(match.id));
  const liveState = useMatchTimer(match);

  const homeTeamName = getArabicTeamName(match.homeTeam?.name) || 'فريق مضيف';
  const awayTeamName = getArabicTeamName(match.awayTeam?.name) || 'فريق ضيف';

  // Render status badge clearly for LIVE, UPCOMING, and FINISHED
  const renderStatusBadge = () => {
    if (liveState.isLive || liveState.isHalfTime) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-500/20 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
          <span>مباشر</span>
        </span>
      );
    }

    if (liveState.isFinished) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>انتهت</span>
        </span>
      );
    }

    // Upcoming
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
        <Clock className="w-3 h-3" />
        <span>قادمة</span>
      </span>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        onClick={() => setIsModalOpen(true)}
        className={`bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between gap-3 relative transition-all duration-300 group shadow-xs hover:shadow-md cursor-pointer select-none ${
          liveState.isLive
            ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
            : 'border-slate-200/80 dark:border-slate-800'
        }`}
      >
        {/* Top Header: League Name, Status Badge, Reminder Button */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-black text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-lg truncate max-w-[130px] sm:max-w-[160px] border border-sky-200/50 dark:border-sky-800/50">
              {match.leagueName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {renderStatusBadge()}

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleReminder(match);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                reminded
                  ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={reminded ? 'إلغاء التنبيه' : 'تفعيل تنبيه المباراة'}
            >
              {reminded ? <BellRing className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Center Teams Match Grid */}
        <div className="flex items-center justify-between w-full my-1 gap-1 sm:gap-2">
          
          {/* Home Team */}
          <div className="flex flex-col items-center gap-1.5 w-[42%] text-center">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-2xs flex items-center justify-center p-2 group-hover:scale-105 transition-transform border border-slate-100 dark:border-slate-700/80 shrink-0">
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
            <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-slate-100 leading-tight line-clamp-1 w-full px-0.5">
              {homeTeamName}
            </span>
          </div>

          {/* Center Score / Time */}
          <div className="w-[16%] flex flex-col items-center justify-center shrink-0 text-center">
            {liveState.isScheduled ? (
              /* Upcoming: Kickoff Time Badge */
              <div className="flex flex-col items-center justify-center">
                <div className="text-xs sm:text-sm font-black bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap">
                  {liveState.kickoffTimeStr}
                </div>
              </div>
            ) : (
              /* Live or Finished: Score Display */
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-base sm:text-lg font-black text-slate-900 dark:text-white dir-ltr">
                  <span>{match.homeScore ?? 0}</span>
                  <span className="text-sky-600 text-sm font-bold">:</span>
                  <span>{match.awayScore ?? 0}</span>
                </div>
                {liveState.isLive && (
                  <span className="text-[9px] font-extrabold text-rose-500 dark:text-rose-400 animate-pulse flex items-center gap-0.5 whitespace-nowrap">
                    <Play className="w-2 h-2 fill-current" />
                    <span>{liveState.minuteBadge}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-1.5 w-[42%] text-center">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-2xs flex items-center justify-center p-2 group-hover:scale-105 transition-transform border border-slate-100 dark:border-slate-700/80 shrink-0">
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
            <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-slate-100 leading-tight line-clamp-1 w-full px-0.5">
              {awayTeamName}
            </span>
          </div>

        </div>

        {/* Footer Bar: Date & Click Details Prompt */}
        <div className="text-[10px] font-extrabold text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <CalendarIcon className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">
              {new Date(match.matchDate || Date.now()).toLocaleDateString('ar-EG', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <span className="text-sky-600 dark:text-sky-400 font-bold group-hover:underline">
            التفاصيل ←
          </span>
        </div>
      </motion.div>

      {/* Match Details Modal */}
      <MatchDetailsModal
        match={match}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

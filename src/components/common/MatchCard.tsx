import { motion } from 'motion/react';
import { Match } from '../../services/sportsApi';
import { Bell, BellRing, Calendar as CalendarIcon } from 'lucide-react';
import { useMatchReminders } from '../../contexts/MatchRemindersContext';
import MatchTimeDisplay, { useMatchTimer } from './MatchTimeDisplay';
import { getArabicTeamName } from '../../utils/teamTranslations';

export interface MatchCardProps {
  match: Match;
  index?: number;
  key?: string | number;
}

export default function MatchCard({ match, index = 0 }: MatchCardProps) {
  const { toggleReminder, isReminded } = useMatchReminders();
  const reminded = isReminded(String(match.id));
  const liveState = useMatchTimer(match);

  return (
    <motion.div
      key={match.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white hover:bg-gray-50 dark:bg-gray-800/80 dark:hover:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col justify-between gap-2.5 sm:gap-3 relative transition-all duration-300 group shadow-xs hover:shadow-lg ${
        liveState.isLive
          ? 'border-red-200 dark:border-red-900/60 ring-1 ring-red-500/20'
          : 'border-gray-100 dark:border-gray-700/70'
      }`}
    >
      {/* Top Header: League Name, Live Badge / Timer, Reminder Button */}
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] sm:text-[11px] font-extrabold text-brand bg-brand/10 dark:bg-brand/20 px-1.5 sm:px-2 py-0.5 rounded-md truncate max-w-[110px] sm:max-w-[130px]">
          {match.leagueName}
        </span>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleReminder(match);
            }}
            className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
              reminded
                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                : 'text-gray-400 hover:text-amber-500 hover:bg-gray-200/60 dark:hover:bg-gray-700'
            }`}
            title={reminded ? 'إلغاء التنبيه' : 'تفعيل تنبيه المباراة للمستخدمين المسجلين'}
          >
            {reminded ? <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> : <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Header Status / Timer Badge */}
          <MatchTimeDisplay match={match} variant="header-badge" />
        </div>
      </div>

      {/* Middle Section: Teams, Logos, Score / Central Live Timer */}
      <div className="flex items-center justify-between w-full my-1 sm:my-1.5">
        {/* Home Team */}
        <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-5/12 text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-700/80 shadow-2xs flex items-center justify-center p-1.5 sm:p-2 group-hover:scale-105 transition-transform border border-gray-100 dark:border-gray-700">
            <img
              loading="lazy"
              src={match.homeTeam?.logo}
              alt={match.homeTeam?.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-1">
            {getArabicTeamName(match.homeTeam?.name) || 'فريق مضيف'}
          </span>
        </div>

      {/* Center: Score + Kickoff / Live Timer */}
      <div className="w-2/12 sm:w-3/12 flex flex-col items-center justify-center shrink-0">
        {liveState.isScheduled ? (
          /* Upcoming Match: Show kickoff time in place of score */
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs sm:text-sm font-black bg-gray-100 dark:bg-gray-700/90 text-gray-800 dark:text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 shadow-2xs whitespace-nowrap">
              {liveState.kickoffTimeStr}
            </div>
          </div>
        ) : (
          /* Live or Finished Match: Replace kickoff time with actual score, and show live timer below it */
          <div className="flex flex-col items-center gap-0.5 sm:gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 text-lg sm:text-xl font-black text-gray-900 dark:text-white dir-ltr">
              <span>{match.homeScore ?? 0}</span>
              <span className="text-gray-400 text-sm sm:text-base font-bold">:</span>
              <span>{match.awayScore ?? 0}</span>
            </div>
            <MatchTimeDisplay match={match} variant="card-center" showKickoffLabel={false} />
          </div>
        )}
      </div>

      {/* Away Team */}
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-5/12 text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-700/80 shadow-2xs flex items-center justify-center p-1.5 sm:p-2 group-hover:scale-105 transition-transform border border-gray-100 dark:border-gray-700">
          <img
            loading="lazy"
            src={match.awayTeam?.logo}
            alt={match.awayTeam?.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-1">
          {getArabicTeamName(match.awayTeam?.name) || 'فريق ضيف'}
        </span>
      </div>
    </div>

    {/* Card Footer: Only the Date + Reminder toggle */}
    <div className="text-[10px] sm:text-[11px] font-medium text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-1.5 sm:pt-2 flex items-center justify-between gap-1">
      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand shrink-0" />
        <span className="truncate">{new Date(match.matchDate || Date.now()).toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      </div>

      <button
        onClick={() => toggleReminder(match)}
        className={`text-[9px] sm:text-[10px] font-bold transition-colors shrink-0 ${
          reminded ? 'text-amber-500' : 'text-gray-400 hover:text-brand'
        }`}
      >
        {reminded ? 'منبه مفعل 🔔' : '+ تنبيه'}
      </button>
    </div>
    </motion.div>
  );
}

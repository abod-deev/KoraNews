import { useState, useEffect } from 'react';
import { calculateLiveTime, MatchTimerInput, LiveTimeState } from '../../utils/matchTimer';
import { Clock, Play, Pause } from 'lucide-react';

interface MatchTimeDisplayProps {
  match: MatchTimerInput;
  showKickoffLabel?: boolean;
  variant?: 'card-center' | 'header-badge' | 'footer-time';
}

export function useMatchTimer(match: MatchTimerInput): LiveTimeState {
  const [liveState, setLiveState] = useState<LiveTimeState>(() => calculateLiveTime(match));

  useEffect(() => {
    // Initial compute
    setLiveState(calculateLiveTime(match));

    // If match is LIVE or in progress, update every second
    const interval = setInterval(() => {
      setLiveState(calculateLiveTime(match));
    }, 1000);

    return () => clearInterval(interval);
  }, [match.status, match.rawStatus, match.utcDate, match.matchDate, match.minute, match.kickoffTime]);

  return liveState;
}

export default function MatchTimeDisplay({ match, variant = 'card-center' }: MatchTimeDisplayProps) {
  const liveState = useMatchTimer(match);

  // 1. Header Badge: Shows "مباشر" during 1st half, halftime, and 2nd half
  if (variant === 'header-badge') {
    if (liveState.isLive || liveState.isHalfTime) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span>مباشر</span>
        </span>
      );
    }

    if (liveState.isFinished) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          انتهت
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        مجدولة
      </span>
    );
  }

  // 2. Footer Time
  if (variant === 'footer-time') {
    return (
      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
        <Clock className="w-3 h-3 text-gray-400" />
        <span>وقت الانطلاق الفعلي: {liveState.kickoffTimeStr}</span>
      </div>
    );
  }

  // 3. Center display in Match Card (below score)
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      {liveState.isScheduled ? (
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-xs font-black bg-gray-100 dark:bg-gray-700/80 px-2.5 py-1 rounded-lg text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 shadow-2xs whitespace-nowrap">
            {liveState.kickoffTimeStr}
          </div>
        </div>
      ) : liveState.isHalfTime ? (
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-xs font-black bg-amber-500/10 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 px-2.5 py-0.5 rounded-lg whitespace-nowrap flex items-center gap-1">
            <Pause className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>الشوط الأول</span>
          </div>
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-semibold">استراحة</span>
        </div>
      ) : liveState.isLive ? (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-xs font-black bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-300/50 dark:border-red-800 px-2.5 py-0.5 rounded-lg whitespace-nowrap">
            <Play className="w-2.5 h-2.5 fill-current animate-pulse" />
            <span className="dir-ltr font-mono">{liveState.timerFormatted}</span>
          </div>
          <span className="text-[9px] text-red-500 dark:text-red-400 font-bold">
            {liveState.isSecondHalf ? 'الشوط الثاني' : 'الشوط الأول'} ({liveState.minuteBadge})
          </span>
        </div>
      ) : (
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">انتهت</span>
      )}
    </div>
  );
}

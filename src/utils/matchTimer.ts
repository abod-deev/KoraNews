import { formatMeccaTime } from './timezoneDateUtils';

export interface LiveTimeState {
  isLive: boolean;
  isHalfTime: boolean;
  isFirstHalf: boolean;
  isSecondHalf: boolean;
  isFinished: boolean;
  isScheduled: boolean;
  isPostponed: boolean;
  isCancelled: boolean;
  isSuspended: boolean;
  timerFormatted: string; // e.g. "34:20" or "55:20" or "الشوط الأول" or "62:10"
  minuteBadge: string; // e.g. "35'" or "45+2'" or "الشوط الأول" or "56'"
  statusLabel: string; // "مباشر" or "الشوط الأول" or "الشوط الثاني" or "انتهت" or "مجدولة" or "مؤجلة"
  kickoffTimeStr: string; // "09:00 م"
}

export interface MatchTimerInput {
  status?: string;
  rawStatus?: string;
  utcDate?: string;
  matchDate?: string;
  kickoffTime?: string;
  minute?: number | null;
}

/**
 * Formats match kickoff date/time string in clean Arabic representation (Mecca Time - Asia/Riyadh)
 */
export function formatKickoffTime(dateStr?: string): string {
  if (!dateStr) return '00:00';
  return formatMeccaTime(dateStr, { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Realistic professional football match timeline constants:
 * - Kickoff whistle delay: ~1.5 minutes after scheduled time for lineups & coin toss
 * - 1st half: 45 min regulation + ~3 min stoppage time = 48 min
 * - Halftime break: 15 min regulation interval + ~2.5 min tunnel walk = ~17.5 min
 * - 2nd half kickoff whistle: ~66.5 minutes after scheduled kickoff time
 * - Standard 2nd half regulation + stoppage: 45 min + ~5 min = 50 min (~116.5 min from start)
 * - Hard safety finish cap: 130 minutes from kickoff (after which match is definitely finished)
 */
const KICKOFF_DELAY_MS = 1.5 * 60 * 1000; // 1m 30s
const FIRST_HALF_DURATION_MS = 48 * 60 * 1000; // 48m (45m + 3m stoppage)
const HALFTIME_END_MS = 66.5 * 60 * 1000; // 66m 30s from scheduled start (1H + break)
const HARD_FINISH_CAP_MS = 125 * 60 * 1000; // 125m from scheduled kickoff

/**
 * Calculates current live state, real-time elapsed match counter, halftime pause, and kickoff time in Mecca Time
 */
export function calculateLiveTime(match: MatchTimerInput, nowTimestamp: number = Date.now()): LiveTimeState {
  const kickoffDate = new Date(match.utcDate || match.matchDate || Date.now());
  const kickoffTimeStr = !isNaN(kickoffDate.getTime())
    ? formatMeccaTime(kickoffDate, { hour: '2-digit', minute: '2-digit', hour12: true })
    : (match.kickoffTime || '00:00');

  const status = (match.status || 'SCHEDULED').toUpperCase();
  const rawStatus = (match.rawStatus || '').toUpperCase();

  // 1. Explicitly Finished matches
  if (
    status === 'FINISHED' ||
    rawStatus === 'FINISHED' ||
    rawStatus === 'FT' ||
    rawStatus === 'AET' ||
    rawStatus === 'AP'
  ) {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: true,
      isScheduled: false,
      isPostponed: false,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: 'انتهت',
      minuteBadge: 'FT',
      statusLabel: 'انتهت',
      kickoffTimeStr,
    };
  }

  // 2. Postponed matches
  if (status === 'POSTPONED' || rawStatus === 'POSTPONED') {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      isPostponed: true,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: 'مؤجلة',
      minuteBadge: 'مؤجلة',
      statusLabel: 'مؤجلة',
      kickoffTimeStr,
    };
  }

  // 3. Cancelled matches
  if (status === 'CANCELLED' || rawStatus === 'CANCELLED') {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      isPostponed: false,
      isCancelled: true,
      isSuspended: false,
      timerFormatted: 'ملغاة',
      minuteBadge: 'ملغاة',
      statusLabel: 'ملغاة',
      kickoffTimeStr,
    };
  }

  // 4. Suspended / Abandoned matches
  if (status === 'SUSPENDED' || rawStatus === 'SUSPENDED' || rawStatus === 'ABANDONED') {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      isPostponed: false,
      isCancelled: false,
      isSuspended: true,
      timerFormatted: 'معلقة',
      minuteBadge: 'معلقة',
      statusLabel: 'معلقة',
      kickoffTimeStr,
    };
  }

  const diffMs = nowTimestamp - kickoffDate.getTime();

  // 5. If match has not kicked off yet (scheduled time in the future)
  const isExplicitInPlay = (
    rawStatus === 'IN_PLAY' ||
    rawStatus === 'LIVE' ||
    rawStatus === '1H' ||
    rawStatus === '2H' ||
    rawStatus === 'SECOND_HALF' ||
    rawStatus === 'PAUSED' ||
    rawStatus === 'HALFTIME' ||
    rawStatus === 'HT'
  );

  if (diffMs < 0 && !isExplicitInPlay) {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: true,
      isPostponed: false,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: kickoffTimeStr,
      minuteBadge: kickoffTimeStr,
      statusLabel: 'مجدولة',
      kickoffTimeStr,
    };
  }

  // 6. Explicitly Scheduled / Timed matches where status has not turned into LIVE
  if (
    (status === 'SCHEDULED' || status === 'TIMED' || rawStatus === 'SCHEDULED' || rawStatus === 'TIMED') &&
    !isExplicitInPlay &&
    status !== 'LIVE'
  ) {
    // If more than 135 minutes have passed since kickoff date, it must be finished
    if (diffMs > HARD_FINISH_CAP_MS) {
      return {
        isLive: false,
        isHalfTime: false,
        isFirstHalf: false,
        isSecondHalf: false,
        isFinished: true,
        isScheduled: false,
        isPostponed: false,
        isCancelled: false,
        isSuspended: false,
        timerFormatted: 'انتهت',
        minuteBadge: 'FT',
        statusLabel: 'انتهت',
        kickoffTimeStr,
      };
    }

    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: true,
      isPostponed: false,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: kickoffTimeStr,
      minuteBadge: kickoffTimeStr,
      statusLabel: 'مجدولة',
      kickoffTimeStr,
    };
  }

  // 7. If more than 125 minutes have passed since scheduled kickoff time without live API feed minute <= 120,
  // the match is DEFINITIVELY finished. Rejects unreasonable extra time (e.g. 200+, 500+ mins).
  if (diffMs > HARD_FINISH_CAP_MS && (typeof match.minute !== 'number' || match.minute > 120)) {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: true,
      isScheduled: false,
      isPostponed: false,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: 'انتهت',
      minuteBadge: 'FT',
      statusLabel: 'انتهت',
      kickoffTimeStr,
    };
  }

  // 8. If match has explicit minute provided directly from live API feed (e.g. minute 1..90+)
  if (typeof match.minute === 'number' && match.minute > 0 && match.minute <= 125) {
    const apiMinute = match.minute;
    const currentSecond = Math.floor((nowTimestamp % 60000) / 1000);
    const secStr = String(currentSecond).padStart(2, '0');
    const minStr = String(apiMinute).padStart(2, '0');

    if (apiMinute <= 45) {
      return {
        isLive: true,
        isHalfTime: false,
        isFirstHalf: true,
        isSecondHalf: false,
        isFinished: false,
        isScheduled: false,
        isPostponed: false,
        isCancelled: false,
        isSuspended: false,
        timerFormatted: `${minStr}:${secStr}`,
        minuteBadge: `${apiMinute}'`,
        statusLabel: 'مباشر',
        kickoffTimeStr,
      };
    } else {
      const badge = apiMinute > 90 ? `90+${apiMinute - 90}'` : `${apiMinute}'`;
      return {
        isLive: true,
        isHalfTime: false,
        isFirstHalf: false,
        isSecondHalf: true,
        isFinished: false,
        isScheduled: false,
        isPostponed: false,
        isCancelled: false,
        isSuspended: false,
        timerFormatted: `${minStr}:${secStr}`,
        minuteBadge: badge,
        statusLabel: 'مباشر',
        kickoffTimeStr,
      };
    }
  }

  // 9. Halftime Check (Explicit paused or calculated interval between 48m and 66.5m)
  const isExplicitHalfTime = (
    rawStatus === 'PAUSED' ||
    rawStatus === 'HALFTIME' ||
    rawStatus === 'HT' ||
    rawStatus === 'INT' ||
    rawStatus === 'BREAK'
  );

  const isExplicitSecondHalf = (
    rawStatus === '2H' ||
    rawStatus === 'SECOND_HALF' ||
    rawStatus === '2ND_HALF'
  );

  const isEstimatedHalftime = !isExplicitSecondHalf && (diffMs >= FIRST_HALF_DURATION_MS && diffMs < HALFTIME_END_MS);

  if (isExplicitHalfTime || isEstimatedHalftime) {
    return {
      isLive: true,
      isHalfTime: true,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      isPostponed: false,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: 'استراحة',
      minuteBadge: 'الشوط الأول',
      statusLabel: 'الشوط الأول',
      kickoffTimeStr,
    };
  }

  // 10. First Half: Starts from actual whistle (kickoff delay adjusted)
  if (diffMs < HALFTIME_END_MS && !isExplicitSecondHalf) {
    const elapsedSinceWhistleMs = Math.max(0, diffMs - KICKOFF_DELAY_MS);
    const totalElapsedSec = Math.floor(elapsedSinceWhistleMs / 1000);
    const totalElapsedMin = Math.floor(totalElapsedSec / 60);
    const currentSec = totalElapsedSec % 60;

    // Cap 1st half extra time display at 45+5'
    const displayMin = Math.min(totalElapsedMin, 50);
    const minStr = String(displayMin).padStart(2, '0');
    const secStr = String(currentSec).padStart(2, '0');
    const minuteBadge = displayMin > 45 
      ? `45+${displayMin - 45}'` 
      : `${displayMin + 1}'`;

    return {
      isLive: true,
      isHalfTime: false,
      isFirstHalf: true,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      isPostponed: false,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: `${minStr}:${secStr}`,
      minuteBadge,
      statusLabel: 'مباشر',
      kickoffTimeStr,
    };
  }

  // 11. Second Half: Starts at whistle from HALFTIME_END_MS and counts from 45:00 upwards
  const elapsedInSecondHalfMs = isExplicitSecondHalf
    ? Math.max(0, diffMs - KICKOFF_DELAY_MS)
    : Math.max(0, diffMs - HALFTIME_END_MS);

  const totalSecondHalfSec = Math.floor(elapsedInSecondHalfMs / 1000);
  const secondHalfMinutes = Math.floor(totalSecondHalfSec / 60);
  const currentSec = totalSecondHalfSec % 60;

  const rawMatchMinute = 45 + secondHalfMinutes;
  
  // Hard cap at 90+10' (100th minute) - If elapsed beyond that, conclude match
  if (rawMatchMinute > 100) {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: true,
      isScheduled: false,
      isPostponed: false,
      isCancelled: false,
      isSuspended: false,
      timerFormatted: 'انتهت',
      minuteBadge: 'FT',
      statusLabel: 'انتهت',
      kickoffTimeStr,
    };
  }

  const currentMatchMinute = Math.min(rawMatchMinute, 100);
  const minStr = String(currentMatchMinute).padStart(2, '0');
  const secStr = String(currentSec).padStart(2, '0');

  const minuteBadge = currentMatchMinute > 90 
    ? `90+${currentMatchMinute - 90}'` 
    : `${currentMatchMinute + 1}'`;

  return {
    isLive: true,
    isHalfTime: false,
    isFirstHalf: false,
    isSecondHalf: true,
    isFinished: false,
    isScheduled: false,
    isPostponed: false,
    isCancelled: false,
    isSuspended: false,
    timerFormatted: `${minStr}:${secStr}`,
    minuteBadge,
    statusLabel: 'مباشر',
    kickoffTimeStr,
  };
}

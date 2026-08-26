export interface LiveTimeState {
  isLive: boolean;
  isHalfTime: boolean;
  isFirstHalf: boolean;
  isSecondHalf: boolean;
  isFinished: boolean;
  isScheduled: boolean;
  timerFormatted: string; // e.g. "34:20" or "55:20" or "الشوط الأول" or "62:10"
  minuteBadge: string; // e.g. "35'" or "45+2'" or "الشوط الأول" or "56'"
  statusLabel: string; // "مباشر" or "الشوط الأول" or "الشوط الثاني" or "انتهت" or "مجدولة"
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
 * Formats match kickoff date/time string in clean Arabic representation
 */
export function formatKickoffTime(dateStr?: string): string {
  if (!dateStr) return '00:00';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '00:00';
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Realistic professional football match timeline constants:
 * - Kickoff whistle delay: ~1.5 minutes after scheduled time for lineups & coin toss
 * - 1st half: 45 min regulation + ~3 min stoppage time = 48 min
 * - Halftime break: 15 min regulation interval + ~2.5 min tunnel walk = ~17.5 min
 * - 2nd half kickoff whistle: ~67.0 minutes after scheduled kickoff time
 */
const KICKOFF_DELAY_MS = 1.5 * 60 * 1000; // 1m 30s
const FIRST_HALF_DURATION_MS = 48 * 60 * 1000; // 48m (45m + 3m stoppage)
const HALFTIME_END_MS = 66.5 * 60 * 1000; // 66m 30s from scheduled start (1H + break)

/**
 * Calculates current live state, real-time elapsed match counter, halftime pause, and kickoff time
 */
export function calculateLiveTime(match: MatchTimerInput, nowTimestamp: number = Date.now()): LiveTimeState {
  const kickoffDate = new Date(match.utcDate || match.matchDate || Date.now());
  const kickoffTimeStr = !isNaN(kickoffDate.getTime())
    ? kickoffDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })
    : (match.kickoffTime || '00:00');

  const status = (match.status || 'SCHEDULED').toUpperCase();
  const rawStatus = (match.rawStatus || '').toUpperCase();

  // 1. Finished matches
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
      timerFormatted: 'انتهت',
      minuteBadge: 'FT',
      statusLabel: 'انتهت',
      kickoffTimeStr,
    };
  }

  // 2. Explicitly Scheduled / Timed matches
  if (
    status === 'SCHEDULED' ||
    status === 'TIMED' ||
    rawStatus === 'SCHEDULED' ||
    rawStatus === 'TIMED'
  ) {
    return {
      isLive: false,
      isHalfTime: false,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: true,
      timerFormatted: kickoffTimeStr,
      minuteBadge: kickoffTimeStr,
      statusLabel: 'مجدولة',
      kickoffTimeStr,
    };
  }

  const diffMs = nowTimestamp - kickoffDate.getTime();

  // 3. If kickoff time has not arrived yet and status is not in-play
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
      timerFormatted: kickoffTimeStr,
      minuteBadge: kickoffTimeStr,
      statusLabel: 'مجدولة',
      kickoffTimeStr,
    };
  }

  // 4. Halftime Check (Paused / Break between halves)
  const isExplicitHalfTime = (
    rawStatus === 'PAUSED' ||
    rawStatus === 'HALFTIME' ||
    rawStatus === 'HT' ||
    rawStatus === 'INT' ||
    rawStatus === 'BREAK'
  );

  // 5. If match has explicit minute provided directly from live API feed (e.g. minute 1..90+)
  if (typeof match.minute === 'number' && match.minute > 0) {
    const apiMinute = match.minute;
    // Calculate live seconds within the minute based on current wall clock
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
        timerFormatted: `${minStr}:${secStr}`,
        minuteBadge: `${apiMinute}'`,
        statusLabel: 'مباشر',
        kickoffTimeStr,
      };
    } else {
      // 2nd half from API (minute 46+) - Immediately in 2nd half with real minute
      const badge = apiMinute > 90 ? `90+${apiMinute - 90}'` : `${apiMinute}'`;
      return {
        isLive: true,
        isHalfTime: false,
        isFirstHalf: false,
        isSecondHalf: true,
        isFinished: false,
        isScheduled: false,
        timerFormatted: `${minStr}:${secStr}`,
        minuteBadge: badge,
        statusLabel: 'مباشر',
        kickoffTimeStr,
      };
    }
  }

  // If explicitly paused in Halftime
  if (isExplicitHalfTime) {
    return {
      isLive: true,
      isHalfTime: true,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      timerFormatted: 'الشوط الأول',
      minuteBadge: 'الشوط الأول',
      statusLabel: 'الشوط الأول',
      kickoffTimeStr,
    };
  }

  // 6. Check if 2nd half is explicitly specified by status
  const isExplicitSecondHalf = (
    rawStatus === '2H' ||
    rawStatus === 'SECOND_HALF' ||
    rawStatus === '2ND_HALF'
  );

  // 7. Timeline Calculation based on actual whistle timings:
  const isEstimatedHalftime = !isExplicitSecondHalf && (diffMs >= FIRST_HALF_DURATION_MS && diffMs < HALFTIME_END_MS);

  if (isEstimatedHalftime) {
    return {
      isLive: true,
      isHalfTime: true,
      isFirstHalf: false,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      timerFormatted: 'الشوط الأول',
      minuteBadge: 'الشوط الأول',
      statusLabel: 'الشوط الأول',
      kickoffTimeStr,
    };
  }

  // 8. First Half: Starts from actual whistle (kickoff delay adjusted)
  if (diffMs < HALFTIME_END_MS && !isExplicitSecondHalf) {
    const elapsedSinceWhistleMs = Math.max(0, diffMs - KICKOFF_DELAY_MS);
    const totalElapsedSec = Math.floor(elapsedSinceWhistleMs / 1000);
    const totalElapsedMin = Math.floor(totalElapsedSec / 60);
    const currentSec = totalElapsedSec % 60;

    const minStr = String(totalElapsedMin).padStart(2, '0');
    const secStr = String(currentSec).padStart(2, '0');
    const minuteBadge = totalElapsedMin >= 45 
      ? `45+${totalElapsedMin - 44}'` 
      : `${totalElapsedMin + 1}'`;

    return {
      isLive: true,
      isHalfTime: false,
      isFirstHalf: true,
      isSecondHalf: false,
      isFinished: false,
      isScheduled: false,
      timerFormatted: `${minStr}:${secStr}`,
      minuteBadge,
      statusLabel: 'مباشر',
      kickoffTimeStr,
    };
  }

  // 9. Second Half: Starts at whistle from HALFTIME_END_MS and counts from 45:00 upwards
  const elapsedInSecondHalfMs = isExplicitSecondHalf
    ? Math.max(0, diffMs - KICKOFF_DELAY_MS)
    : Math.max(0, diffMs - HALFTIME_END_MS);

  const totalSecondHalfSec = Math.floor(elapsedInSecondHalfMs / 1000);
  const secondHalfMinutes = Math.floor(totalSecondHalfSec / 60);
  const currentSec = totalSecondHalfSec % 60;

  const currentMatchMinute = 45 + secondHalfMinutes;
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
    timerFormatted: `${minStr}:${secStr}`,
    minuteBadge,
    statusLabel: 'مباشر',
    kickoffTimeStr,
  };
}

import React, { useState, useEffect } from 'react';
import type { PredictionMatchInfo } from '../../types';
import {
  Clock,
  Unlock,
  Lock,
  CheckCircle2,
  Sparkles,
  Users,
  Save,
  Loader2,
  Trophy,
  Check,
  ChevronDown,
  ChevronUp,
  Radio,
  Crown,
  Target,
  Shield,
  Plus,
  Minus,
  Pencil,
  X,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMeccaDate, formatMeccaTime } from '../../utils/timezoneDateUtils';
import { getArabicTeamName } from '../../utils/teamTranslations';

export interface PredictionMatchCardProps {
  key?: React.Key;
  predictionMatch: PredictionMatchInfo;
  isLoggedIn: boolean;
  isApprovedParticipant?: boolean;
  userParticipationStatus?: string;
  contestStatus?: 'active' | 'completed' | 'none';
  onSavePrediction: (predictionMatchId: number, homeScore: number, awayScore: number) => Promise<boolean>;
  onRequestLogin: () => void | Promise<any>;
  onRequestRegister?: () => void;
}

export function formatPointsLabel(pts: number = 2): string {
  if (pts === 1) return 'نقطة واحدة للتوقع الدقيق';
  if (pts === 2) return 'نقطتان للتوقع الدقيق';
  if (pts >= 3 && pts <= 10) return `${pts} نقاط للتوقع الدقيق`;
  return `${pts} نقطة للتوقع الدقيق`;
}

/**
 * Calculates human-readable kickoff details in Mecca timezone:
 * Time (e.g. 09:30 م), Relative Date (اليوم, غداً, الجمعة 26 سبتمبر), Full Date, and flags.
 */
function getMatchKickoffDetails(dateStr?: string | Date) {
  if (!dateStr) {
    return {
      time: '--:--',
      date: '',
      isToday: false,
      isTomorrow: false,
      fullDate: '',
      fullDateTime: '',
    };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return {
      time: '--:--',
      date: '',
      isToday: false,
      isTomorrow: false,
      fullDate: '',
      fullDateTime: '',
    };
  }

  const time = formatMeccaTime(d, { hour: '2-digit', minute: '2-digit', hour12: true });

  const now = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };

  const matchDayStr = d.toLocaleDateString('en-CA', dateOptions);
  const todayStr = now.toLocaleDateString('en-CA', dateOptions);

  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', dateOptions);

  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', dateOptions);

  let dateLabel = '';
  let isToday = false;
  let isTomorrow = false;

  if (matchDayStr === todayStr) {
    dateLabel = 'اليوم';
    isToday = true;
  } else if (matchDayStr === tomorrowStr) {
    dateLabel = 'غداً';
    isTomorrow = true;
  } else if (matchDayStr === yesterdayStr) {
    dateLabel = 'أمس';
  } else {
    dateLabel = d.toLocaleDateString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  const fullDate = formatMeccaDate(d, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const fullDateTime = `${fullDate} • ${time} (توقيت مكة)`;

  return { time, date: dateLabel, isToday, isTomorrow, fullDate, fullDateTime };
}

function PredictionMatchCard({
  predictionMatch,
  isLoggedIn,
  isApprovedParticipant = true,
  userParticipationStatus = 'approved',
  contestStatus = 'active',
  onSavePrediction,
  onRequestLogin,
  onRequestRegister,
}: PredictionMatchCardProps) {
  const m = predictionMatch.match;
  const userPred = predictionMatch.userPrediction;
  const ptsPerMatch = predictionMatch.pointsPerMatch || 2;
  const isContestActive = contestStatus === 'active';

  const [homeScore, setHomeScore] = useState<number | ''>(
    userPred !== undefined && userPred !== null ? userPred.homeScore : 0
  );
  const [awayScore, setAwayScore] = useState<number | ''>(
    userPred !== undefined && userPred !== null ? userPred.awayScore : 0
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showWinnersList, setShowWinnersList] = useState(false);

  // Fallback states for images if external URLs fail
  const [homeLogoError, setHomeLogoError] = useState(false);
  const [awayLogoError, setAwayLogoError] = useState(false);
  const [leagueLogoError, setLeagueLogoError] = useState(false);

  useEffect(() => {
    if (userPred) {
      setHomeScore(userPred.homeScore);
      setAwayScore(userPred.awayScore);
    }
  }, [userPred]);

  const isCalculated =
    predictionMatch.isCalculated ||
    predictionMatch.matchState === 'calculated' ||
    (m.status === 'FINISHED' && predictionMatch.pointsPerMatch !== undefined);
  const isFinished =
    isCalculated ||
    predictionMatch.matchState === 'pending_admin' ||
    m.status === 'FINISHED' ||
    m.status === 'FT' ||
    m.status === 'AET' ||
    m.status === 'PEN';
  const isLive =
    predictionMatch.matchState === 'live' ||
    m.status === 'LIVE' ||
    m.status === 'IN_PLAY' ||
    m.status === 'PAUSED' ||
    m.status === '1H' ||
    m.status === '2H' ||
    m.status === 'HT';
  const isOpen =
    contestStatus !== 'completed' &&
    (predictionMatch.isOpenForPrediction || predictionMatch.matchState === 'open') &&
    !isFinished &&
    !isLive;

  // Kickoff timing details
  const kickoff = getMatchKickoffDetails(m.matchDate);

  // Translated team names
  const homeTeamDisplayName = getArabicTeamName(m.homeTeam.name) || m.homeTeam.name;
  const awayTeamDisplayName = getArabicTeamName(m.awayTeam.name) || m.awayTeam.name;

  const handleScoreChange = (team: 'home' | 'away', val: string) => {
    if (val === '') {
      if (team === 'home') setHomeScore('');
      else setAwayScore('');
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    if (num < 0 || num > 99) return;
    if (team === 'home') setHomeScore(num);
    else setAwayScore(num);
  };

  const adjustScore = (team: 'home' | 'away', delta: number) => {
    if (team === 'home') {
      const current = typeof homeScore === 'number' ? homeScore : 0;
      const next = Math.max(0, Math.min(99, current + delta));
      setHomeScore(next);
    } else {
      const current = typeof awayScore === 'number' ? awayScore : 0;
      const next = Math.max(0, Math.min(99, current + delta));
      setAwayScore(next);
    }
  };

  const openModal = () => {
    if (!isLoggedIn) {
      onRequestLogin();
      return;
    }
    if (!isApprovedParticipant) {
      if (onRequestRegister) onRequestRegister();
      return;
    }
    // Sync latest score values before opening
    if (userPred) {
      setHomeScore(userPred.homeScore);
      setAwayScore(userPred.awayScore);
    } else {
      if (homeScore === '') setHomeScore(0);
      if (awayScore === '') setAwayScore(0);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (homeScore === '' || awayScore === '') return;
    setIsSaving(true);
    try {
      const success = await onSavePrediction(
        predictionMatch.id,
        Number(homeScore),
        Number(awayScore)
      );
      if (success) {
        setJustSaved(true);
        setTimeout(() => {
          setJustSaved(false);
          setIsModalOpen(false);
        }, 300);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Match status badge config
  const matchStatusBadge = (() => {
    if (isLive) {
      return {
        bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500 animate-ping',
        text: 'مباشر الآن',
        icon: Radio,
      };
    }
    if (isCalculated) {
      return {
        bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
        text: 'انتهت واعتُمدت',
        icon: CheckCircle2,
      };
    }
    if (isFinished) {
      return {
        bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        text: 'انتهت المباراة',
        icon: Clock,
      };
    }
    if (isOpen) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        text: 'التوقع متاح',
        icon: Unlock,
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400',
      text: 'مغلق',
      icon: Lock,
    };
  })();

  // Prediction state computation for user
  const userPredictionState = (() => {
    if (isCalculated && userPred) {
      if (userPred.pointsEarned > 0) {
        return {
          type: 'points_earned' as const,
          label: 'حصلت على نقاط',
          badgeText: userPred.isGolden
            ? `توقع ذهبي (+${userPred.pointsEarned} نقاط)`
            : `توقع دقيق (+${userPred.pointsEarned} نقاط)`,
          bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
          canEdit: false,
        };
      }
      return {
        type: 'finished_evaluated' as const,
        label: 'انتهت المباراة',
        badgeText: 'توقع غير دقيق (0 نقاط)',
        bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        canEdit: false,
      };
    }

    if (isFinished) {
      return {
        type: 'finished' as const,
        label: 'انتهت المباراة',
        badgeText: userPred ? 'انتهت المباراة • بانتظار الاعتماد' : 'انتهت المباراة • لم تشارك بالتوقع',
        bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200 dark:border-amber-800',
        canEdit: false,
      };
    }

    if (isLive) {
      return {
        type: 'live' as const,
        label: 'بدأت المباراة',
        badgeText: userPred ? 'بدأت المباراة • لا يمكن التعديل' : 'بدأت المباراة • لم يتم التوقع',
        bg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border-rose-200 dark:border-rose-800',
        canEdit: false,
      };
    }

    if (!isOpen) {
      return {
        type: 'closed' as const,
        label: 'مغلق',
        badgeText: userPred ? 'مغلق • لا يمكن التعديل' : 'مغلق • لم يتم التوقع',
        bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        canEdit: false,
      };
    }

    if (userPred) {
      return {
        type: 'predicted' as const,
        label: 'تم التوقع',
        badgeText: 'تم تسجيل توقعك • يمكنك التعديل قبل البداية',
        bg: 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 border-blue-200 dark:border-blue-800',
        canEdit: true,
      };
    }

    return {
      type: 'not_predicted' as const,
      label: 'لم يتم التوقع',
      badgeText: 'لم تسجل توقعك بعد • توقع الآن واكسب النقاط',
      bg: 'bg-amber-50/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200/80 dark:border-amber-800/60',
      canEdit: true,
    };
  })();

  const StatusIcon = matchStatusBadge.icon;

  return (
    <div
      id={`prediction-match-${predictionMatch.id}`}
      className={`group relative rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        isLive
          ? 'border-rose-400 dark:border-rose-700/80 shadow-sm ring-1 ring-rose-500/20'
          : isCalculated && userPred?.pointsEarned && userPred.pointsEarned > 0
          ? userPred.isGolden
            ? 'border-amber-400 dark:border-amber-600 shadow-sm ring-1 ring-amber-500/20'
            : 'border-emerald-400 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-500/20'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm'
      }`}
    >
      {/* 1. Header Bar: Tournament, Match Status, and Reward Points */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        {/* Tournament Name & Logo */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {m.leagueLogo && !leagueLogoError ? (
            <img
              src={m.leagueLogo}
              alt={m.leagueName}
              className="w-4 h-4 object-contain shrink-0"
              onError={() => setLeagueLogoError(true)}
              loading="lazy"
            />
          ) : (
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {m.leagueName || 'مسابقة التوقعات'}
          </span>
        </div>

        {/* Status Badge + Points Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isOpen && !userPred && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs animate-pulse">
              <span>✨</span>
              <span>بانتظار توقعك</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${matchStatusBadge.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${matchStatusBadge.dot}`} />
            <StatusIcon className="w-3 h-3 shrink-0" />
            <span>{matchStatusBadge.text}</span>
          </span>

          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/70 font-mono shrink-0 shadow-2xs"
            title={formatPointsLabel(ptsPerMatch)}
          >
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span>+{ptsPerMatch} نقاط</span>
          </span>
        </div>
      </div>

      {/* 2. Match Kickoff Timing Bar (Time & Date clearly displayed as requested) */}
      <div className="bg-slate-100/60 dark:bg-slate-800/30 px-4 py-2 border-b border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
        {/* Date Display */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-slate-700 dark:text-slate-200 font-bold truncate">
            {kickoff.date || kickoff.fullDate || 'موعد المباراة'}
          </span>
          {kickoff.isToday && (
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20 shrink-0">
              اليوم
            </span>
          )}
          {kickoff.isTomorrow && (
            <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-500/20 shrink-0">
              غداً
            </span>
          )}
        </div>

        {/* Kickoff Time Display (Mecca timezone) */}
        <div className="flex items-center gap-1.5 shrink-0" title={kickoff.fullDateTime}>
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 dir-ltr">
            {kickoff.time}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
            بتوقيت مكة
          </span>
        </div>
      </div>

      {/* 3. Main Arena: Home Team, Score / Kickoff Centerpiece, Away Team */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
          
          {/* Home Team (Right in RTL) */}
          <div className="col-span-4 flex flex-col items-center text-center gap-2 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 p-2 sm:p-2.5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs">
              {m.homeTeam.logo && !homeLogoError ? (
                <img
                  src={m.homeTeam.logo}
                  alt={homeTeamDisplayName}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setHomeLogoError(true)}
                  loading="lazy"
                />
              ) : (
                <Shield className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4
              className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight break-words max-w-[110px]"
              title={homeTeamDisplayName}
            >
              {homeTeamDisplayName}
            </h4>
          </div>

          {/* Center Arena Hub */}
          <div className="col-span-4 flex flex-col items-center justify-center min-w-0 px-1">
            {/* Scenario 1: LIVE or FINISHED Official Scoreboard */}
            {isFinished || isLive ? (
              <div className="flex flex-col items-center gap-1.5 w-full">
                <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {isLive ? 'النتيجة المباشرة' : 'النتيجة النهائية'}
                </span>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 dir-ltr w-full">
                  <div className="min-w-[2.25rem] sm:min-w-[3rem] h-10 sm:h-12 rounded-xl bg-slate-900 dark:bg-black text-white font-mono text-xl sm:text-2xl font-black flex items-center justify-center px-1.5 shadow-inner border border-slate-800">
                    {m.homeScore ?? '-'}
                  </div>
                  <span className="text-base sm:text-xl font-bold text-slate-400">:</span>
                  <div className="min-w-[2.25rem] sm:min-w-[3rem] h-10 sm:h-12 rounded-xl bg-slate-900 dark:bg-black text-white font-mono text-xl sm:text-2xl font-black flex items-center justify-center px-1.5 shadow-inner border border-slate-800">
                    {m.awayScore ?? '-'}
                  </div>
                </div>

                {/* Sub-indicator if user had a prediction */}
                {userPred && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 dir-ltr">
                    <span className="text-[10px] text-slate-400">توقعك:</span>
                    <span>{userPred.homeScore} - {userPred.awayScore}</span>
                  </div>
                )}
              </div>
            ) : userPred ? (
              /* Scenario 2: SCHEDULED/OPEN and user ALREADY PREDICTED */
              <button
                type="button"
                onClick={() => isOpen && openModal()}
                disabled={!isOpen}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all w-full max-w-[150px] ${
                  isOpen
                    ? 'cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950/30 hover:scale-105 active:scale-95 border border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                    : 'cursor-default'
                }`}
                title={isOpen ? 'اضغط لتعديل توقعك' : 'توقعك المسجل'}
              >
                <div className="flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400">
                  <Target className="w-3.5 h-3.5" />
                  <span>توقعك</span>
                  {isOpen && <Pencil className="w-3 h-3 text-blue-500 ml-0.5" />}
                </div>

                <div className="flex items-center justify-center gap-1.5 sm:gap-2 dir-ltr">
                  <div className="min-w-[2.25rem] sm:min-w-[2.75rem] h-10 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 border-2 border-blue-300 dark:border-blue-700 font-mono text-xl sm:text-2xl font-black flex items-center justify-center px-1.5 shadow-2xs">
                    {userPred.homeScore}
                  </div>
                  <span className="text-base sm:text-lg font-black text-blue-400 font-mono">:</span>
                  <div className="min-w-[2.25rem] sm:min-w-[2.75rem] h-10 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 border-2 border-blue-300 dark:border-blue-700 font-mono text-xl sm:text-2xl font-black flex items-center justify-center px-1.5 shadow-2xs">
                    {userPred.awayScore}
                  </div>
                </div>

                {isOpen && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 underline underline-offset-2">
                    تعديل التوقع
                  </span>
                )}
              </button>
            ) : isOpen ? (
              /* Scenario 3: SCHEDULED/OPEN and user HAS NOT PREDICTED YET */
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-lg font-black font-mono text-slate-800 dark:text-slate-100 dir-ltr">
                    {kickoff.time}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    صافرة البداية
                  </span>
                </div>

                <button
                  type="button"
                  onClick={openModal}
                  className="min-h-[42px] px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all shadow-xs hover:shadow active:scale-95 cursor-pointer flex items-center gap-1.5 group/btn whitespace-nowrap"
                >
                  <Target className="w-4 h-4 text-amber-300 group-hover/btn:scale-110 transition-transform" />
                  <span>توقع النتيجة</span>
                </button>
              </div>
            ) : (
              /* Scenario 4: CLOSED and not predicted */
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-black text-slate-400 dark:text-slate-500 shadow-2xs">
                  VS
                </div>
                <span className="text-[10px] font-bold text-slate-400 text-center">
                  التوقع مغلق
                </span>
              </div>
            )}
          </div>

          {/* Away Team (Left in RTL) */}
          <div className="col-span-4 flex flex-col items-center text-center gap-2 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 p-2 sm:p-2.5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs">
              {m.awayTeam.logo && !awayLogoError ? (
                <img
                  src={m.awayTeam.logo}
                  alt={awayTeamDisplayName}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setAwayLogoError(true)}
                  loading="lazy"
                />
              ) : (
                <Shield className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4
              className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight break-words max-w-[110px]"
              title={awayTeamDisplayName}
            >
              {awayTeamDisplayName}
            </h4>
          </div>

        </div>
      </div>

      {/* 4. Footer Banner: Prediction Evaluation & Status */}
      <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        {/* Prediction Status Badge */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${userPredictionState.bg}`}
          >
            {userPredictionState.type === 'points_earned' ? (
              userPred?.isGolden ? (
                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )
            ) : userPredictionState.type === 'predicted' ? (
              <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            ) : userPredictionState.type === 'not_predicted' ? (
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span>{userPredictionState.badgeText}</span>
          </span>

          {/* Participants Community Count */}
          {predictionMatch.participantsCount !== undefined && predictionMatch.participantsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{predictionMatch.participantsCount} متسابق</span>
            </span>
          )}
        </div>

        {/* Action Button (Edit / Predict / Login) */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isOpen && isLoggedIn && isApprovedParticipant && (
            userPred ? (
              <button
                type="button"
                onClick={openModal}
                className="w-full sm:w-auto min-h-[38px] px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="تعديل التوقع"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>تعديل التوقع</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openModal}
                className="w-full sm:w-auto min-h-[38px] px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5 text-amber-300" />
                <span>سجل توقعك</span>
              </button>
            )
          )}

          {isOpen && (!isLoggedIn || !isApprovedParticipant) && (
            <button
              type="button"
              onClick={!isLoggedIn ? onRequestLogin : onRequestRegister}
              className="w-full sm:w-auto min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
            >
              {!isLoggedIn
                ? 'سجل دخولك للتوقع'
                : userParticipationStatus === 'pending'
                ? 'طلبك قيد المراجعة'
                : 'اشترك بالمسابقة'}
            </button>
          )}
        </div>
      </div>

      {/* 5. Correct Predictors Section (أصحاب التوقع الصحيح) */}
      {isCalculated && predictionMatch.correctPredictorsCount !== undefined && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setShowWinnersList(!showWinnersList)}
            className="w-full flex items-center justify-between text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>أصحاب التوقع الصحيح ({predictionMatch.correctPredictorsCount})</span>
            </div>
            {showWinnersList ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <AnimatePresence>
            {showWinnersList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2.5"
              >
                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  {predictionMatch.correctPredictors &&
                  predictionMatch.correctPredictors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {predictionMatch.correctPredictors.map((winner) => (
                        <div
                          key={winner.id}
                          className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs"
                        >
                          {winner.isGolden ? (
                            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span>{winner.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-center text-slate-500 font-bold py-1">
                      لم يتمكن أي متسابق من توقع النتيجة الصحيحة لهذه المباراة.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 6. Prediction Input Modal (واجهة تسجيل وتعديل التوقع) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 p-5 sm:p-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/60 shadow-2xs">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {userPred ? 'تعديل توقع النتيجة' : 'تسجيل توقع النتيجة'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{m.leagueName}</span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-mono">
                        {kickoff.fullDateTime || kickoff.time}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isSaving && setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="إغلاق النافذة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Match Stepper Arena */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 mb-4">
                <div className="grid grid-cols-12 items-center gap-2">
                  
                  {/* Home Team */}
                  <div className="col-span-4 flex flex-col items-center text-center gap-2 min-w-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-2.5 flex items-center justify-center shadow-xs">
                      {m.homeTeam.logo && !homeLogoError ? (
                        <img
                          src={m.homeTeam.logo}
                          alt={homeTeamDisplayName}
                          className="max-w-full max-h-full object-contain"
                          onError={() => setHomeLogoError(true)}
                        />
                      ) : (
                        <Shield className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                      {homeTeamDisplayName}
                    </span>
                  </div>

                  {/* Steppers in Center */}
                  <div className="col-span-4 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 mb-2 whitespace-nowrap">
                      النتيجة المتوقعة
                    </span>
                    <div className="flex items-center gap-1.5 dir-ltr">
                      {/* Home Score Stepper */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustScore('home', 1)}
                          className="w-9 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-600 flex items-center justify-center text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={homeScore}
                          onChange={(e) => handleScoreChange('home', e.target.value)}
                          className="w-10 sm:w-11 h-11 sm:h-12 text-center text-xl sm:text-2xl font-black font-mono bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl text-slate-900 dark:text-white shadow-inner outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => adjustScore('home', -1)}
                          className="w-9 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-600 flex items-center justify-center text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      <span className="text-xl font-mono font-bold text-slate-400 mb-2">:</span>

                      {/* Away Score Stepper */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustScore('away', 1)}
                          className="w-9 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-600 flex items-center justify-center text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={awayScore}
                          onChange={(e) => handleScoreChange('away', e.target.value)}
                          className="w-10 sm:w-11 h-11 sm:h-12 text-center text-xl sm:text-2xl font-black font-mono bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl text-slate-900 dark:text-white shadow-inner outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => adjustScore('away', -1)}
                          className="w-9 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-600 flex items-center justify-center text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="col-span-4 flex flex-col items-center text-center gap-2 min-w-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-2.5 flex items-center justify-center shadow-xs">
                      {m.awayTeam.logo && !awayLogoError ? (
                        <img
                          src={m.awayTeam.logo}
                          alt={awayTeamDisplayName}
                          className="max-w-full max-h-full object-contain"
                          onError={() => setAwayLogoError(true)}
                        />
                      ) : (
                        <Shield className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                      {awayTeamDisplayName}
                    </span>
                  </div>

                </div>

                {/* Prediction Outcome Indicator */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    {Number(homeScore) > Number(awayScore)
                      ? `توقعك: فوز ${homeTeamDisplayName} (${homeScore} - ${awayScore})`
                      : Number(homeScore) < Number(awayScore)
                      ? `توقعك: فوز ${awayTeamDisplayName} (${homeScore} - ${awayScore})`
                      : `توقعك: تعادل الفريقين (${homeScore} - ${awayScore})`}
                  </span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || homeScore === '' || awayScore === ''}
                  className={`flex-1 min-h-[46px] rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    justSaved
                      ? 'bg-emerald-600 text-white'
                      : isSaving || homeScore === '' || awayScore === ''
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-98'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : justSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم الحفظ بنجاح</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{userPred ? 'تحديث وحفظ التوقع' : 'تأكيد التوقع'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(PredictionMatchCard);

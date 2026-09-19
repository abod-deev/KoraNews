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
  XCircle,
  Shield,
  Send,
  Plus,
  Minus,
  Pencil,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

export default function PredictionMatchCard({
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

  const formattedDate = (() => {
    try {
      const d = new Date(m.matchDate);
      return (
        d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) +
        ' • ' +
        d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return m.matchTime || m.matchDate;
    }
  })();

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
        }, 900);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Match status badge config
  const matchStatusBadge = (() => {
    if (isLive) {
      return {
        bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
        dot: 'bg-rose-500 animate-ping',
        text: 'بدأت المباراة (مباشر)',
        icon: Radio,
      };
    }
    if (isCalculated) {
      return {
        bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
        dot: 'bg-slate-400',
        text: 'انتهت المباراة واعتُمدت',
        icon: CheckCircle2,
      };
    }
    if (isFinished) {
      return {
        bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        text: 'انتهت المباراة',
        icon: Clock,
      };
    }
    if (isOpen) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
        text: 'التوقع متاح',
        icon: Unlock,
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/80 dark:border-slate-700',
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
          label: 'حصل المستخدم على نقاط',
          badgeText: userPred.isGolden
            ? `توقع ذهبي (+${userPred.pointsEarned} نقاط)`
            : `توقع دقيق (+${userPred.pointsEarned} نقاط)`,
          bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80',
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
        bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200 dark:border-amber-800/60',
        canEdit: false,
      };
    }

    if (isLive) {
      return {
        type: 'live' as const,
        label: 'بدأت المباراة',
        badgeText: userPred ? 'بدأت المباراة • لا يمكن التعديل' : 'بدأت المباراة • لم يتم التوقع',
        bg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border-rose-200 dark:border-rose-800/60',
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
        badgeText: 'تم التوقع • يمكنك التعديل قبل الإغلاق',
        bg: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 border-blue-200 dark:border-blue-800/60',
        canEdit: true,
      };
    }

    return {
      type: 'not_predicted' as const,
      label: 'لم يتم التوقع',
      badgeText: 'لم يتم التوقع • سجل توقعك الآن',
      bg: 'bg-amber-50/70 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200/70 dark:border-amber-900/40',
      canEdit: true,
    };
  })();

  const StatusIcon = matchStatusBadge.icon;

  return (
    <div
      id={`prediction-match-${predictionMatch.id}`}
      className={`group relative rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden ${
        isLive
          ? 'border-rose-400 dark:border-rose-800 shadow-sm ring-1 ring-rose-400/20'
          : isCalculated && userPred?.pointsEarned && userPred.pointsEarned > 0
          ? 'border-emerald-400 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-400/20'
          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
      }`}
    >
      {/* 1. Match Header: League, Timing, Status Badge, Points */}
      <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          {m.leagueLogo ? (
            <img
              src={m.leagueLogo}
              alt={m.leagueName}
              className="w-4 h-4 object-contain shrink-0"
              loading="lazy"
            />
          ) : (
            <Trophy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {m.leagueName || 'مباراة دورية'}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${matchStatusBadge.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${matchStatusBadge.dot}`} />
            <StatusIcon className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">{matchStatusBadge.text}</span>
          </span>

          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60 shrink-0 font-mono">
            +{ptsPerMatch} نقاط
          </span>
        </div>
      </div>

      {/* 2. Main Match Arena: Home Team, Score / Mobile Inputs, Away Team */}
      <div className="p-3.5 sm:p-5">
        <div className="grid grid-cols-12 items-center gap-1.5 sm:gap-4">
          
          {/* Home Team */}
          <div className="col-span-4 flex flex-col items-center text-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 p-2 sm:p-2.5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs">
              {m.homeTeam.logo ? (
                <img
                  src={m.homeTeam.logo}
                  alt={m.homeTeam.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight break-words max-w-[95px] sm:max-w-none">
              {m.homeTeam.name}
            </h4>
          </div>

          {/* Center Arena: Official Match Score or User Prediction Score Display or VS */}
          <div className="col-span-4 flex flex-col items-center justify-center min-w-0">
            {isFinished || isLive ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] sm:text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {isLive ? 'النتيجة المباشرة' : 'النتيجة النهائية'}
                </span>
                <div className="flex items-center gap-1.5 sm:gap-3 dir-ltr">
                  <div className="min-w-[2rem] sm:min-w-[3rem] h-9 sm:h-12 rounded-xl bg-slate-900 dark:bg-black text-white font-mono text-xl sm:text-3xl font-black flex items-center justify-center px-1.5 sm:px-2 shadow-inner border border-slate-800">
                    {m.homeScore ?? '-'}
                  </div>
                  <span className="text-sm sm:text-lg font-bold text-slate-400">:</span>
                  <div className="min-w-[2rem] sm:min-w-[3rem] h-9 sm:h-12 rounded-xl bg-slate-900 dark:bg-black text-white font-mono text-xl sm:text-3xl font-black flex items-center justify-center px-1.5 sm:px-2 shadow-inner border border-slate-800">
                    {m.awayScore ?? '-'}
                  </div>
                </div>
              </div>
            ) : userPred ? (
              <button
                type="button"
                onClick={() => isOpen && openModal()}
                disabled={!isOpen}
                className={`flex flex-col items-center gap-1 group/pred transition-transform ${
                  isOpen ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
                }`}
                title={isOpen ? 'اضغط لتعديل التوقع' : 'توقعك المسجل'}
              >
                <span className="text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <span>توقعك</span>
                  {isOpen && <Pencil className="w-2.5 h-2.5 text-blue-500" />}
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2 dir-ltr">
                  <div className="min-w-[2rem] sm:min-w-[2.75rem] h-9 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-700 font-mono text-lg sm:text-2xl font-black flex items-center justify-center px-1.5 shadow-xs">
                    {userPred.homeScore}
                  </div>
                  <span className="text-sm sm:text-base font-black text-blue-400 font-mono">:</span>
                  <div className="min-w-[2rem] sm:min-w-[2.75rem] h-9 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-700 font-mono text-lg sm:text-2xl font-black flex items-center justify-center px-1.5 shadow-xs">
                    {userPred.awayScore}
                  </div>
                </div>
              </button>
            ) : isOpen ? (
              <button
                type="button"
                onClick={openModal}
                className="flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-all shadow-xs cursor-pointer group/btn"
              >
                <Target className="w-4 h-4 text-amber-300 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[10px] sm:text-xs font-black whitespace-nowrap">
                  توقع النتيجة
                </span>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-xs font-black text-slate-400 dark:text-slate-500 shadow-2xs">
                  VS
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 text-center">
                  التوقع مغلق
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="col-span-4 flex flex-col items-center text-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 p-2 sm:p-2.5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs">
              {m.awayTeam.logo ? (
                <img
                  src={m.awayTeam.logo}
                  alt={m.awayTeam.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight break-words max-w-[95px] sm:max-w-none">
              {m.awayTeam.name}
            </h4>
          </div>

        </div>

        {/* 3. Prediction States & Action Section */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Prediction State & Score Display */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {userPred ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-bold">توقعك:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white px-2 py-0.5 rounded bg-white dark:bg-slate-900 shadow-2xs border border-slate-200/60 dark:border-slate-700 dir-ltr">
                    {userPred.homeScore} - {userPred.awayScore}
                  </span>
                </div>

                {/* Explicit Prediction State Badge */}
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${userPredictionState.bg}`}
                >
                  {userPredictionState.type === 'points_earned' && (
                    userPred.isGolden ? <Crown className="w-3 h-3 text-amber-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  )}
                  {userPredictionState.type === 'predicted' && (
                    <Check className="w-3 h-3 text-blue-500" />
                  )}
                  <span>{userPredictionState.badgeText}</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs w-full sm:w-auto">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${userPredictionState.bg}`}
                >
                  {userPredictionState.type === 'not_predicted' && (
                    <Clock className="w-3 h-3 text-amber-500" />
                  )}
                  <span>{userPredictionState.badgeText}</span>
                </span>
                {!userPredictionState.canEdit && (
                  <span className="text-[10px] font-bold text-slate-400">
                    • لا يمكن التعديل
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Modal Trigger or Login */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Open Prediction Modal Button */}
            {isOpen && isLoggedIn && isApprovedParticipant && (
              userPred ? (
                <button
                  type="button"
                  onClick={openModal}
                  className="min-w-[40px] min-h-[40px] p-2 sm:px-3 sm:py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="تعديل التوقع"
                  aria-label="تعديل التوقع"
                >
                  <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">تعديل</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openModal}
                  className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>توقع النتيجة</span>
                </button>
              )
            )}

            {/* Login / Register prompt */}
            {isOpen && (!isLoggedIn || !isApprovedParticipant) && (
              <button
                type="button"
                onClick={!isLoggedIn ? onRequestLogin : onRequestRegister}
                className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
              >
                {!isLoggedIn
                  ? 'سجل دخولك لتسجيل التوقع'
                  : userParticipationStatus === 'pending'
                  ? 'طلبك قيد الاعتماد من الإدارة'
                  : 'طلب الاشتراك في المسابقة'}
              </button>
            )}
          </div>
        </div>

        {/* 4. Prediction Popup Modal (واجهة التوقع المنبثقة) */}
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
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 p-5 sm:p-6"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {userPred ? 'تعديل توقع النتيجة' : 'تسجيل توقع النتيجة'}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {m.leagueName} • {formattedDate}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !isSaving && setIsModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Match Interactive Stepper Arena */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 mb-4">
                  <div className="grid grid-cols-12 items-center gap-2">
                    
                    {/* Home Team */}
                    <div className="col-span-4 flex flex-col items-center text-center gap-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-2.5 flex items-center justify-center shadow-xs">
                        {m.homeTeam.logo ? (
                          <img
                            src={m.homeTeam.logo}
                            alt={m.homeTeam.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Shield className="w-7 h-7 text-slate-400" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {m.homeTeam.name}
                      </span>
                    </div>

                    {/* Steppers */}
                    <div className="col-span-4 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400 mb-2 whitespace-nowrap">النتيجة المتوقعة</span>
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

                        <span className="text-xl font-mono font-bold text-slate-400 mb-3">:</span>

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
                    <div className="col-span-4 flex flex-col items-center text-center gap-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-2.5 flex items-center justify-center shadow-xs">
                        {m.awayTeam.logo ? (
                          <img
                            src={m.awayTeam.logo}
                            alt={m.awayTeam.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Shield className="w-7 h-7 text-slate-400" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {m.awayTeam.name}
                      </span>
                    </div>

                  </div>

                  {/* Prediction Outcome Indicator */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                      {Number(homeScore) > Number(awayScore)
                        ? `توقعك: فوز ${m.homeTeam.name}`
                        : Number(homeScore) < Number(awayScore)
                        ? `توقعك: فوز ${m.awayTeam.name}`
                        : `توقعك: تعادل الفريقين`}
                    </span>
                  </div>
                </div>

                {/* Modal Buttons */}
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

        {/* 4. Expandable Correct Predictors */}
        {isCalculated && predictionMatch.correctPredictorsCount !== undefined && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => setShowWinnersList(!showWinnersList)}
              className="inline-flex items-center gap-1.5 text-[11px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>أصحاب التوقع الصحيح ({predictionMatch.correctPredictorsCount})</span>
              {showWinnersList ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            <AnimatePresence>
              {showWinnersList && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    {predictionMatch.correctPredictors &&
                    predictionMatch.correctPredictors.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {predictionMatch.correctPredictors.map((winner) => (
                          <div
                            key={winner.id}
                            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs"
                          >
                            {winner.isGolden ? (
                              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                            ) : (
                              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            )}
                            <span>{winner.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-center text-slate-500 font-bold">
                        لم يتمكن أي متسابق من توقع النتيجة الصحيحة لهذه المباراة.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { PredictionMatchInfo } from '../../services/predictionService';
import {
  Clock,
  CheckCircle2,
  Lock,
  Sparkles,
  Users,
  AlertCircle,
  Save,
  Loader2,
  Trophy,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Radio,
  Crown,
  Target,
  XCircle,
  ShieldCheck,
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
  if (pts === 1) return '⭐ 1 نقطة للتوقع الصحيح';
  if (pts === 2) return '⭐ 2 نقاط للتوقع الصحيح';
  if (pts >= 3 && pts <= 10) return `⭐ ${pts} نقاط للتوقع الصحيح`;
  return `⭐ ${pts} نقطة للتوقع الصحيح`;
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

  const [homeScore, setHomeScore] = useState<number>(
    userPred ? userPred.homeScore : 0
  );
  const [awayScore, setAwayScore] = useState<number>(
    userPred ? userPred.awayScore : 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showWinnersList, setShowWinnersList] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    userPred ? userPred.remainingEditSeconds || 0 : 60
  );

  useEffect(() => {
    if (!userPred) return;
    if (userPred.canEdit === false) {
      setRemainingSeconds(0);
      return;
    }

    setRemainingSeconds(userPred.remainingEditSeconds || 0);

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userPred?.updatedAt, userPred?.canEdit, userPred?.remainingEditSeconds]);

  const matchDate = new Date(m.matchDate);
  const state = predictionMatch.matchState || (predictionMatch.isOpenForPrediction ? 'open' : 'locked');
  const isOpen = state === 'open';
  const isLive = state === 'live' || m.status === 'LIVE';
  const isPendingAdmin = state === 'pending_admin';
  const isCalculated = state === 'calculated';
  const isFinished = isCalculated || m.status === 'FINISHED';

  // Can the user edit an existing prediction or create a new one?
  const canEditPrediction = isContestActive && isOpen && (!userPred || (userPred.canEdit && remainingSeconds > 0));

  // Has the user modified the score compared to what was saved?
  const isModified = !userPred || userPred.homeScore !== homeScore || userPred.awayScore !== awayScore;

  const handleScoreChange = (team: 'home' | 'away', delta: number) => {
    if (!isContestActive || !isOpen || !isLoggedIn || !isApprovedParticipant) return;
    if (team === 'home') {
      setHomeScore((prev) => Math.max(0, Math.min(20, prev + delta)));
    } else {
      setAwayScore((prev) => Math.max(0, Math.min(20, prev + delta)));
    }
  };

  const handleManualInput = (team: 'home' | 'away', val: string) => {
    if (!isContestActive || !isOpen || !isLoggedIn || !isApprovedParticipant) return;
    const parsed = parseInt(val, 10);
    const safe = isNaN(parsed) ? 0 : Math.max(0, Math.min(20, parsed));
    if (team === 'home') setHomeScore(safe);
    else setAwayScore(safe);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isContestActive) return;
    if (!isLoggedIn) {
      onRequestLogin();
      return;
    }
    if (!isApprovedParticipant) {
      if (onRequestRegister) onRequestRegister();
      return;
    }
    if (!isOpen) return;

    setIsSubmitting(true);
    const success = await onSavePrediction(predictionMatch.id, homeScore, awayScore);
    setIsSubmitting(false);

    if (success) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    }
  };

  // Share match result / outcome
  const handleShareResult = async () => {
    const formattedDate = matchDate.toLocaleDateString('ar-EG', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    
    let shareText = `🏆 نتيجة وتوقعات مباراة: ${m.homeTeam.name} vs ${m.awayTeam.name}\n`;
    shareText += `🏆 البطولة: ${m.leagueName}\n`;
    shareText += `📅 التاريخ: ${formattedDate}\n`;
    if (m.homeScore !== null && m.awayScore !== null) {
      shareText += `⚽ النتيجة النهائية: ${m.homeTeam.name} (${m.homeScore}) - (${m.awayScore}) ${m.awayTeam.name}\n`;
    }
    if (predictionMatch.correctPredictorsCount && predictionMatch.correctPredictorsCount > 0) {
      shareText += `🎯 عدد أصحاب التوقع الصحيح (${formatPointsLabel(ptsPerMatch)}): ${predictionMatch.correctPredictorsCount} متسابق\n`;
    }
    if (userPred) {
      shareText += `🎯 توقعي كان: (${userPred.homeScore} - ${userPred.awayScore}) ${
        userPred.isEvaluated && userPred.pointsEarned > 0 ? `✅ أصبت التوقع (+${userPred.pointsEarned} نقطة)` : ''
      }\n`;
    }
    shareText += `\nشارك وتوقع نتائج المباريات على KoraNews:\n${window.location.origin}/predictions`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `توقعات مباراة ${m.homeTeam.name} vs ${m.awayTeam.name}`,
          text: shareText,
          url: `${window.location.origin}/predictions`,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  // Render Explicit Status Badges
  const renderStatusBadges = () => {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Match State Badge */}
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            المباراة بدأت
          </span>
        ) : isPendingAdmin ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-500" />
            بانتظار اعتماد النتيجة
          </span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-3 h-3 text-slate-500" />
            المباراة انتهت
          </span>
        ) : !isOpen ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Lock className="w-3 h-3 text-slate-400" />
            التوقع مغلق
          </span>
        ) : null}

        {/* User Prediction Outcome Badge */}
        {userPred ? (
          userPred.isEvaluated ? (
            userPred.isGolden ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/60 shadow-2xs">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                ذهبية 👑 (+{userPred.pointsEarned} نقطة)
              </span>
            ) : userPred.pointsEarned > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                توقع صحيح (+{userPred.pointsEarned} نقطة)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                توقع خاطئ
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <Target className="w-3 h-3 text-sky-600" />
              توقعك: ({userPred.homeScore} - {userPred.awayScore})
            </span>
          )
        ) : isOpen && isLoggedIn ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            لم تتوقع
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
        userPred?.isGolden
          ? 'border-amber-400 dark:border-amber-500/70 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-500/5 to-transparent'
          : userPred
          ? 'border-sky-500/40 ring-1 ring-sky-500/20 dark:border-sky-500/30'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
      id={`prediction-card-${predictionMatch.id}`}
    >
      {/* 1. Header: League & Points Reward */}
      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          {m.leagueLogo ? (
            <img loading="lazy" src={m.leagueLogo} alt="" className="w-4 h-4 object-contain shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">
            {m.leagueName}
          </span>
          {predictionMatch.isExternal && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50">
              دوري خاص
            </span>
          )}
        </div>

        {/* Dynamic Points Label based on pointsPerMatch */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{formatPointsLabel(ptsPerMatch)}</span>
        </div>
      </div>

      {/* 2. Statuses & Match Date Time Toolbar */}
      <div className="px-4 pt-3 pb-1 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Match Time */}
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {matchDate.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' • '}
              {matchDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>

          {/* Participants Count */}
          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{predictionMatch.participantsCount} مشارك</span>
          </div>
        </div>

        {/* Status Badges Row */}
        <div className="pt-1">
          {renderStatusBadges()}
        </div>

        {/* Closure Warning if open */}
        {isOpen && (
          <div className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center gap-1 text-center">
            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
            <span>يغلق باب التوقع آلياً قبل دقيقة واحدة من انطلاق المباراة</span>
          </div>
        )}
      </div>

      {/* 3. Teams & Score Center (Mobile First) */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-7 items-center gap-2 sm:gap-4">
          {/* Home Team */}
          <div className="col-span-3 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 p-2 flex items-center justify-center border border-slate-100 dark:border-slate-700/80 shadow-2xs">
              {m.homeTeam.logo ? (
                <img
                  src={m.homeTeam.logo}
                  alt={m.homeTeam.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="font-black text-sm text-slate-400">
                  {m.homeTeam.name.substring(0, 2)}
                </span>
              )}
            </div>
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
              {m.homeTeam.name}
            </span>
          </div>

          {/* Center: Score Display or VS */}
          <div className="col-span-1 flex flex-col items-center justify-center gap-1">
            {isFinished || isLive || isPendingAdmin ? (
              <div className="flex flex-col items-center">
                <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono tracking-wider">
                  {m.homeScore ?? 0} - {m.awayScore ?? 0}
                </div>
                <span className="text-[9px] font-extrabold text-slate-400 mt-1 whitespace-nowrap">
                  {isLive ? 'النتيجة المباشرة' : 'النتيجة النهائية'}
                </span>
              </div>
            ) : (
              <div className="text-slate-300 dark:text-slate-600 font-black text-sm sm:text-lg">
                VS
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="col-span-3 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 p-2 flex items-center justify-center border border-slate-100 dark:border-slate-700/80 shadow-2xs">
              {m.awayTeam.logo ? (
                <img
                  src={m.awayTeam.logo}
                  alt={m.awayTeam.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="font-black text-sm text-slate-400">
                  {m.awayTeam.name.substring(0, 2)}
                </span>
              )}
            </div>
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
              {m.awayTeam.name}
            </span>
          </div>
        </div>

        {/* 4. Interactive Score Stepper (When Match Open) */}
        {isOpen && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {/* Registration check alert */}
            {isLoggedIn && !isApprovedParticipant && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {userParticipationStatus === 'pending'
                      ? 'طلب اشتراكك في المسابقة قيد مراجعة الإدارة.'
                      : 'يلزم تأكيد اشتراكك في المسابقة أولاً لتسجيل التوقعات.'}
                  </span>
                </div>
                {userParticipationStatus !== 'pending' && (
                  <button
                    type="button"
                    onClick={onRequestRegister}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 transition-colors cursor-pointer"
                  >
                    طلب الاشتراك
                  </button>
                )}
              </div>
            )}

            <div className="text-center mb-3">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                {userPred
                  ? canEditPrediction
                    ? `توقعك المسجل (متاح التعديل لمدة ${remainingSeconds} ثانية):`
                    : 'توقعك النهائي (انتهت مهلة التعديل 1 دقيقة):'
                  : 'حدد توقعك للنتيجة النهائية:'}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-4 sm:gap-6 dir-ltr">
                {/* Home Team Score Stepper */}
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleScoreChange('home', -1)}
                    disabled={homeScore <= 0 || !isLoggedIn || !isApprovedParticipant || !canEditPrediction}
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs cursor-pointer"
                    aria-label="إنقاص أهداف المضيف"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={homeScore}
                    onChange={(e) => handleManualInput('home', e.target.value)}
                    disabled={!isLoggedIn || !isApprovedParticipant || !canEditPrediction}
                    className="w-12 text-center font-black text-xl text-slate-900 dark:text-white bg-transparent border-none focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleScoreChange('home', 1)}
                    disabled={homeScore >= 20 || !isLoggedIn || !isApprovedParticipant || !canEditPrediction}
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs cursor-pointer"
                    aria-label="زيادة أهداف المضيف"
                  >
                    +
                  </button>
                </div>

                <span className="font-black text-xl text-slate-400">:</span>

                {/* Away Team Score Stepper */}
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleScoreChange('away', -1)}
                    disabled={awayScore <= 0 || !isLoggedIn || !isApprovedParticipant || !canEditPrediction}
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs cursor-pointer"
                    aria-label="إنقاص أهداف الضيف"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={awayScore}
                    onChange={(e) => handleManualInput('away', e.target.value)}
                    disabled={!isLoggedIn || !isApprovedParticipant || !canEditPrediction}
                    className="w-12 text-center font-black text-xl text-slate-900 dark:text-white bg-transparent border-none focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleScoreChange('away', 1)}
                    disabled={awayScore >= 20 || !isLoggedIn || !isApprovedParticipant || !canEditPrediction}
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs cursor-pointer"
                    aria-label="زيادة أهداف الضيف"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="w-full sm:w-auto mt-2">
                {!isLoggedIn ? (
                  <button
                    type="button"
                    onClick={onRequestLogin}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 text-white font-black text-xs sm:text-sm hover:bg-sky-700 transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    سجل دخولك لتوقع النتيجة
                  </button>
                ) : !isApprovedParticipant ? (
                  <button
                    type="button"
                    onClick={onRequestRegister}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 text-white font-black text-xs sm:text-sm hover:bg-amber-700 transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    تقديم طلب اشتراك في المسابقة
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || (!isModified && !!userPred) || !canEditPrediction}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 ${
                      justSaved
                        ? 'bg-emerald-600 text-white cursor-pointer'
                        : canEditPrediction && (isModified || !userPred)
                        ? 'bg-sky-600 text-white hover:bg-sky-700 cursor-pointer'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : justSaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم حفظ التوقع بنجاح!</span>
                      </>
                    ) : userPred ? (
                      canEditPrediction ? (
                        isModified ? (
                          <>
                            <Save className="w-4 h-4" />
                            <span>تحديث التوقع ({remainingSeconds} ثانية متبقية)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>تم حفظ توقعك ({userPred.homeScore} - {userPred.awayScore})</span>
                          </>
                        )
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>تم القفل ({userPred.homeScore} - {userPred.awayScore})</span>
                        </>
                      )
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>حفظ التوقع ({formatPointsLabel(ptsPerMatch)})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Golden Predictor Card (ONLY shown when Backend returns goldenPredictor or user isGolden) */}
        {isCalculated && predictionMatch.goldenPredictor && (
          <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/10 border-2 border-amber-400/80 dark:border-amber-500/60 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Crown className="w-6 h-6 text-amber-500 shrink-0 animate-bounce" />
              <div>
                <div className="font-black text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <span>👑 صاحب التوقع الذهبي (+1 نقطة إضافية):</span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  انفرد المتسابق <span className="font-black text-amber-600 dark:text-amber-400">{predictionMatch.goldenPredictor.name}</span> بالتوقع الصحيح الوحيد!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Closed, Live, Pending, or Finished Match Details */}
        {!isOpen && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            {/* User prediction summary if logged in */}
            {userPred ? (
              <div className="flex items-center justify-between text-xs bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500">توقعك المسجل:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                    {userPred.homeScore} - {userPred.awayScore}
                  </span>
                </div>

                <div>
                  {isCalculated ? (
                    userPred.isGolden ? (
                      <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Crown className="w-4 h-4 text-amber-500" />
                        توقع ذهبي 👑 (+{userPred.pointsEarned} نقطة)
                      </span>
                    ) : userPred.pointsEarned > 0 ? (
                      <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        توقع صحيح (+{userPred.pointsEarned} نقطة)
                      </span>
                    ) : (
                      <span className="font-extrabold text-slate-400 flex items-center gap-1">
                        توقع خاطئ (0 نقطة)
                      </span>
                    )
                  ) : isPendingAdmin ? (
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      بانتظار النتيجة
                    </span>
                  ) : isLive ? (
                    <span className="font-bold text-rose-500 flex items-center gap-1 animate-pulse">
                      <Radio className="w-3.5 h-3.5" />
                      المباراة بدأت
                    </span>
                  ) : (
                    <span className="font-bold text-slate-400">التوقع مغلق</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-1 text-xs text-slate-400 font-bold">
                {isCalculated
                  ? 'لم تشارك بتوقع لهذه المباراة.'
                  : 'أغلقت التوقعات لهذه المباراة مع بداية انطلاقها.'}
              </div>
            )}

            {/* 6. Winners list & Share button */}
            <div className="flex items-center justify-between pt-1 gap-2">
              {isCalculated && predictionMatch.correctPredictorsCount !== undefined ? (
                <button
                  type="button"
                  onClick={() => setShowWinnersList(!showWinnersList)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-black text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    أصحاب التوقع الصحيح ({predictionMatch.correctPredictorsCount})
                  </span>
                  {showWinnersList ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <div />
              )}

              {(isCalculated || isFinished || isLive) && (
                <button
                  type="button"
                  onClick={handleShareResult}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  title="مشاركة نتيجة وتوقعات المباراة"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>مشاركة النتيجة</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Expandable Correct Predictors Drawer */}
            <AnimatePresence>
              {showWinnersList && isCalculated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-2"
                >
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                    <div className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>الفائزون بنقاط المباراة ({formatPointsLabel(ptsPerMatch)}):</span>
                      <span>{predictionMatch.correctPredictorsCount} متسابق</span>
                    </div>

                    {predictionMatch.correctPredictors && predictionMatch.correctPredictors.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                        {predictionMatch.correctPredictors.map((winner) => (
                          <div
                            key={winner.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/60 shadow-2xs text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                              {winner.avatar ? (
                                <img loading="lazy" src={winner.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                winner.name.charAt(0)
                              )}
                            </div>
                            <span>{winner.name}</span>
                            {winner.isGolden && (
                              <span className="text-amber-500 text-[10px]" title="توقع ذهبي">👑</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-bold py-1 text-center">
                        لا يوجد متسابقين توقعوا هذه النتيجة بدقة.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}


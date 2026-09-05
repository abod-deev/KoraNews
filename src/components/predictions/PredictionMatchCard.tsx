import React, { useState, useEffect } from 'react';
import { PredictionMatchInfo } from '../../services/predictionService';
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
  Share2,
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
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showWinnersList, setShowWinnersList] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (userPred) {
      setHomeScore(userPred.homeScore);
      setAwayScore(userPred.awayScore);
    }
  }, [userPred]);

  const isPendingAdmin = m.status === 'FINISHED' && predictionMatch.pointsPerMatch === undefined;
  const isCalculated = m.status === 'FINISHED' && predictionMatch.pointsPerMatch !== undefined;
  const isFinished = m.status === 'FINISHED' || predictionMatch.matchState === 'calculated';
  const isLive = m.status === 'LIVE' || predictionMatch.matchState === 'live';
  const isOpen =
    m.status === 'PENDING' &&
    isContestActive &&
    (predictionMatch.isOpenForPrediction || predictionMatch.matchState === 'open') &&
    (userPred ? userPred.canEdit !== false : true);

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
        setTimeout(() => setJustSaved(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareResult = async () => {
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);

    const shareTitle = `توقع مباراة ${m.homeTeam.name} ضد ${m.awayTeam.name}`;
    const shareText = userPred
      ? `توقعي لمباراة ${m.homeTeam.name} و ${m.awayTeam.name}: (${userPred.homeScore} - ${userPred.awayScore}) على منصة توقعات KoraNews!`
      : `شارك في توقع مباراة ${m.homeTeam.name} ضد ${m.awayTeam.name} على منصة توقعات KoraNews!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
      } catch {}
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      } catch {}
    }
  };

  // Status badge config
  const statusBadge = (() => {
    if (isLive) {
      return {
        bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900',
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
        bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        dot: 'bg-amber-500',
        text: 'بانتظار الاعتماد',
        icon: Clock,
      };
    }
    if (isOpen) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        dot: 'bg-emerald-500',
        text: 'التوقع متاح',
        icon: Unlock,
      };
    }
    return {
      bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      dot: 'bg-gray-400',
      text: 'مغلقة',
      icon: Lock,
    };
  })();

  const StatusIcon = statusBadge.icon;

  return (
    <div
      id={`prediction-match-${predictionMatch.id}`}
      className={`group relative rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden ${
        isLive
          ? 'border-rose-400 dark:border-rose-800 shadow-sm'
          : isCalculated && userPred?.pointsEarned && userPred.pointsEarned > 0
          ? 'border-emerald-400 dark:border-emerald-800 shadow-sm'
          : 'border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
      }`}
    >
      {/* 1. Match Header: League, Timing, Status Badge */}
      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
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
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
            {m.leagueName || 'مباراة دورية'}
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
            <StatusIcon className="w-3 h-3" />
            <span>{statusBadge.text}</span>
          </span>

          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
            +{ptsPerMatch} نقاط
          </span>
        </div>
      </div>

      {/* 2. Main Match Arena: Teams & Central Predictor / Result */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
          {/* Home Team */}
          <div className="col-span-4 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 p-2 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              {m.homeTeam.logo ? (
                <img
                  src={m.homeTeam.logo}
                  alt={m.homeTeam.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <Shield className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
              {m.homeTeam.name}
            </h4>
          </div>

          {/* Center Arena: Prediction Input or Official Score */}
          <div className="col-span-4 flex flex-col items-center justify-center">
            {isFinished || isLive ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {isLive ? 'النتيجة المباشرة' : 'النتيجة النهائية'}
                </span>
                <div className="flex items-center gap-2 sm:gap-3 dir-ltr">
                  <div className="min-w-[2.5rem] sm:min-w-[3rem] h-11 sm:h-13 rounded-xl bg-slate-900 dark:bg-black text-white font-mono text-2xl sm:text-3xl font-black flex items-center justify-center px-2 shadow-inner border border-slate-800">
                    {m.homeScore ?? '-'}
                  </div>
                  <span className="text-base sm:text-lg font-bold text-slate-400">:</span>
                  <div className="min-w-[2.5rem] sm:min-w-[3rem] h-11 sm:h-13 rounded-xl bg-slate-900 dark:bg-black text-white font-mono text-2xl sm:text-3xl font-black flex items-center justify-center px-2 shadow-inner border border-slate-800">
                    {m.awayScore ?? '-'}
                  </div>
                </div>
              </div>
            ) : isOpen && isLoggedIn && isApprovedParticipant ? (
              <div className="flex flex-col items-center w-full">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  ضع توقعك للنتيجة
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2.5 dir-ltr">
                  {/* Home Score Stepper */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustScore('home', 1)}
                      className="w-8 h-6 sm:w-10 sm:h-7 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title="زيادة هدف"
                      aria-label="زيادة أهداف الفريق الأول"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={homeScore}
                      onChange={(e) => handleScoreChange('home', e.target.value)}
                      className="w-10 sm:w-12 h-11 sm:h-12 text-center text-xl sm:text-2xl font-black font-mono bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900 dark:text-white transition-all"
                      aria-label="أهداف الفريق الأول"
                    />
                    <button
                      type="button"
                      onClick={() => adjustScore('home', -1)}
                      className="w-8 h-6 sm:w-10 sm:h-7 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title="إنقاص هدف"
                      aria-label="إنقاص أهداف الفريق الأول"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-lg font-bold text-slate-300 dark:text-slate-600 mb-5">-</span>

                  {/* Away Score Stepper */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustScore('away', 1)}
                      className="w-8 h-6 sm:w-10 sm:h-7 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title="زيادة هدف"
                      aria-label="زيادة أهداف الفريق الثاني"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={awayScore}
                      onChange={(e) => handleScoreChange('away', e.target.value)}
                      className="w-10 sm:w-12 h-11 sm:h-12 text-center text-xl sm:text-2xl font-black font-mono bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900 dark:text-white transition-all"
                      aria-label="أهداف الفريق الثاني"
                    />
                    <button
                      type="button"
                      onClick={() => adjustScore('away', -1)}
                      className="w-8 h-6 sm:w-10 sm:h-7 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title="إنقاص هدف"
                      aria-label="إنقاص أهداف الفريق الثاني"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 dark:text-slate-500">
                  VS
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {isOpen ? 'سجل دخولك' : 'التوقع مغلق'}
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="col-span-4 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 p-2 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              {m.awayTeam.logo ? (
                <img
                  src={m.awayTeam.logo}
                  alt={m.awayTeam.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <Shield className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
              {m.awayTeam.name}
            </h4>
          </div>
        </div>

        {/* 3. Prediction Status & Action Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* User's existing prediction summary pill */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {userPred ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-brand" />
                  <span className="text-slate-500 dark:text-slate-400 font-bold">توقعك:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 shadow-2xs border border-slate-200/60 dark:border-slate-700">
                    {userPred.homeScore} - {userPred.awayScore}
                  </span>
                </div>

                {/* Status of user's prediction */}
                {isCalculated ? (
                  userPred.isGolden ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>توقع ذهبي (+{userPred.pointsEarned})</span>
                    </span>
                  ) : userPred.pointsEarned > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>صحيح (+{userPred.pointsEarned})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>غير دقيق (0)</span>
                    </span>
                  )
                ) : isPendingAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Clock className="w-3 h-3" /> بانتظار الاحتساب
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3" /> تم الحفظ
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] font-bold text-slate-400">
                {isFinished
                  ? 'لم تشارك بتوقع لهذه المباراة'
                  : isOpen
                  ? 'لم تحفظ توقعك بعد'
                  : 'أغلقت إمكانية التوقع'}
              </span>
            )}
          </div>

          {/* Action buttons (Save, Share, Login) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Share button for finished/live/predicted matches */}
            {(isCalculated || isFinished || isLive || userPred) && (
              <button
                type="button"
                onClick={handleShareResult}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                title="مشاركة التوقع"
                aria-label="مشاركة التوقع"
              >
                {copiedShare ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Save prediction button */}
            {isOpen && isLoggedIn && isApprovedParticipant && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || homeScore === '' || awayScore === ''}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  justSaved
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isSaving || homeScore === '' || awayScore === ''
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-brand text-white hover:bg-emerald-600 active:scale-95 shadow-xs'
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
                    <span>{userPred ? 'تحديث التوقع' : 'تأكيد التوقع'}</span>
                  </>
                )}
              </button>
            )}

            {/* Login / Register prompt */}
            {isOpen && (!isLoggedIn || !isApprovedParticipant) && (
              <button
                type="button"
                onClick={!isLoggedIn ? onRequestLogin : onRequestRegister}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
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

        {/* 4. Expandable Correct Predictors */}
        {isCalculated && predictionMatch.correctPredictorsCount !== undefined && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => setShowWinnersList(!showWinnersList)}
              className="inline-flex items-center gap-1.5 text-[11px] font-black text-brand hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
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

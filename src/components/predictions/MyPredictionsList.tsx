import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Crown,
  Target,
  Radio,
  Trophy,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';

export interface MyPredictionItem {
  id: number;
  predictionMatchId: number;
  homeScore: number;
  awayScore: number;
  pointsEarned: number;
  isEvaluated: boolean;
  isGolden?: boolean;
  goldenPoints?: number;
  createdAt: string;
  updatedAt: string;
  displayStatus: 'upcoming' | 'predicted' | 'live' | 'finished_correct' | 'finished_wrong';
  match: {
    id: string;
    leagueName: string;
    leagueLogo?: string;
    homeTeam: {
      name: string;
      logo: string;
    };
    awayTeam: {
      name: string;
      logo: string;
    };
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    matchTime: string;
    matchDate: string;
    isOpenForPrediction: boolean;
  } | null;
}

interface MyPredictionsListProps {
  predictions: MyPredictionItem[];
  isLoading: boolean;
  onGoToActive: () => void;
}

export default function MyPredictionsList({
  predictions,
  isLoading,
  onGoToActive,
}: MyPredictionsListProps) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'golden' | 'pending'>('all');

  const filteredList = predictions.filter((item) => {
    if (filter === 'correct') return item.isEvaluated && item.pointsEarned > 0;
    if (filter === 'wrong') return item.isEvaluated && item.pointsEarned === 0;
    if (filter === 'golden') return !!item.isGolden;
    if (filter === 'pending') return !item.isEvaluated;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-28 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-200/80 dark:border-slate-800"
          />
        ))}
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3.5 border border-amber-500/20">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
          لم تسجل أي توقعات حتى الآن
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          اختر من المباريات المتاحة للتوقع الآن، وسجل توقعك الدقيق لتكسب النقاط وتنافس على لوحة الشرف!
        </p>
        <button
          type="button"
          onClick={onGoToActive}
          className="mt-5 px-6 py-2.5 bg-brand hover:bg-emerald-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <span>تصفح المباريات المتاحة</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    );
  }

  const goldenCount = predictions.filter((p) => p.isGolden).length;
  const correctCount = predictions.filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
  const wrongCount = predictions.filter((p) => p.isEvaluated && p.pointsEarned === 0).length;
  const pendingCount = predictions.filter((p) => !p.isEvaluated).length;

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'all', label: `الكل (${predictions.length})` },
          { id: 'correct', label: `صحيحة (${correctCount})` },
          { id: 'wrong', label: `غير دقيقة (${wrongCount})` },
          ...(goldenCount > 0 ? [{ id: 'golden', label: `توقعات ذهبية 👑 (${goldenCount})` }] : []),
          { id: 'pending', label: `قيد الانتظار (${pendingCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filter === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Predictions Cards List */}
      <div className="space-y-3">
        {filteredList.map((item) => {
          const m = item.match;
          if (!m) return null;

          const matchDate = new Date(m.matchDate);
          const isGolden = !!item.isGolden;
          const isCorrect = item.isEvaluated && item.pointsEarned > 0;
          const isWrong = item.isEvaluated && item.pointsEarned === 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl bg-white dark:bg-slate-900 border p-4 sm:p-5 shadow-xs transition-all ${
                isGolden
                  ? 'border-amber-400/80 dark:border-amber-500/80 bg-gradient-to-r from-amber-50/20 via-transparent to-transparent dark:from-amber-950/10'
                  : isCorrect
                  ? 'border-emerald-300 dark:border-emerald-800/80'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Header: League and Date */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5 mb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <Trophy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{m.leagueName}</span>
                </div>
                <span className="shrink-0 text-slate-400">
                  {matchDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} •{' '}
                  {matchDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>

              {/* Match Score & Teams */}
              <div className="grid grid-cols-12 items-center gap-2">
                {/* Home Team */}
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 dark:bg-slate-800 p-1 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                    {m.homeTeam.logo ? (
                      <img
                        src={m.homeTeam.logo}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <Shield className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {m.homeTeam.name}
                  </span>
                </div>

                {/* Center comparison */}
                <div className="col-span-4 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5 font-mono dir-ltr">
                    <span className="text-[10px] font-bold text-slate-400">توقعك:</span>
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                      {item.homeScore} - {item.awayScore}
                    </span>
                  </div>

                  {item.isEvaluated && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-1 dir-ltr">
                      <span className="text-[10px] font-bold text-slate-400">الرسمية:</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        {m.homeScore ?? 0} - {m.awayScore ?? 0}
                      </span>
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="col-span-4 flex items-center justify-end gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate text-left">
                    {m.awayTeam.name}
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 dark:bg-slate-800 p-1 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                    {m.awayTeam.logo ? (
                      <img
                        src={m.awayTeam.logo}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <Shield className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                </div>
              </div>

              {/* Status Outcome Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-slate-400 font-medium text-[11px]">
                  سُجّل: {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                </span>

                <div>
                  {isGolden ? (
                    <span className="inline-flex items-center gap-1.5 font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 px-3 py-1 rounded-full text-xs">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>توقع ذهبي (+{item.pointsEarned} نقاط)</span>
                    </span>
                  ) : isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 px-3 py-1 rounded-full text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>توقع صحيح (+{item.pointsEarned} نقاط)</span>
                    </span>
                  ) : isWrong ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs">
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>توقع غير دقيق (0 نقطة)</span>
                    </span>
                  ) : m.status === 'LIVE' ? (
                    <span className="inline-flex items-center gap-1.5 font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/60 px-3 py-1 rounded-full text-xs animate-pulse">
                      <Radio className="w-3.5 h-3.5 text-rose-500" />
                      <span>المباراة جارية</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-3 py-1 rounded-full text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>بانتظار النتيجة</span>
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

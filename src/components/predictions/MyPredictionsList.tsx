import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, Sparkles, AlertCircle, Crown, ShieldCheck, Target, Radio } from 'lucide-react';
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
            className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-3xl animate-pulse border border-slate-200/60 dark:border-slate-800"
          />
        ))}
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">لم تقم بتسجيل أي توقع بعد</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          اختر من المباريات المتاحة الآن وسجل توقعك الدقيق لتحصل على نقاط المباريات عند التوقع الصحيح!
        </p>
        <button
          onClick={onGoToActive}
          className="mt-5 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer"
        >
          استعراض المباريات المتاحة
        </button>
      </div>
    );
  }

  const goldenCount = predictions.filter((p) => p.isGolden).length;

  return (
    <div className="space-y-4">
      {/* Filters Bar (Mobile First Scrollable Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'all', label: `الكل (${predictions.length})` },
          {
            id: 'correct',
            label: `توقعات صحيحة (${predictions.filter((p) => p.isEvaluated && p.pointsEarned > 0).length})`,
          },
          {
            id: 'wrong',
            label: `توقعات خاطئة (${predictions.filter((p) => p.isEvaluated && p.pointsEarned === 0).length})`,
          },
          ...(goldenCount > 0
            ? [{ id: 'golden', label: `ذهبية 👑 (${goldenCount})` }]
            : []),
          {
            id: 'pending',
            label: `قيد الانتظار (${predictions.filter((p) => !p.isEvaluated).length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-2xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filter === tab.id
                ? 'bg-slate-900 text-white dark:bg-sky-600 dark:text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Predictions Cards Grid */}
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-slate-900 rounded-3xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all ${
                isGolden
                  ? 'border-amber-400 dark:border-amber-500/80 ring-2 ring-amber-400/20 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Card Header: League and Match Time */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5 mb-3 text-[11px] font-bold text-slate-400">
                <span className="truncate">{m.leagueName}</span>
                <span className="shrink-0">
                  {matchDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} •{' '}
                  {matchDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>

              {/* Match Score Display */}
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Home Team */}
                <div className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <img loading="lazy"
                    src={m.homeTeam.logo}
                    alt=""
                    className="w-5 h-5 sm:w-7 sm:h-7 object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-[11px] sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {m.homeTeam.name}
                  </span>
                </div>

                {/* Scores & Comparison */}
                <div className="shrink-0 flex flex-col items-center justify-center px-1">
                  <div className="flex items-center gap-1 sm:gap-1.5 font-mono">
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400">توقعك:</span>
                    <span className="font-black text-[11px] sm:text-sm text-slate-900 dark:text-white px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                      {item.homeScore} - {item.awayScore}
                    </span>
                  </div>

                  {item.isEvaluated && (
                    <div className="flex items-center gap-1 sm:gap-1.5 font-mono mt-1">
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400">النتيجة:</span>
                      <span className="font-extrabold text-[11px] sm:text-xs text-slate-700 dark:text-slate-300">
                        {m.homeScore ?? 0} - {m.awayScore ?? 0}
                      </span>
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-[11px] sm:text-sm font-black text-slate-900 dark:text-white truncate text-left">
                    {m.awayTeam.name}
                  </span>
                  <img loading="lazy"
                    src={m.awayTeam.logo}
                    alt=""
                    className="w-5 h-5 sm:w-7 sm:h-7 object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Status Outcome Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-slate-400 font-bold text-[11px]">
                  تاريخ التوقع: {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                </span>

                <div>
                  {isGolden ? (
                    <span className="inline-flex items-center gap-1 font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-400/60 px-3 py-1 rounded-full text-xs">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      توقع ذهبي 👑 (+{item.pointsEarned} نقطة)
                    </span>
                  ) : isCorrect ? (
                    <span className="inline-flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      توقع صحيح (+{item.pointsEarned} نقطة)
                    </span>
                  ) : isWrong ? (
                    <span className="inline-flex items-center gap-1 font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs">
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      توقع خاطئ (0 نقطة)
                    </span>
                  ) : m.status === 'LIVE' ? (
                    <span className="inline-flex items-center gap-1 font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-xs animate-pulse">
                      <Radio className="w-3.5 h-3.5 text-rose-500" />
                      المباراة بدأت
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      بانتظار نتيجة المباراة
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


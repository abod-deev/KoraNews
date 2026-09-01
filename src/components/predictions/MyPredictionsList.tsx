import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, Sparkles, Filter, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export interface MyPredictionItem {
  id: number;
  predictionMatchId: number;
  homeScore: number;
  awayScore: number;
  pointsEarned: number;
  isEvaluated: boolean;
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
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'pending'>('all');

  const filteredList = predictions.filter((item) => {
    if (filter === 'correct') return item.isEvaluated && item.pointsEarned === 2;
    if (filter === 'wrong') return item.isEvaluated && item.pointsEarned === 0;
    if (filter === 'pending') return !item.isEvaluated;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-28 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse border border-gray-200/60 dark:border-gray-800"
          />
        ))}
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-white">لم تقم بتسجيل أي توقع بعد</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
          اختر من المباريات المتاحة الآن وسجل توقعك الدقيق لتحصل على نقطتين عن كل نتيجة صحيحة!
        </p>
        <button
          onClick={onGoToActive}
          className="mt-5 px-6 py-2.5 bg-brand text-white font-black text-xs sm:text-sm rounded-xl hover:bg-emerald-600 shadow-xs transition-all cursor-pointer"
        >
          استعراض المباريات المتاحة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'all', label: `الكل (${predictions.length})` },
          {
            id: 'correct',
            label: `صحيحة (${predictions.filter((p) => p.isEvaluated && p.pointsEarned === 2).length})`,
          },
          {
            id: 'wrong',
            label: `خاطئة (${predictions.filter((p) => p.isEvaluated && p.pointsEarned === 0).length})`,
          },
          {
            id: 'pending',
            label: `قيد الانتظار (${predictions.filter((p) => !p.isEvaluated).length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filter === tab.id
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
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
          const isCorrect = item.isEvaluated && item.pointsEarned === 2;
          const isWrong = item.isEvaluated && item.pointsEarned === 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-2.5 mb-3 text-[11px] font-bold text-gray-400">
                <span className="truncate">{m.leagueName}</span>
                <span>
                  {matchDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} •{' '}
                  {matchDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>

              <div className="grid grid-cols-7 items-center gap-2">
                {/* Home Team */}
                <div className="col-span-2 sm:col-span-2 flex items-center gap-2">
                  <img
                    src={m.homeTeam.logo}
                    alt=""
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                    {m.homeTeam.name}
                  </span>
                </div>

                {/* Scores & Comparison */}
                <div className="col-span-3 sm:col-span-3 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] font-bold text-gray-400">توقعك:</span>
                    <span className="font-black text-sm sm:text-base text-gray-900 dark:text-white px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                      {item.homeScore} - {item.awayScore}
                    </span>
                  </div>

                  {item.isEvaluated && (
                    <div className="flex items-center gap-2 font-mono mt-1">
                      <span className="text-[10px] font-bold text-gray-400">النتيجة:</span>
                      <span className="font-extrabold text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {m.homeScore ?? 0} - {m.awayScore ?? 0}
                      </span>
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-2">
                  <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate text-left">
                    {m.awayTeam.name}
                  </span>
                  <img
                    src={m.awayTeam.logo}
                    alt=""
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Status Outcome Footer */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold text-[11px]">
                  سُجل في {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                </span>

                <div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      +2 نقطة (توقع دقيق)
                    </span>
                  ) : isWrong ? (
                    <span className="inline-flex items-center gap-1 font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-xl">
                      <XCircle className="w-3.5 h-3.5" />
                      0 نقطة (توقع خاطئ)
                    </span>
                  ) : m.status === 'LIVE' ? (
                    <span className="inline-flex items-center gap-1 font-black text-red-500 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-xl animate-pulse">
                      المباراة جارية الآن
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl">
                      <Clock className="w-3.5 h-3.5" />
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

import React, { useState } from 'react';
import {
  Trophy,
  Crown,
  Search,
  X,
  Sparkles,
  Medal,
  Target,
  User as UserIcon,
} from 'lucide-react';

export interface LeaderboardUser {
  id: number;
  rank: number;
  name: string;
  avatar: string | null;
  role: string;
  totalPoints: number;
  correctPredictions: number;
  goldenPredictions: number;
  totalPredictions: number;
  successRate: number;
  isCurrentUser: boolean;
}

interface PredictionsLeaderboardProps {
  leaderboard: LeaderboardUser[];
  currentUserRank: LeaderboardUser | null;
  isLoading: boolean;
}

export default function PredictionsLeaderboard({
  leaderboard,
  currentUserRank,
  isLoading,
}: PredictionsLeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = leaderboard.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const top1 = filtered.find((u) => u.rank === 1);
  const top2 = filtered.find((u) => u.rank === 2);
  const top3 = filtered.find((u) => u.rank === 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full overflow-hidden">
      {/* Search Header & Current User Rank Indicator */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن متسابق بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {currentUserRank && currentUserRank.rank > 0 && !searchQuery && (
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
            <span className="text-slate-400 font-medium">ترتيبك الحالي:</span>
            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 rounded-lg font-black text-xs border border-blue-200/60 dark:border-blue-800/40">
              #{currentUserRank.rank}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-black text-slate-900 dark:text-white font-mono">
              {currentUserRank.totalPoints} <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        /* Loading Skeleton */
        <div className="space-y-4 animate-pulse">
          {/* Top 3 Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>

          {/* Rows Skeletons */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="h-5 w-14 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
            {searchQuery ? 'لا يوجد متسابق يطابق هذا البحث' : 'لا يوجد متسابقون مسجلون حتى الآن'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'جرّب كتابة الاسم بشكل مختلف أو مسح البحث لعرض القائمة كاملة.'
              : 'سيتم ظهور المتسابقين وترتيبهم هنا فور تسجيل توقعات المباريات.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3: Professional Sports Podium (Formal, Premium, Non-gamey) */}
          {!searchQuery && filtered.length >= 3 && top1 && top2 && top3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
              
              {/* المركز الثاني (Silver / الوصيف) */}
              <div className="order-2 sm:order-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col items-center justify-between text-center relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    المركز الثاني
                  </span>
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-black text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    2
                  </span>
                </div>

                <div className="my-2 flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border-2 border-slate-300 dark:border-slate-600 overflow-hidden shadow-2xs mb-2.5">
                    {top2.avatar ? (
                      <img
                        src={top2.avatar}
                        alt={top2.name}
                        className="w-full h-full rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-slate-600 dark:text-slate-300 text-lg">
                        {top2.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate max-w-[170px]">
                    {top2.name}
                  </h4>
                  {top2.isCurrentUser && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                      أنت
                    </span>
                  )}
                </div>

                <div className="w-full mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    النقاط:{' '}
                    <strong className="text-sm font-black text-slate-900 dark:text-white font-mono mr-1">
                      {top2.totalPoints}
                    </strong>
                  </span>
                </div>
              </div>

              {/* المركز الأول (Gold / المتصدر - أكثر بروزاً قليلاً) */}
              <div className="order-1 sm:order-2 rounded-2xl bg-gradient-to-b from-amber-500/5 to-transparent dark:from-amber-500/10 dark:to-transparent bg-white dark:bg-slate-900 border-2 border-amber-400/80 dark:border-amber-500/80 p-5 sm:p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden transition-all">
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-black text-amber-700 dark:text-amber-400">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    المركز الأول
                  </span>
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                    1
                  </span>
                </div>

                <div className="my-2 flex flex-col items-center">
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-amber-50 dark:bg-amber-950/40 p-1 border-2 border-amber-400 dark:border-amber-500 overflow-hidden shadow-sm mb-2.5">
                    {top1.avatar ? (
                      <img
                        src={top1.avatar}
                        alt={top1.name}
                        className="w-full h-full rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center font-black text-amber-700 dark:text-amber-300 text-2xl">
                        {top1.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white truncate max-w-[190px]">
                    {top1.name}
                  </h4>
                  {top1.isCurrentUser && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                      أنت
                    </span>
                  )}
                </div>

                <div className="w-full mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    النقاط:{' '}
                    <strong className="text-base font-black text-amber-700 dark:text-amber-300 font-mono mr-1">
                      {top1.totalPoints}
                    </strong>
                  </span>
                </div>
              </div>

              {/* المركز الثالث (Bronze) */}
              <div className="order-3 sm:order-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col items-center justify-between text-center relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-500">
                    <span className="w-2 h-2 rounded-full bg-amber-700" />
                    المركز الثالث
                  </span>
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-800 dark:text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-800/30">
                    3
                  </span>
                </div>

                <div className="my-2 flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-amber-900/10 dark:bg-amber-950/30 p-0.5 border-2 border-amber-700/60 dark:border-amber-700/60 overflow-hidden shadow-2xs mb-2.5">
                    {top3.avatar ? (
                      <img
                        src={top3.avatar}
                        alt={top3.name}
                        className="w-full h-full rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-100/50 dark:bg-amber-900/20 flex items-center justify-center font-black text-amber-800 dark:text-amber-500 text-lg">
                        {top3.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate max-w-[170px]">
                    {top3.name}
                  </h4>
                  {top3.isCurrentUser && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                      أنت
                    </span>
                  )}
                </div>

                <div className="w-full mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    النقاط:{' '}
                    <strong className="text-sm font-black text-slate-900 dark:text-white font-mono mr-1">
                      {top3.totalPoints}
                    </strong>
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Leaderboard Table / Cards List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 font-black text-[11px] uppercase border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5 w-20 text-center">المركز</th>
                    <th className="py-3.5 px-5">المتسابق</th>
                    <th className="py-3.5 px-5 text-center">التوقعات الصحيحة</th>
                    <th className="py-3.5 px-5 text-center">التوقعات الذهبية</th>
                    <th className="py-3.5 px-5 text-center">نسبة الدقة</th>
                    <th className="py-3.5 px-5 text-left">إجمالي النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isCurrentUser
                          ? 'bg-blue-50/60 dark:bg-blue-950/30 border-r-4 border-r-blue-600'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-5 text-center font-black">
                        {item.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-mono text-xs shadow-2xs font-bold">
                            1
                          </span>
                        ) : item.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-white font-mono text-xs shadow-2xs font-bold">
                            2
                          </span>
                        ) : item.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-mono text-xs shadow-2xs font-bold">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-mono font-bold">
                            #{item.rank}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                            {item.avatar ? (
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {item.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-extrabold truncate ${
                              item.isCurrentUser
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black shrink-0">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-center font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {item.correctPredictions}
                      </td>

                      <td className="py-3.5 px-5 text-center font-mono">
                        {item.goldenPredictions > 0 ? (
                          <span className="inline-flex items-center gap-1 font-black text-amber-600 dark:text-amber-400">
                            <Crown className="w-3.5 h-3.5" />
                            <span>{item.goldenPredictions}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-center font-bold text-slate-500 dark:text-slate-400 font-mono">
                        {item.successRate}%
                      </td>

                      <td className="py-3.5 px-5 text-left font-black text-sm text-slate-900 dark:text-white font-mono">
                        {item.totalPoints}{' '}
                        <span className="text-[10px] text-slate-400 font-normal font-sans">نقطة</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Row List View (Zero Horizontal Overflow, Mobile-First) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex flex-col gap-2 transition-colors ${
                    item.isCurrentUser
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-r-3 border-r-blue-600'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-black text-xs font-mono w-5 shrink-0 text-center">
                        {item.rank === 1 ? (
                          <span className="text-amber-500 font-black">1</span>
                        ) : item.rank === 2 ? (
                          <span className="text-slate-400 font-black">2</span>
                        ) : item.rank === 3 ? (
                          <span className="text-amber-700 font-black">3</span>
                        ) : (
                          <span className="text-slate-400 font-medium">#{item.rank}</span>
                        )}
                      </span>

                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-xs font-black text-slate-500">
                            {item.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-extrabold text-xs truncate max-w-[140px] ${
                              item.isCurrentUser
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[9px] font-black shrink-0">
                              أنت
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          نسبة الدقة: {item.successRate}%
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-left">
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        {item.totalPoints}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-1 font-medium">نقطة</span>
                    </div>
                  </div>

                  {/* Mobile Stats Sub-Row */}
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pr-7 pt-1 border-t border-slate-100/80 dark:border-slate-800/40">
                    <span>
                      صحيحة: <strong className="text-slate-700 dark:text-slate-200 font-mono">{item.correctPredictions}</strong>
                    </span>
                    {item.goldenPredictions > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 font-bold">
                        <Crown className="w-3 h-3" />
                        ذهبية: <strong className="font-mono">{item.goldenPredictions}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

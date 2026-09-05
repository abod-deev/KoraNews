import React, { useState } from 'react';
import {
  Loader2,
  Trophy,
  Crown,
  Search,
  Check,
  User as UserIcon,
  X,
  Sparkles,
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
    <div className="space-y-6">
      {/* Search Header & Current User Rank Indicator */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن متسابق بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-xs transition-all placeholder:text-slate-400"
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
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">ترتيبك في القائمة:</span>
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md font-black text-xs border border-emerald-500/20">
              #{currentUserRank.rank}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {currentUserRank.totalPoints} <span className="text-[10px] text-slate-400">نقطة</span>
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-7 h-7 text-brand animate-spin" />
          <p className="mt-3 text-xs font-bold text-slate-500">جاري تحميل جدول الترتيب...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">
            {searchQuery ? 'لا يوجد متسابق يطابق هذا الاسم.' : 'لا يوجد متسابقون مسجلون في الترتيب حتى الآن.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium (Visible when not searching and at least 3 participants exist) */}
          {!searchQuery && filtered.length >= 3 && top1 && top2 && top3 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ثلاثي الصدارة الحالي</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-lg mx-auto">
                {/* 2nd Place */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-2.5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 dark:bg-slate-800 p-1 border-2 border-slate-300 dark:border-slate-600 overflow-hidden shadow-xs">
                      {top2.avatar ? (
                        <img
                          src={top2.avatar}
                          alt={top2.name}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 text-lg">
                          {top2.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-slate-400 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                      2
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[90px] sm:max-w-[130px]">
                    {top2.name}
                  </h4>
                  <span className="font-black text-slate-700 dark:text-slate-300 text-xs sm:text-sm mt-0.5">
                    {top2.totalPoints}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                  </span>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center text-center -translate-y-3">
                  <div className="relative mb-2.5">
                    <Crown className="w-6 h-6 text-amber-500 absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-xs animate-bounce" />
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-50 dark:bg-amber-950/40 p-1 border-2 border-amber-400 dark:border-amber-500 overflow-hidden shadow-sm">
                      {top1.avatar ? (
                        <img
                          src={top1.avatar}
                          alt={top1.name}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center font-black text-amber-600 text-2xl">
                          {top1.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                      1
                    </span>
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-[150px]">
                    {top1.name}
                  </h4>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base mt-0.5">
                    {top1.totalPoints}{' '}
                    <span className="text-[10px] sm:text-xs text-slate-400 font-normal">نقطة</span>
                  </span>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-2.5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-900/10 dark:bg-amber-950/30 p-1 border-2 border-amber-700/50 dark:border-amber-700/60 overflow-hidden shadow-xs">
                      {top3.avatar ? (
                        <img
                          src={top3.avatar}
                          alt={top3.name}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-amber-100/50 dark:bg-amber-900/20 flex items-center justify-center font-black text-amber-800 dark:text-amber-600 text-lg">
                          {top3.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                      3
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[90px] sm:max-w-[130px]">
                    {top3.name}
                  </h4>
                  <span className="font-black text-slate-700 dark:text-slate-300 text-xs sm:text-sm mt-0.5">
                    {top3.totalPoints}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* List Table / Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5 w-20 text-center">المركز</th>
                    <th className="py-3.5 px-5">المتسابق</th>
                    <th className="py-3.5 px-5 text-center">التوقعات الصحيحة</th>
                    <th className="py-3.5 px-5 text-center">التوقعات الذهبية</th>
                    <th className="py-3.5 px-5 text-center">نسبة الدقة</th>
                    <th className="py-3.5 px-5 text-left">إجمالي النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isCurrentUser
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-5 text-center font-black">
                        {item.rank === 1 ? (
                          <span className="text-base" title="المركز الأول">🥇</span>
                        ) : item.rank === 2 ? (
                          <span className="text-base" title="المركز الثاني">🥈</span>
                        ) : item.rank === 3 ? (
                          <span className="text-base" title="المركز الثالث">🥉</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            #{item.rank}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-5">
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
                                ? 'text-brand dark:text-emerald-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-black shrink-0">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.correctPredictions}
                      </td>

                      <td className="py-3 px-5 text-center">
                        {item.goldenPredictions > 0 ? (
                          <span className="inline-flex items-center gap-1 font-black text-amber-600 dark:text-amber-400">
                            <Crown className="w-3.5 h-3.5" />
                            <span>{item.goldenPredictions}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      <td className="py-3 px-5 text-center font-bold text-slate-500 dark:text-slate-400">
                        {item.successRate}%
                      </td>

                      <td className="py-3 px-5 text-left font-black text-sm text-slate-900 dark:text-white">
                        {item.totalPoints}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card / Row List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex flex-col gap-2.5 transition-colors ${
                    item.isCurrentUser
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-black text-xs text-slate-400 w-5 shrink-0 text-center">
                        {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                      </span>
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-extrabold text-xs sm:text-sm truncate ${
                              item.isCurrentUser
                                ? 'text-brand dark:text-emerald-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isCurrentUser && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand text-white text-[9px] font-black shrink-0">
                              أنت
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          نسبة الدقة: {item.successRate}%
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-left">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {item.totalPoints}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-1 font-medium">نقطة</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 pr-7 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span>
                      صحيحة: <strong className="text-slate-700 dark:text-slate-200">{item.correctPredictions}</strong>
                    </span>
                    {item.goldenPredictions > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 font-bold">
                        <Crown className="w-3 h-3" />
                        ذهبية: {item.goldenPredictions}
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

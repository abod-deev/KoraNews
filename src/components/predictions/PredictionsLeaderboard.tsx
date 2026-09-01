import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Sparkles,
  Search,
  Share2,
  Check,
  TrendingUp,
  User as UserIcon,
  Target,
} from 'lucide-react';
import { motion } from 'motion/react';

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
  const [copiedShare, setCopiedShare] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-slate-100 dark:bg-slate-800/60 rounded-3xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 bg-slate-100 dark:bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Filtered leaderboard by search query
  const filtered = leaderboard.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const top3 = leaderboard.slice(0, 3);
  const restUsers = searchQuery ? filtered : filtered.slice(3);

  // Share / Copy Leaderboard function
  const handleShareLeaderboard = async () => {
    let text = `🏆 جدول ترتيب مسابقة توقعات المباريات - KoraNews ⚽\n\n`;

    if (leaderboard.length > 0) {
      leaderboard.slice(0, 10).forEach((u) => {
        const medal =
          u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `${u.rank}.`;
        text += `${medal} ${u.name} — ${u.totalPoints} نقطة (${u.correctPredictions} صحيح • 👑 ${u.goldenPredictions || 0} ذهبية)\n`;
      });
    }

    if (currentUserRank) {
      text += `\n🎯 ترتيبي الحالي: المركز (${currentUserRank.rank}) برصيد ${currentUserRank.totalPoints} نقطة!\n`;
    }

    text += `\nانضم وتوقع نتائج أقوى المباريات العالمية واكسب النقاط:\n${window.location.origin}/predictions/leaderboard`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'جدول ترتيب مسابقة توقعات KoraNews',
          text,
          url: `${window.location.origin}/predictions/leaderboard`,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch (e) {
      console.warn('Failed to copy leaderboard', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar with Search & Share */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن متسابق بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none font-bold"
          />
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShareLeaderboard}
          className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          {copiedShare ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>تم نسخ الترتيب!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>مشاركة جدول الترتيب</span>
            </>
          )}
        </button>
      </div>

      {/* 2. User's Personal Pinned Stat Card */}
      {currentUserRank && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-amber-500/10 dark:from-sky-950/40 dark:via-emerald-950/30 dark:to-slate-900 border-2 border-sky-500/40 rounded-3xl p-4 sm:p-5 shadow-xs"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex flex-col items-center justify-center font-black shadow-xs">
                <span className="text-[9px] font-bold opacity-80">المركز</span>
                <span className="text-base sm:text-lg leading-none">#{currentUserRank.rank}</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {currentUserRank.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-black">
                    أنت
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 flex items-center gap-2 flex-wrap">
                  <span>⭐ {currentUserRank.correctPredictions} توقع صحيح</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">👑 {currentUserRank.goldenPredictions || 0} ذهبية</span>
                  <span>•</span>
                  <span>دقة {currentUserRank.successRate}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 text-left">
              <div className="pl-3 border-l border-sky-500/20">
                <div className="text-[10px] font-bold text-slate-400">مجموع النقاط</div>
                <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">
                  {currentUserRank.totalPoints} <span className="text-xs font-normal text-slate-400">نقطة</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Top 3 Podium (1st 🥇, 2nd 🥈, 3rd 🥉) */}
      {!searchQuery && top3.length > 0 && (
        <div className="bg-gradient-to-b from-amber-500/10 via-slate-50/50 to-transparent dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 rounded-3xl p-4 sm:p-7 border border-amber-500/20 shadow-xs">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-black mb-1 border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>منصة التتويج والمراكز الثلاثة الأولى</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              أفضل المتوقعين لبطولات اليوم
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-xl mx-auto">
            {/* 2nd Place (Silver) */}
            <div className="flex flex-col items-center">
              {top3[1] ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border transition-all ${
                    top3[1].isCurrentUser ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 flex items-center justify-center font-black text-sm shadow-xs">
                      {top3[1].avatar ? (
                        <img loading="lazy" src={top3[1].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3[1].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-2xs">
                      🥈
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-full text-center">
                    {top3[1].name}
                  </span>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs">
                    {top3[1].totalPoints} نقطة
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-bold text-center space-y-0.5">
                    <div>{top3[1].correctPredictions} صحيح</div>
                    {top3[1].goldenPredictions > 0 && (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold">👑 {top3[1].goldenPredictions} ذهبية</div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="h-28" />
              )}
            </div>

            {/* 1st Place (Gold 🥇) - Elevated */}
            <div className="flex flex-col items-center">
              {top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3.5 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 transition-all shadow-md ${
                    top3[0].isCurrentUser ? 'border-sky-500 ring-2 ring-sky-500/40' : 'border-amber-400 dark:border-amber-500'
                  }`}
                >
                  <Crown className="w-6 h-6 text-amber-500 mb-1 animate-bounce" />
                  <div className="relative mb-2">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-amber-50 dark:bg-amber-950/40 border-3 border-amber-400 flex items-center justify-center font-black text-base shadow-sm">
                      {top3[0].avatar ? (
                        <img loading="lazy" src={top3[0].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3[0].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-2xs">
                      🥇
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-full text-center">
                    {top3[0].name}
                  </span>
                  <div className="mt-1 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-black text-xs sm:text-sm">
                    {top3[0].totalPoints} نقطة
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-bold text-center space-y-0.5">
                    <div>{top3[0].correctPredictions} صحيح</div>
                    {top3[0].goldenPredictions > 0 && (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold">👑 {top3[0].goldenPredictions} ذهبية</div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* 3rd Place (Bronze 🥉) */}
            <div className="flex flex-col items-center">
              {top3[2] ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border transition-all ${
                    top3[2].isCurrentUser ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-amber-800/30 dark:border-amber-700/40'
                  }`}
                >
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border-2 border-amber-700 flex items-center justify-center font-black text-sm shadow-xs">
                      {top3[2].avatar ? (
                        <img loading="lazy" src={top3[2].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3[2].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-2xs">
                      🥉
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-full text-center">
                    {top3[2].name}
                  </span>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-black text-xs">
                    {top3[2].totalPoints} نقطة
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-bold text-center space-y-0.5">
                    <div>{top3[2].correctPredictions} صحيح</div>
                    {top3[2].goldenPredictions > 0 && (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold">👑 {top3[2].goldenPredictions} ذهبية</div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="h-28" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Full Rankings Section: Responsive Cards for Mobile & Table for Desktop */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            قائمة الترتيب العام ({filtered.length} متسابق)
          </h4>
          <span className="text-[11px] font-bold text-slate-400">
            تحديث تلقائي للنقاط
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 text-xs font-bold">
            {searchQuery ? 'لا يوجد متسابق يطابق بحثك.' : 'لا يوجد مشاركون حتى الآن. كن أول من يتوقع!'}
          </div>
        ) : (
          <div>
            {/* Desktop Table View (hidden on small mobile screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-16">الترتيب</th>
                    <th className="py-3 px-4">المتسابق</th>
                    <th className="py-3 px-4 text-center">التوقعات الصحيحة</th>
                    <th className="py-3 px-4 text-center">التوقعات الذهبية</th>
                    <th className="py-3 px-4 text-center">نسبة النجاح</th>
                    <th className="py-3 px-4 text-left">إجمالي النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isCurrentUser
                          ? 'bg-sky-500/10 font-bold'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-black">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black ${
                            item.rank === 1
                              ? 'bg-amber-400 text-amber-950'
                              : item.rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : item.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                            {item.avatar ? (
                              <img loading="lazy" src={item.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {item.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </span>
                          {item.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[9px] font-black shrink-0">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.correctPredictions} توقع
                      </td>

                      <td className="py-3.5 px-4 text-center font-extrabold text-amber-600 dark:text-amber-400">
                        👑 {item.goldenPredictions || 0}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-500 dark:text-slate-400">
                        {item.successRate}%
                      </td>

                      <td className="py-3.5 px-4 text-left font-black text-sm text-sky-600 dark:text-sky-400">
                        {item.totalPoints} <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout (shown on screens < md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex flex-col gap-2.5 transition-colors ${
                    item.isCurrentUser
                      ? 'bg-sky-500/10 font-bold'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Badge */}
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shrink-0 ${
                          item.rank === 1
                            ? 'bg-amber-400 text-amber-950'
                            : item.rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : item.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                      </span>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                        {item.avatar ? (
                          <img loading="lazy" src={item.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                            {item.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>

                      {item.isCurrentUser && (
                        <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[9px] font-black shrink-0">
                          أنت
                        </span>
                      )}
                    </div>

                    {/* Points Badge */}
                    <div className="shrink-0 text-left">
                      <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                        {item.totalPoints} <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                      </span>
                    </div>
                  </div>

                  {/* Mobile Stats Pills Row */}
                  <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <span>⭐ {item.correctPredictions} صحيحة</span>
                    <span className="text-amber-600 dark:text-amber-400">👑 {item.goldenPredictions || 0} ذهبية</span>
                    <span>🎯 دقة {item.successRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



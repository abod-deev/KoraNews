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
        <div className="h-44 bg-gray-100 dark:bg-gray-800/60 rounded-3xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 bg-gray-100 dark:bg-gray-800/40 rounded-2xl animate-pulse" />
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

  // Share / Copy Leaderboard function
  const handleShareLeaderboard = async () => {
    let text = `🏆 جدول ترتيب مسابقة توقعات المباريات - KoraNews ⚽\n\n`;

    if (leaderboard.length > 0) {
      leaderboard.slice(0, 10).forEach((u) => {
        const medal =
          u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `${u.rank}.`;
        text += `${medal} ${u.name} — ${u.totalPoints} نقطة (${u.correctPredictions} توقع صحيح)\n`;
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن متسابق بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent outline-none font-bold"
          />
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShareLeaderboard}
          className="px-4 py-2 rounded-xl bg-brand text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-2xs transition-all active:scale-95 cursor-pointer"
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

      {/* 2. User's Personal Pinned Stat Card (if user is in the contest) */}
      {currentUserRank && (
        <div className="bg-gradient-to-r from-brand/15 via-emerald-600/10 to-teal-500/10 dark:from-brand/20 dark:via-emerald-900/20 dark:to-gray-900 border-2 border-brand/40 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand text-white flex flex-col items-center justify-center font-black shadow-xs">
                <span className="text-[10px] font-bold opacity-80">المركز</span>
                <span className="text-base sm:text-lg leading-none">#{currentUserRank.rank}</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    {currentUserRank.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-brand text-white text-[10px] font-black">
                    أنت
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-bold mt-0.5">
                  {currentUserRank.correctPredictions} توقع دقيق من أصل {currentUserRank.totalPredictions} مباراة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 text-left">
              <div>
                <div className="text-[10px] font-bold text-gray-400">نسبة الدقة</div>
                <div className="text-sm font-black text-gray-800 dark:text-gray-200">
                  {currentUserRank.successRate}%
                </div>
              </div>
              <div className="pl-2 border-l border-brand/30">
                <div className="text-[10px] font-bold text-gray-400">مجموع النقاط</div>
                <div className="text-lg sm:text-xl font-black text-brand">
                  {currentUserRank.totalPoints} <span className="text-xs font-normal">نقطة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Top 3 Podium (Only shown when not searching) */}
      {!searchQuery && top3.length > 0 && (
        <div className="bg-gradient-to-b from-brand/10 via-emerald-500/5 to-transparent dark:from-brand/15 dark:via-gray-900 dark:to-gray-900 rounded-3xl p-5 sm:p-7 border border-brand/20 shadow-xs">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-black mb-1">
              <Trophy className="w-3.5 h-3.5" />
              أفضل المتوقعين
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
              منصة التتويج
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto">
            {/* 2nd Place (Silver) */}
            <div className="flex flex-col items-center">
              {top3[1] ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-gray-800 border transition-all ${
                    top3[1].isCurrentUser ? 'border-brand ring-2 ring-brand/30' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-slate-300 flex items-center justify-center font-black text-sm">
                      {top3[1].avatar ? (
                        <img src={top3[1].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3[1].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-xs">
                      🥈
                    </span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white truncate max-w-full">
                    {top3[1].name}
                  </span>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs">
                    {top3[1].totalPoints} نقطة
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-bold">
                    {top3[1].correctPredictions} صحيحة
                  </span>
                </motion.div>
              ) : (
                <div className="h-28" />
              )}
            </div>

            {/* 1st Place (Gold) - Elevated */}
            <div className="flex flex-col items-center">
              {top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-800 border-2 transition-all shadow-md ${
                    top3[0].isCurrentUser ? 'border-brand ring-2 ring-brand/40' : 'border-amber-400 dark:border-amber-500'
                  }`}
                >
                  <Crown className="w-5 h-5 text-amber-500 mb-1 animate-bounce" />
                  <div className="relative mb-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 flex items-center justify-center font-black text-base">
                      {top3[0].avatar ? (
                        <img src={top3[0].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3[0].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-xs">
                      🥇
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate max-w-full">
                    {top3[0].name}
                  </span>
                  <div className="mt-1 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-black text-xs sm:text-sm">
                    {top3[0].totalPoints} نقطة
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-bold">
                    {top3[0].correctPredictions} صحيحة
                  </span>
                </motion.div>
              )}
            </div>

            {/* 3rd Place (Bronze) */}
            <div className="flex flex-col items-center">
              {top3[2] ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-gray-800 border transition-all ${
                    top3[2].isCurrentUser ? 'border-brand ring-2 ring-brand/30' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-amber-700 flex items-center justify-center font-black text-sm">
                      {top3[2].avatar ? (
                        <img src={top3[2].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3[2].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-xs">
                      🥉
                    </span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white truncate max-w-full">
                    {top3[2].name}
                  </span>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-black text-xs">
                    {top3[2].totalPoints} نقطة
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-bold">
                    {top3[2].correctPredictions} صحيحة
                  </span>
                </motion.div>
              ) : (
                <div className="h-28" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Full Rankings Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h4 className="text-sm font-black text-gray-900 dark:text-white">
            قائمة الترتيب ({filtered.length} متسابق)
          </h4>
          <span className="text-[11px] font-bold text-gray-400">
            تحديث مباشر للنقاط
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 text-gray-400 text-xs font-bold">
            {searchQuery ? 'لا يوجد متسابق يطابق بحثك.' : 'لا يوجد مشاركون حتى الآن. كن أول من يتوقع!'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                  item.isCurrentUser
                    ? 'bg-brand/5 dark:bg-brand/10 font-bold'
                    : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/50'
                }`}
              >
                {/* Rank & User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      item.rank === 1
                        ? 'bg-amber-400 text-amber-950 font-black'
                        : item.rank === 2
                        ? 'bg-slate-300 text-slate-800 font-black'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white font-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {item.rank}
                  </div>

                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
                    {item.avatar ? (
                      <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-500">
                        {item.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                        {item.name}
                      </span>
                      {item.isCurrentUser && (
                        <span className="px-1.5 py-0.5 rounded-md bg-brand text-white text-[9px] font-black shrink-0">
                          أنت
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{item.correctPredictions} توقع صحيح</span>
                      <span>•</span>
                      <span>دقة {item.successRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Points Badge */}
                <div className="shrink-0 text-left">
                  <div className="text-sm sm:text-base font-black text-brand">
                    {item.totalPoints}{' '}
                    <span className="text-[10px] font-normal text-gray-400">نقطة</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

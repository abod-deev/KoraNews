import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ChevronLeft,
  RotateCw,
  Target,
  Share2,
  Check,
  Search,
  Award,
  Crown,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';

export interface GoldenLeaderboardUser {
  id: number;
  rank: number;
  name: string;
  avatar: string | null;
  role: string;
  goldenPredictions: number;
  goldenPoints: number;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  successRate: number;
  isCurrentUser: boolean;
}

export default function GoldenLeaderboardPage() {
  useSEO('لائحة التوقعات الذهبية', 'ترتيب المتسابقين الحاصلين على التوقعات الذهبية (+1 نقطة إضافية) في مسابقة KoraNews');
  const { token } = useAuth();

  const [leaderboard, setLeaderboard] = useState<GoldenLeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<GoldenLeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  const fetchGoldenLeaderboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/predictions/leaderboard/golden', { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setCurrentUserRank(data.currentUserRank || null);
      }
    } catch (e) {
      console.error('Failed to fetch golden leaderboard:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGoldenLeaderboard();
  }, [token]);

  const handleShare = async () => {
    let text = `👑 لائحة التوقعات الذهبية — مسابقة KoraNews ⚽\n\n`;
    text += `التوقع الذهبي يُمنح للمتسابق المنفرد بالتوقع الصحيح بالضبط لمباراة 2 نقطة (+1 نقطة ذهبية)!\n\n`;

    if (leaderboard.length > 0) {
      leaderboard.slice(0, 10).forEach((u) => {
        const icon = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `${u.rank}.`;
        text += `${icon} ${u.name} — ${u.goldenPredictions} توقع ذهبي (👑 ${u.goldenPoints} نقطة)\n`;
      });
    }

    if (currentUserRank) {
      text += `\n🎯 رصيدي الذهبي: المركز (${currentUserRank.rank}) بـ ${currentUserRank.goldenPredictions} توقع ذهبي!\n`;
    }

    text += `\nتوقع المباريات واكسب التوقعات الذهبية:\n${window.location.origin}/predictions/golden`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'لائحة التوقعات الذهبية - KoraNews',
          text,
          url: `${window.location.origin}/predictions/golden`,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch (e) {
      console.warn('Failed to copy golden leaderboard text', e);
    }
  };

  const filteredLeaderboard = leaderboard.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const top3Golden = leaderboard.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Header & Navigation Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <Link to="/predictions" className="hover:text-amber-500 transition-colors flex items-center gap-1">
              <span>مسابقة التوقعات</span>
              <ChevronLeft className="w-3 h-3" />
            </Link>
            <span className="text-slate-900 dark:text-white">لائحة التوقعات الذهبية</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Crown className="w-8 h-8 text-amber-500" />
            <span>لائحة التوقعات الذهبية 👑</span>
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
            ترتيب المتسابقين المنفردين بأعلى عدد من التوقعات الذهبية في المسابقة.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchGoldenLeaderboard(true)}
            disabled={isRefreshing || isLoading}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="تحديث الترتيب"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم النسخ!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>مشاركة القائمة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Golden Rule Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-yellow-500/10 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-3xl flex items-center gap-3 shadow-xs">
        <Sparkles className="w-8 h-8 text-amber-500 shrink-0" />
        <div className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-black text-amber-700 dark:text-amber-400">قاعدة التوقع الذهبي: </span>
          تُمنح التوقعات الذهبية (+1 نقطة ذهبية إضافية) عندما تكون المتسابق الوحيد الذي نجح في توقع النتيجة الصحيحة بالضبط لمباراة 2 نقطة!
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث عن متسابق..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold"
        />
      </div>

      {/* 4. Current User Golden Stat Badge */}
      {currentUserRank && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-yellow-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-400/60 rounded-3xl p-4 sm:p-5 shadow-xs"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center font-black shadow-xs">
                <span className="text-[9px] font-bold opacity-80">المركز</span>
                <span className="text-base sm:text-lg leading-none">#{currentUserRank.rank}</span>
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{currentUserRank.name}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-black">أنت</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 block">
                  👑 {currentUserRank.goldenPredictions} توقعات ذهبية • +{currentUserRank.goldenPoints} نقطة إضافية
                </span>
              </div>
            </div>

            <div className="text-left font-black text-amber-600 dark:text-amber-400 text-lg sm:text-xl">
              {currentUserRank.goldenPredictions} <span className="text-xs text-slate-400 font-normal">توقع ذهبي</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. Top 3 Golden Podium */}
      {!searchQuery && top3Golden.length > 0 && (
        <div className="bg-gradient-to-b from-amber-500/10 via-slate-50/50 to-transparent dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 rounded-3xl p-4 sm:p-7 border border-amber-500/20 shadow-xs">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-black mb-1 border border-amber-500/20">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>فرسان التوقعات الذهبية</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              المراكز الثلاثة الأولى بالذهبيات 👑
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-xl mx-auto">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              {top3Golden[1] ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border transition-all ${
                    top3Golden[1].isCurrentUser ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 flex items-center justify-center font-black text-sm shadow-xs">
                      {top3Golden[1].avatar ? (
                        <img loading="lazy" src={top3Golden[1].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3Golden[1].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-2xs">
                      🥈
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-full text-center">
                    {top3Golden[1].name}
                  </span>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black text-xs">
                    👑 {top3Golden[1].goldenPredictions} ذهبية
                  </div>
                </motion.div>
              ) : (
                <div className="h-28" />
              )}
            </div>

            {/* 1st Place (Gold 🥇) */}
            <div className="flex flex-col items-center">
              {top3Golden[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3.5 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 transition-all shadow-md ${
                    top3Golden[0].isCurrentUser ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-amber-400 dark:border-amber-500'
                  }`}
                >
                  <Crown className="w-6 h-6 text-amber-500 mb-1 animate-bounce" />
                  <div className="relative mb-2">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-amber-50 dark:bg-amber-950/40 border-3 border-amber-400 flex items-center justify-center font-black text-base shadow-sm">
                      {top3Golden[0].avatar ? (
                        <img loading="lazy" src={top3Golden[0].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3Golden[0].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-2xs">
                      🥇
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-full text-center">
                    {top3Golden[0].name}
                  </span>
                  <div className="mt-1 px-3 py-0.5 rounded-full bg-amber-500 text-white font-black text-xs sm:text-sm shadow-xs">
                    👑 {top3Golden[0].goldenPredictions} ذهبية
                  </div>
                </motion.div>
              )}
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              {top3Golden[2] ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex flex-col items-center p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border transition-all ${
                    top3Golden[2].isCurrentUser ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-amber-800/30 dark:border-amber-700/40'
                  }`}
                >
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border-2 border-amber-700 flex items-center justify-center font-black text-sm shadow-xs">
                      {top3Golden[2].avatar ? (
                        <img loading="lazy" src={top3Golden[2].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{top3Golden[2].name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-2xs">
                      🥉
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-full text-center">
                    {top3Golden[2].name}
                  </span>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black text-xs">
                    👑 {top3Golden[2].goldenPredictions} ذهبية
                  </div>
                </motion.div>
              ) : (
                <div className="h-28" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Full Golden Leaderboard Table & Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 bg-slate-100 dark:bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredLeaderboard.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
          <Crown className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-black text-slate-700 dark:text-slate-300">
            لا توجد توقعات ذهبية مسجلة بعد
          </h3>
          <p className="text-xs text-slate-500 font-bold">
            كن أول من ينفرد بتوقع دقيق لمباراة قادمة لاكتمال سجل التوقعات الذهبية!
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-16">الترتيب</th>
                  <th className="py-3 px-4">المتسابق</th>
                  <th className="py-3 px-4 text-center">التوقعات الذهبية</th>
                  <th className="py-3 px-4 text-center">إجمالي التوقعات الصحيحة</th>
                  <th className="py-3 px-4 text-left">إجمالي النقاط العامة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLeaderboard.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors ${
                      user.isCurrentUser
                        ? 'bg-amber-500/10 font-bold'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-black">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black ${
                          user.rank === 1
                            ? 'bg-amber-400 text-amber-950'
                            : user.rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : user.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                          {user.avatar ? (
                            <img loading="lazy" src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                              {user.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-black text-slate-900 dark:text-white truncate">
                          {user.name}
                        </span>
                        {user.isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] font-black shrink-0">
                            أنت
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-xs">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span>{user.goldenPredictions} ذهبي (+{user.goldenPoints} نقطة)</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {user.correctPredictions} صحيح
                    </td>

                    <td className="py-3.5 px-4 text-left font-black text-sm text-amber-600 dark:text-amber-400">
                      {user.totalPoints} <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLeaderboard.map((user) => (
              <div
                key={user.id}
                className={`p-3.5 flex flex-col gap-2.5 transition-colors ${
                  user.isCurrentUser
                    ? 'bg-amber-500/10 font-bold'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shrink-0 ${
                        user.rank === 1
                          ? 'bg-amber-400 text-amber-950'
                          : user.rank === 2
                          ? 'bg-slate-300 text-slate-900'
                          : user.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                    </span>

                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                      {user.avatar ? (
                        <img loading="lazy" src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                          {user.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {user.name}
                    </span>

                    {user.isCurrentUser && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] font-black shrink-0">
                        أنت
                      </span>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-xs shrink-0">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>{user.goldenPredictions} ذهبية</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                  <span>⭐ إجمالي الصحيح: {user.correctPredictions}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">إجمالي النقاط: {user.totalPoints}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


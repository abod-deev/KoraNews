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
  useSEO('لائحة التوقعات الذهبية', 'ترتيب المتسابقين الحاصلين على التوقعات الذهبية (+1 نقطة) للمباريات ذات الـ 2 نقطة في مسابقة KoraNews');
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
    text += `التوقع الذهبي يُمنح للمتسابق الوحيد الذي ينجح في توقع النتيجة الدقيقة لمباراة ذات نقطتين (+1 نقطة ذهبية)!\n\n`;

    if (leaderboard.length > 0) {
      leaderboard.slice(0, 10).forEach((u) => {
        const icon = u.rank === 1 ? '👑' : u.rank === 2 ? '🥇' : u.rank === 3 ? '🥈' : `${u.rank}.`;
        text += `${icon} ${u.name} — ${u.goldenPredictions} توقع ذهبي (${u.goldenPoints} نقطة ذهبية)\n`;
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Header & Navigation Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/predictions" className="hover:text-amber-500 transition-colors flex items-center gap-1">
              <span>مسابقة التوقعات</span>
              <ChevronLeft className="w-3 h-3" />
            </Link>
            <span className="text-gray-900 dark:text-white">لائحة التوقعات الذهبية</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <Crown className="w-8 h-8 text-amber-500" />
            <span>لائحة التوقعات الذهبية 👑</span>
          </h1>
          <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
            يُمنح التوقع الذهبي (+1 نقطة ذهبية إضافية) عندما تكون المتسابق الوحيد الذي توقع النتيجة الدقيقة لمباراة ذات نقطتين (2 نقاط).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchGoldenLeaderboard(true)}
            disabled={isRefreshing || isLoading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="تحديث الترتيب"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 hover:bg-amber-600 shadow-2xs transition-all cursor-pointer"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم نسخ الرابط!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>مشاركة الصفحة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Golden Rule Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-yellow-500/10 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-gray-900 border border-amber-300 dark:border-amber-700/60 rounded-2xl flex items-center gap-3 shadow-xs">
        <Sparkles className="w-8 h-8 text-amber-500 shrink-0" />
        <div className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-black text-amber-700 dark:text-amber-400">قاعدة التوقع الذهبي: </span>
          المباراة المؤهلة للذهبية هي فقط المباراة بقيمة <span className="font-black text-amber-700 dark:text-amber-300">2 نقاط</span>. عندما ينتهي اللقاء وتكون أنت المتسابق الوحيد بين جميع المشاركين الذي توقع النتيجة الصحيحة بالضبط، تحصل تلقائياً على <span className="font-black text-amber-600 dark:text-amber-300 font-mono">👑 2 نقاط أساسية + 1 نقطة ذهبية = 3 نقاط إجمالية</span>!
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث عن متسابق..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold"
        />
      </div>

      {/* 4. Current User Stat Badge */}
      {currentUserRank && (
        <div className="bg-amber-500/10 border-2 border-amber-400/60 dark:border-amber-500/50 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex flex-col items-center justify-center font-black">
              <span className="text-[9px]">المركز</span>
              <span className="text-sm">#{currentUserRank.rank}</span>
            </div>
            <div>
              <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>{currentUserRank.name}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px]">أنت</span>
              </div>
              <span className="text-xs text-gray-500 font-bold">
                {currentUserRank.goldenPredictions} توقعات ذهبية • {currentUserRank.goldenPoints} نقاط إضافية
              </span>
            </div>
          </div>

          <div className="text-left font-black text-amber-600 dark:text-amber-400 text-lg">
            {currentUserRank.goldenPoints} <span className="text-xs text-gray-500">نقطة ذهبية</span>
          </div>
        </div>
      )}

      {/* 5. Leaderboard Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 bg-gray-100 dark:bg-gray-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredLeaderboard.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
          <Crown className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="text-base font-black text-gray-700 dark:text-gray-300">
            لا توجد توقعات ذهبية مسجلة بعد
          </h3>
          <p className="text-xs text-gray-500 font-bold">
            كن أول من ينفرد بتوقع دقيق لمباراة قادمة لاكتمال سجل التوقعات الذهبية!
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xs">
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {filteredLeaderboard.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                  user.isCurrentUser
                    ? 'bg-amber-50/60 dark:bg-amber-950/30'
                    : 'hover:bg-gray-50/80 dark:hover:bg-gray-750'
                }`}
              >
                {/* Rank & User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 ${
                      user.rank === 1
                        ? 'bg-amber-400 text-amber-950 shadow-xs'
                        : user.rank === 2
                        ? 'bg-slate-300 text-slate-900'
                        : user.rank === 3
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {user.rank === 1 ? '👑' : user.rank}
                  </div>

                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-xs shrink-0 border border-amber-300/50">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.name.charAt(0)}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {user.name}
                      </span>
                      {user.isCurrentUser && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] font-black">
                          أنت
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                      <span>إجمالي التوقعات: {user.correctPredictions} صحيحة</span>
                      <span>•</span>
                      <span>إجمالي النقاط: {user.totalPoints}</span>
                    </div>
                  </div>
                </div>

                {/* Golden Badge Stats */}
                <div className="text-left shrink-0">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{user.goldenPredictions} ذهبي (+{user.goldenPoints} نقطة)</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

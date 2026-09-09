import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  RotateCw,
  Target,
  Share2,
  Check,
  Search,
  Crown,
  Trophy,
  Sparkles,
  X,
  Info,
  Medal,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

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
  useSEO(
    'الترتيب الذهبي',
    'ترتيب المتسابقين الحاصلين على التوقعات الذهبية في مسابقة KoraNews'
  );
  const { token } = useAuth();

  const [leaderboard, setLeaderboard] = useState<GoldenLeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<GoldenLeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoldenLeaderboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/predictions/leaderboard/golden', { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setCurrentUserRank(data.currentUserRank || null);
      } else {
        setError('تعذر تحميل بيانات الترتيب الذهبي حالياً. يرجى المحاولة مرة أخرى.');
      }
    } catch (e) {
      console.error('Failed to fetch golden leaderboard:', e);
      setError('حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك وإعادة المحاولة.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGoldenLeaderboard();
  }, [token]);

  const handleShare = async () => {
    let text = `👑 لائحة التوقعات الذهبية — مسابقة KoraNews\n\n`;
    text += `التوقع الذهبي يُمنح للمتسابق المنفرد بالتوقع الدقيق لمباراة ما!\n\n`;

    if (leaderboard.length > 0) {
      leaderboard.slice(0, 5).forEach((u) => {
        const icon = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `${u.rank}.`;
        text += `${icon} ${u.name} — ${u.goldenPredictions} ذهبية (إجمالي النقاط: ${u.totalPoints})\n`;
      });
    }

    if (currentUserRank) {
      text += `\n🎯 ترتيبي الذهبي: المركز #${currentUserRank.rank} بـ ${currentUserRank.goldenPredictions} توقع ذهبي!\n`;
    }

    text += `\nتابع الترتيب وتوقع الآن:\n${window.location.origin}/predictions/golden`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'الترتيب الذهبي - KoraNews',
          text,
          url: `${window.location.origin}/predictions/golden`,
        });
        return;
      } catch {}
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        console.warn('Failed to copy golden leaderboard text', e);
      }
    }
  };

  const filteredLeaderboard = leaderboard.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Available Golden Stats calculated from existing data
  const totalGoldenPredictions = leaderboard.reduce((acc, u) => acc + (u.goldenPredictions || 0), 0);
  const totalGoldenMembers = leaderboard.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header with Breadcrumb & Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
              <Link
                to="/predictions"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
              >
                <span>مسابقة التوقعات</span>
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
              <Link
                to="/predictions/leaderboard"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
              >
                <span>ترتيب التوقعات</span>
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
              <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                الترتيب الذهبي
              </span>
            </nav>

            {/* Clear Title */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0 shadow-2xs">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>الترتيب الذهبي</span>
                  <Sparkles className="w-4 h-4 text-amber-500 inline" />
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  سجل الشرف الخاص بالمتسابقين الذين انفردوا دون غيرهم بالتوقع الصحيح لنتائج المباريات.
                </p>
              </div>
            </div>
          </div>

          {/* Secondary Actions (Share, Refresh) & Navigation */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* العودة للترتيب العام */}
            <Link
              to="/predictions/leaderboard"
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Trophy className="w-4 h-4 text-slate-500" />
              <span>الترتيب العام</span>
            </Link>

            {/* Share / مشاركة (Secondary Action أنيق) */}
            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] min-w-[44px] p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="مشاركة الترتيب الذهبي"
              aria-label="مشاركة الترتيب الذهبي"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-extrabold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">مشاركة</span>
                </>
              )}
            </button>

            {/* Refresh / تحديث (Secondary Action أنيق) */}
            <button
              type="button"
              onClick={() => fetchGoldenLeaderboard(true)}
              disabled={isRefreshing || isLoading}
              className="min-h-[44px] min-w-[44px] p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="تحديث الترتيب الذهبي"
              aria-label="تحديث الترتيب الذهبي"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            {/* التوقع الآن */}
            <Link
              to="/predictions"
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>توقع الآن</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Golden Hero (Crown, Title, Description, and Existing Golden Stats Only) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Subtle accent border at top instead of full yellow background */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
              <Crown className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  معيار الترتيب الذهبي
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[11px] font-black border border-amber-200/80 dark:border-amber-800/60">
                  حسب عدد الذهبيات
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                يُحدد الترتيب الذهبي بناءً على <strong>عدد التوقعات الذهبية (الانفراد بالنتيجة الدقيقة)</strong> التي حصل عليها كل متسابق. وتُضاف نقاط الذهبي ومكافأة كل 3 ذهبيات لرصيد الترتيب العام.
              </p>
            </div>
          </div>

          {/* Existing Golden Stats Display */}
          <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
            <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold block">إجمالي الذهبيات</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono flex items-center justify-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                {totalGoldenPredictions}
              </span>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold block">أبطال السجل</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                {totalGoldenMembers} <span className="text-[10px] text-slate-400 font-medium">متسابق</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                تعذر تحميل الترتيب الذهبي
              </h4>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 font-medium mt-0.5">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchGoldenLeaderboard(false)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* 4. Toolbar: Integrated Search & Current User Golden Rank */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن متسابق في السجل الذهبي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Current User Golden Status */}
        {currentUserRank && currentUserRank.rank > 0 && !searchQuery && (
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
            <span className="text-slate-400 font-medium">ترتيبك الذهبي:</span>
            <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-lg font-black text-xs border border-amber-200/70 dark:border-amber-800/40">
              #{currentUserRank.rank}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-black text-slate-900 dark:text-white flex items-center gap-1 font-mono">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              {currentUserRank.goldenPredictions} <span className="text-[10px] text-slate-400 font-normal font-sans">ذهبية</span>
            </span>
          </div>
        )}
      </div>

      {/* 5. Loading State */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 p-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800" />
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
      ) : filteredLeaderboard.length === 0 ? (
        /* 6. Empty State */
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
            <Crown className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
            {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد توقعات ذهبية مسجلة بعد'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'تأكد من كتابة الاسم بصورة صحيحة أو قم بمسح البحث لعرض السجل كاملاً.'
              : 'كن أول متسابق ينفرد بتوقع صحيح لإحدى المباريات القادمة لتتصدر السجل الذهبي!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 7. Leaderboard Table / Rows (Unified with PredictionsLeaderboard) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 font-black text-[11px] uppercase border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5 w-20 text-center">المركز</th>
                    <th className="py-3.5 px-5">المتسابق</th>
                    <th className="py-3.5 px-5 text-center">عدد الذهبيات (معيار الترتيب)</th>
                    <th className="py-3.5 px-5 text-center">توقعات صحيحة</th>
                    <th className="py-3.5 px-5 text-left">إجمالي النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLeaderboard.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isCurrentUser
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-r-4 border-r-amber-500'
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
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-mono font-bold">
                            {item.rank}
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
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shrink-0">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-black border border-amber-200/60 dark:border-amber-800/40 font-mono text-xs">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>{item.goldenPredictions}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-center font-bold text-slate-600 dark:text-slate-300 font-mono">
                        {item.correctPredictions}
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
              {filteredLeaderboard.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    item.isCurrentUser
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-r-3 border-r-amber-500'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-black text-xs font-mono w-5 shrink-0 text-center">
                      {item.rank === 1 ? (
                        <span className="text-amber-500 font-black">1</span>
                      ) : item.rank === 2 ? (
                        <span className="text-slate-400 font-black">2</span>
                      ) : item.rank === 3 ? (
                        <span className="text-amber-700 font-black">3</span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 font-bold">{item.rank}</span>
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
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                        {item.isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black shrink-0">
                            أنت
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        النقاط: <strong className="font-mono text-slate-600 dark:text-slate-300">{item.totalPoints}</strong> (+{item.goldenPoints} ذهبية)
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-left">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black text-xs border border-amber-200/60 dark:border-amber-800/40 font-mono">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>{item.goldenPredictions}</span>
                    </span>
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

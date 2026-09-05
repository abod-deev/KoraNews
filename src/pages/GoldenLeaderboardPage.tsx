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
  Loader2,
  X,
  Info,
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
    'لائحة التوقعات الذهبية',
    'ترتيب المتسابقين الحاصلين على التوقعات الذهبية في مسابقة KoraNews'
  );
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
    let text = `👑 لائحة التوقعات الذهبية — مسابقة KoraNews\n\n`;
    text += `التوقع الذهبي يُمنح للمتسابق المنفرد بالتوقع الدقيق لمباراة ما!\n\n`;

    if (leaderboard.length > 0) {
      leaderboard.slice(0, 5).forEach((u) => {
        const icon = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `${u.rank}.`;
        text += `${icon} ${u.name} — ${u.goldenPredictions} توقع ذهبي (+${u.goldenPoints} نقطة ذهبية)\n`;
      });
    }

    if (currentUserRank) {
      text += `\n🎯 رصيدي: المركز #${currentUserRank.rank} بـ ${currentUserRank.goldenPredictions} توقع ذهبي!\n`;
    }

    text += `\nتابع الترتيب وتوقع الآن:\n${window.location.origin}/predictions/golden`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'لائحة التوقعات الذهبية - KoraNews',
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

  const top1 = filteredLeaderboard.find((u) => u.rank === 1);
  const top2 = filteredLeaderboard.find((u) => u.rank === 2);
  const top3 = filteredLeaderboard.find((u) => u.rank === 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
            <Link
              to="/predictions"
              className="hover:text-brand transition-colors inline-flex items-center gap-1"
            >
              <span>مسابقة التوقعات</span>
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
            <Link
              to="/predictions/leaderboard"
              className="hover:text-brand transition-colors inline-flex items-center gap-1"
            >
              <span>الترتيب العام</span>
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
            <span className="text-amber-600 dark:text-amber-400 font-extrabold">
              الترتيب الذهبي
            </span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <span>لوحة التوقعات الذهبية</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            سجل الشرف الخاص بالمتسابقين الذين انفردوا دون غيرهم بالتوقع الصحيح لنتائج المباريات.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="مشاركة الترتيب الذهبي"
            aria-label="مشاركة الترتيب الذهبي"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline text-emerald-600">تم النسخ</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">مشاركة</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => fetchGoldenLeaderboard(true)}
            disabled={isRefreshing || isLoading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="تحديث الترتيب"
            aria-label="تحديث الترتيب الذهبي"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <Link
            to="/predictions"
            className="px-4 py-2 rounded-xl bg-brand hover:bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>توقع الآن</span>
          </Link>
        </div>
      </div>

      {/* 2. Informational Callout Card */}
      <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 sm:p-5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
          <p className="font-extrabold text-slate-900 dark:text-white">
            كيف تكسب توقعاً ذهبياً؟
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-xs">
            يُمنح وسام التوقع الذهبي ونقاطه الإضافية عندما تكون المتسابق الوحيد بين جميع المشاركين الذي توقع النتيجة الدقيقة للمباراة.
          </p>
        </div>
      </div>

      {/* 3. Search & Current User Gold Rank */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن متسابق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-xs transition-all placeholder:text-slate-400"
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
            <span className="text-slate-500 dark:text-slate-400">ترتيبك الذهبي:</span>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-md font-black text-xs border border-amber-500/20">
              #{currentUserRank.rank}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              {currentUserRank.goldenPredictions} <span className="text-[10px] text-slate-400">ذهبية</span>
            </span>
          </div>
        )}
      </div>

      {/* 4. Leaderboard Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
          <p className="mt-3 text-xs font-bold text-slate-500">جاري تحميل لوحة الشرف الذهبية...</p>
        </div>
      ) : filteredLeaderboard.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
            <Crown className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
            {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد توقعات ذهبية مسجلة بعد'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'تأكد من كتابة الاسم بصورة صحيحة.'
              : 'كن أول متسابق ينفرد بتوقع صحيح لإحدى المباريات القادمة لتتصدر السجل الذهبي!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Golden Podium */}
          {!searchQuery && filteredLeaderboard.length >= 3 && top1 && top2 && top3 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>رواد التوقعات الذهبية</span>
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
                  <span className="font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm mt-0.5 inline-flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    {top2.goldenPredictions}
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
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base mt-0.5 inline-flex items-center gap-1">
                    <Crown className="w-4 h-4" />
                    {top1.goldenPredictions}{' '}
                    <span className="text-[10px] sm:text-xs text-slate-400 font-normal">ذهبية</span>
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
                  <span className="font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm mt-0.5 inline-flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    {top3.goldenPredictions}
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
                    <th className="py-3.5 px-5 text-center">التوقعات الذهبية</th>
                    <th className="py-3.5 px-5 text-center">النقاط الذهبية</th>
                    <th className="py-3.5 px-5 text-left">إجمالي النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredLeaderboard.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isCurrentUser
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
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

                      <td className="py-3 px-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-black">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>{item.goldenPredictions}</span>
                        </span>
                      </td>

                      <td className="py-3 px-5 text-center font-bold text-slate-700 dark:text-slate-300">
                        +{item.goldenPoints}
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

            {/* Mobile Cards List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLeaderboard.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    item.isCurrentUser
                      ? 'bg-amber-50/40 dark:bg-amber-950/20'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
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
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        إجمالي النقاط: {item.totalPoints}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-left">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-black text-xs border border-amber-500/20">
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

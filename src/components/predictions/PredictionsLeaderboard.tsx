import React, { useState } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Search,
  X,
  Share2,
  Check,
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
  contestName?: string;
  contestId?: number | null;
}

export default function PredictionsLeaderboard({
  leaderboard,
  currentUserRank,
  isLoading,
  contestName,
  contestId,
}: PredictionsLeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  const filtered = leaderboard.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleShare = async () => {
    const contestTitle = contestName || 'مسابقة توقعات KoraNews';
    let text = `🏆 جدول الترتيب العام — ${contestTitle}\n\n`;
    text += `أقوى المتسابقين وأصحاب أعلى النقاط في توقعات المباريات:\n\n`;

    if (leaderboard.length > 0) {
      leaderboard.slice(0, 5).forEach((u) => {
        const badge = u.rank === 1 ? '🥇 المركز الأول' : u.rank === 2 ? '🥈 المركز الثاني' : u.rank === 3 ? '🥉 المركز الثالث' : `#${u.rank}`;
        text += `${badge}: ${u.name} — ${u.totalPoints} نقطة (${u.correctPredictions} توقع صحيح${u.goldenPredictions > 0 ? ` • 👑 ${u.goldenPredictions} ذهبية` : ''})\n`;
      });
    }

    if (currentUserRank && currentUserRank.rank > 0) {
      text += `\n🎯 ترتيبي في المسابقة: المركز #${currentUserRank.rank} برصيد ${currentUserRank.totalPoints} نقطة!\n`;
    }

    const shareUrl = `${window.location.origin}/predictions/leaderboard${contestId ? `?contestId=${contestId}` : ''}`;
    text += `\nشاهد الترتيب الكامل وتوقع نتائج المباريات الآن:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `جدول الترتيب العام - ${contestTitle}`,
          text,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard if user dismissed or unsupported
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        console.warn('Failed to copy leaderboard to clipboard:', e);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full overflow-hidden">
      {/* Search Header & Actions (Share & Current User Rank Indicator) */}
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

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {currentUserRank && currentUserRank.rank > 0 && !searchQuery && (
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              <span className="text-slate-400 font-medium">ترتيبك:</span>
              <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-lg font-black text-xs border border-blue-200/60 dark:border-blue-800/40">
                #{currentUserRank.rank}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="font-black text-slate-900 dark:text-white font-mono">
                {currentUserRank.totalPoints} <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
              </span>
            </div>
          )}

          {/* زر مشاركة الترتيب العام */}
          <button
            type="button"
            onClick={handleShare}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
            title="مشاركة الترتيب العام"
            aria-label="مشاركة الترتيب العام"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">تم النسخ</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>مشاركة الترتيب</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        /* Loading Skeleton */
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
          {/* Leaderboard Table / Cards List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 font-black text-[11px] uppercase border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5 w-24 text-center">المركز</th>
                    <th className="py-3.5 px-5">المتسابق</th>
                    <th className="py-3.5 px-5 text-center">التوقعات الصحيحة</th>
                    <th className="py-3.5 px-5 text-center">التوقعات الذهبية</th>
                    <th className="py-3.5 px-5 text-center">نسبة الدقة</th>
                    <th className="py-3.5 px-5 text-left">إجمالي النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((item) => {
                    const isRank1 = item.rank === 1;
                    const isRank2 = item.rank === 2;
                    const isRank3 = item.rank === 3;

                    // Row background & border highlight for top 3 and current user
                    let rowClasses = 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors';
                    if (isRank1) {
                      rowClasses = item.isCurrentUser
                        ? 'bg-amber-500/15 dark:bg-amber-500/20 border-r-4 border-r-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border-r-4 border-r-amber-500 hover:bg-amber-500/[0.12]';
                    } else if (isRank2) {
                      rowClasses = item.isCurrentUser
                        ? 'bg-slate-200/50 dark:bg-slate-800/70 border-r-4 border-r-slate-400 dark:border-r-slate-400 ring-1 ring-slate-400/30'
                        : 'bg-slate-200/40 dark:bg-slate-800/50 border-r-4 border-r-slate-400 dark:border-r-slate-400 hover:bg-slate-200/60';
                    } else if (isRank3) {
                      rowClasses = item.isCurrentUser
                        ? 'bg-orange-500/10 dark:bg-orange-950/35 border-r-4 border-r-amber-700 dark:border-r-amber-600 ring-1 ring-amber-700/30'
                        : 'bg-orange-500/[0.06] dark:bg-orange-950/[0.2] border-r-4 border-r-amber-700 dark:border-r-amber-600 hover:bg-orange-500/[0.1]';
                    } else if (item.isCurrentUser) {
                      rowClasses = 'bg-blue-50/60 dark:bg-blue-950/30 border-r-4 border-r-blue-600';
                    }

                    return (
                      <tr key={item.id} className={rowClasses}>
                        {/* Rank Column */}
                        <td className="py-3.5 px-5 text-center font-black">
                          {isRank1 ? (
                            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white font-mono text-xs shadow-xs font-black ring-2 ring-amber-300/80 dark:ring-amber-500/40">
                              <Crown className="w-3.5 h-3.5 text-white" />
                              <span>1</span>
                            </span>
                          ) : isRank2 ? (
                            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white font-mono text-xs shadow-xs font-black ring-2 ring-slate-200/80 dark:ring-slate-500/40">
                              <Medal className="w-3.5 h-3.5 text-white" />
                              <span>2</span>
                            </span>
                          ) : isRank3 ? (
                            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white font-mono text-xs shadow-xs font-black ring-2 ring-amber-600/50 dark:ring-amber-700/40">
                              <Award className="w-3.5 h-3.5 text-white" />
                              <span>3</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 text-xs font-mono font-bold">
                              {item.rank}
                            </span>
                          )}
                        </td>

                        {/* Contestant Name & Top 3 Badges */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border ${
                              isRank1
                                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 ring-2 ring-amber-300/60'
                                : isRank2
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 ring-2 ring-slate-300/60'
                                : isRank3
                                ? 'bg-orange-100 dark:bg-orange-950/60 border-amber-600/50 ring-2 ring-amber-600/40'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}>
                              {item.avatar ? (
                                <img
                                  src={item.avatar}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className={`w-full h-full flex items-center justify-center text-xs font-black ${
                                  isRank1 ? 'text-amber-700 dark:text-amber-300' : isRank2 ? 'text-slate-700 dark:text-slate-300' : isRank3 ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500'
                                }`}>
                                  {item.name.charAt(0)}
                                </span>
                              )}
                            </div>

                            <span
                              className={`font-extrabold truncate ${
                                isRank1
                                  ? 'text-amber-950 dark:text-amber-100 font-black'
                                  : isRank2
                                  ? 'text-slate-900 dark:text-white font-black'
                                  : isRank3
                                  ? 'text-amber-950 dark:text-amber-100 font-black'
                                  : item.isCurrentUser
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.name}
                            </span>

                            {/* Top 3 Distinct Badges */}
                            {isRank1 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400/20 to-yellow-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/60 dark:border-amber-500/50 shadow-2xs shrink-0">
                                <Crown className="w-3 h-3 text-amber-500 fill-amber-500/40" />
                                <span>المركز الأول</span>
                              </span>
                            )}

                            {isRank2 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-2xs shrink-0">
                                <Medal className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                <span>المركز الثاني</span>
                              </span>
                            )}

                            {isRank3 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-600/40 dark:border-amber-700/60 shadow-2xs shrink-0">
                                <Award className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                <span>المركز الثالث</span>
                              </span>
                            )}

                            {item.isCurrentUser && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black shrink-0">
                                أنت
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Correct Predictions */}
                        <td className="py-3.5 px-5 text-center font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {item.correctPredictions}
                        </td>

                        {/* Golden Predictions */}
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

                        {/* Accuracy */}
                        <td className="py-3.5 px-5 text-center font-bold text-slate-500 dark:text-slate-400 font-mono">
                          {item.successRate}%
                        </td>

                        {/* Total Points */}
                        <td className="py-3.5 px-5 text-left font-black text-sm font-mono">
                          <span className={
                            isRank1
                              ? 'text-amber-600 dark:text-amber-400 font-black text-base'
                              : isRank2
                              ? 'text-slate-800 dark:text-slate-200 font-black text-base'
                              : isRank3
                              ? 'text-amber-800 dark:text-amber-300 font-black text-base'
                              : 'text-slate-900 dark:text-white'
                          }>
                            {item.totalPoints}
                          </span>{' '}
                          <span className="text-[10px] text-slate-400 font-normal font-sans">نقطة</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Row List View (Zero Horizontal Overflow, Mobile-First) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => {
                const isRank1 = item.rank === 1;
                const isRank2 = item.rank === 2;
                const isRank3 = item.rank === 3;

                let mobileRowClass = 'p-3.5 flex flex-col gap-2 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30';
                if (isRank1) {
                  mobileRowClass = item.isCurrentUser
                    ? 'p-3.5 flex flex-col gap-2 transition-colors bg-amber-500/15 dark:bg-amber-500/20 border-r-4 border-r-amber-500 ring-1 ring-amber-500/30'
                    : 'p-3.5 flex flex-col gap-2 transition-colors bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border-r-4 border-r-amber-500';
                } else if (isRank2) {
                  mobileRowClass = item.isCurrentUser
                    ? 'p-3.5 flex flex-col gap-2 transition-colors bg-slate-200/50 dark:bg-slate-800/70 border-r-4 border-r-slate-400 ring-1 ring-slate-400/30'
                    : 'p-3.5 flex flex-col gap-2 transition-colors bg-slate-200/40 dark:bg-slate-800/50 border-r-4 border-r-slate-400';
                } else if (isRank3) {
                  mobileRowClass = item.isCurrentUser
                    ? 'p-3.5 flex flex-col gap-2 transition-colors bg-orange-500/10 dark:bg-orange-950/35 border-r-4 border-r-amber-700 ring-1 ring-amber-700/30'
                    : 'p-3.5 flex flex-col gap-2 transition-colors bg-orange-500/[0.06] dark:bg-orange-950/[0.2] border-r-4 border-r-amber-700';
                } else if (item.isCurrentUser) {
                  mobileRowClass = 'p-3.5 flex flex-col gap-2 transition-colors bg-blue-50/60 dark:bg-blue-950/30 border-r-3 border-r-blue-600';
                }

                return (
                  <div key={item.id} className={mobileRowClass}>
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Mobile Rank Badge */}
                        <span className="font-black text-xs font-mono w-6 shrink-0 text-center">
                          {isRank1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white font-black text-xs shadow-xs ring-1 ring-amber-300 dark:ring-amber-500/40">
                              1
                            </span>
                          ) : isRank2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white font-black text-xs shadow-xs ring-1 ring-slate-200 dark:ring-slate-500/40">
                              2
                            </span>
                          ) : isRank3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white font-black text-xs shadow-xs ring-1 ring-amber-600/40">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400 font-bold">{item.rank}</span>
                          )}
                        </span>

                        {/* Mobile Avatar */}
                        <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border ${
                          isRank1
                            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 ring-1 ring-amber-300'
                            : isRank2
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 ring-1 ring-slate-300'
                            : isRank3
                            ? 'bg-orange-100 dark:bg-orange-950/60 border-amber-600/50 ring-1 ring-amber-600/40'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className={`w-full h-full flex items-center justify-center text-xs font-black ${
                              isRank1 ? 'text-amber-700 dark:text-amber-300' : isRank2 ? 'text-slate-700 dark:text-slate-300' : isRank3 ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500'
                            }`}>
                              {item.name.charAt(0)}
                            </span>
                          )}
                        </div>

                        {/* Mobile Name & Badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-extrabold text-xs truncate max-w-[130px] ${
                                isRank1
                                  ? 'text-amber-950 dark:text-amber-100 font-black'
                                  : isRank2
                                  ? 'text-slate-900 dark:text-white font-black'
                                  : isRank3
                                  ? 'text-amber-950 dark:text-amber-100 font-black'
                                  : item.isCurrentUser
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.name}
                            </span>

                            {/* Mobile Top 3 Badges */}
                            {isRank1 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 shadow-2xs shrink-0">
                                <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500/40" />
                                <span>الأول</span>
                              </span>
                            )}

                            {isRank2 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-2xs shrink-0">
                                <Medal className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                                <span>الثاني</span>
                              </span>
                            )}

                            {isRank3 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-orange-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-600/40 dark:border-amber-700/60 shadow-2xs shrink-0">
                                <Award className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                                <span>الثالث</span>
                              </span>
                            )}

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

                      {/* Mobile Total Points */}
                      <div className="shrink-0 text-left">
                        <span className={`text-sm font-black font-mono ${
                          isRank1
                            ? 'text-amber-600 dark:text-amber-400'
                            : isRank2
                            ? 'text-slate-800 dark:text-slate-200'
                            : isRank3
                            ? 'text-amber-800 dark:text-amber-300'
                            : 'text-slate-900 dark:text-white'
                        }`}>
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
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

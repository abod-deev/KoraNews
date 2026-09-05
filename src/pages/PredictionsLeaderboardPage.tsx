import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import {
  Trophy,
  RotateCw,
  Target,
  ChevronLeft,
  Crown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import PredictionsLeaderboard, { LeaderboardUser } from '../components/predictions/PredictionsLeaderboard';

export default function PredictionsLeaderboardPage() {
  useSEO(
    'ترتيب التوقعات',
    'جدول الترتيب العام للمتسابقين وأصحاب أعلى النقاط في مسابقة توقعات KoraNews'
  );
  const { token } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/predictions/leaderboard', { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setCurrentUserRank(data.currentUserRank || null);
      } else {
        setError('تعذر تحميل بيانات ترتيب المتسابقين حالياً. يرجى المحاولة مرة أخرى.');
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
      setError('حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك وإعادة المحاولة.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header, Breadcrumb, and Actions */}
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
              <span className="text-slate-900 dark:text-white font-extrabold">
                ترتيب التوقعات
              </span>
            </nav>

            {/* Clear Title */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  ترتيب التوقعات
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  الترتيب التراكمي للمتسابقين وتوزيع النقاط المكتسبة من التوقعات الصحيحة للمباريات.
                </p>
              </div>
            </div>
          </div>

          {/* Actions: تحديث، الانتقال للترتيب الذهبي، العودة للمسابقة */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* العودة للمسابقة */}
            <Link
              to="/predictions"
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>العودة للمسابقة</span>
            </Link>

            {/* الانتقال للترتيب الذهبي */}
            <Link
              to="/predictions/golden"
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-2xs"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>الترتيب الذهبي</span>
            </Link>

            {/* تحديث */}
            <button
              type="button"
              onClick={() => fetchLeaderboard(true)}
              disabled={isRefreshing || isLoading}
              className="min-h-[44px] min-w-[44px] p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="تحديث جدول الترتيب"
              aria-label="تحديث جدول الترتيب"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error State if fetch fails */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                تعذر تحميل الترتيب
              </h4>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 font-medium mt-0.5">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchLeaderboard(false)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* 2. Main Leaderboard Component */}
      <PredictionsLeaderboard
        leaderboard={leaderboard}
        currentUserRank={currentUserRank}
        isLoading={isLoading}
      />
    </div>
  );
}

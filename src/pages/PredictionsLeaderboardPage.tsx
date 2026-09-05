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
} from 'lucide-react';
import PredictionsLeaderboard, { LeaderboardUser } from '../components/predictions/PredictionsLeaderboard';

export default function PredictionsLeaderboardPage() {
  useSEO(
    'لائحة متصدري التوقعات',
    'جدول الترتيب العام للمتسابقين وأصحاب أعلى النقاط في مسابقة توقعات KoraNews'
  );
  const { token } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeaderboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/predictions/leaderboard', { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setCurrentUserRank(data.currentUserRank || null);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* 1. Header & Navigation Back */}
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
            <span className="text-slate-900 dark:text-white font-extrabold">
              جدول الترتيب العام
            </span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <span>لائحة متصدري التوقعات</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            الترتيب التراكمي لجميع المتسابقين وتوزيع النقاط المكتسبة من التوقعات الصحيحة للمباريات.
          </p>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            to="/predictions/golden"
            className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 text-xs font-black flex items-center gap-1.5 hover:bg-amber-100 transition-colors shadow-2xs"
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span>الترتيب الذهبي</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchLeaderboard(true)}
            disabled={isRefreshing || isLoading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="تحديث جدول الترتيب"
            aria-label="تحديث جدول الترتيب"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
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

      {/* 2. Main Leaderboard Component */}
      <PredictionsLeaderboard
        leaderboard={leaderboard}
        currentUserRank={currentUserRank}
        isLoading={isLoading}
      />
    </div>
  );
}

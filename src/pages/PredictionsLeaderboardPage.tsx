import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import {
  Trophy,
  ArrowRight,
  Sparkles,
  RotateCw,
  Award,
  Target,
  ChevronLeft,
} from 'lucide-react';
import PredictionsLeaderboard, { LeaderboardUser } from '../components/predictions/PredictionsLeaderboard';

export default function PredictionsLeaderboardPage() {
  useSEO('لائحة متصدري التوقعات', 'جدول الترتيب العام للمتسابقين وأصحاب أعلى النقاط في مسابقة توقعات KoraNews');
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Header & Navigation Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/predictions" className="hover:text-brand transition-colors flex items-center gap-1">
              <span>مسابقة التوقعات</span>
              <ChevronLeft className="w-3 h-3" />
            </Link>
            <span className="text-gray-900 dark:text-white">لائحة المتصدرين</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-brand" />
            <span>لائحة متصدري مسابقة التوقعات</span>
          </h1>
          <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
            الترتيب العام للمشاركين وتوزيع النقاط المكتسبة من التوقعات الصحيحة (+2 نقطة لكل توقع دقيق).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchLeaderboard(true)}
            disabled={isRefreshing || isLoading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="تحديث جدول الترتيب"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
            <span className="hidden sm:inline">تحديث الترتيب</span>
          </button>

          <Link
            to="/predictions"
            className="px-4 py-2.5 rounded-xl bg-brand text-white text-xs sm:text-sm font-black flex items-center gap-1.5 hover:bg-emerald-600 shadow-2xs transition-all cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>توقع المباريات الآن</span>
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

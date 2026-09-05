import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  Activity,
  Laptop,
  ExternalLink,
  RefreshCw,
  Trophy,
  Target,
  Calendar,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  ChevronLeft,
  ArrowUpRight,
  Flame,
  Radio,
  FileEdit,
  UserCheck
} from 'lucide-react';
import { GA_MEASUREMENT_ID } from '../../../services/analytics';
import { getSystemTodayStr } from '../../../utils/systemDateUtils';
import { translateTeamName } from '../../../utils/teamTranslations';

interface AdminStats {
  newsCount: number;
  publishedCount: number;
  draftsCount: number;
  usersCount: number;
  adminsCount: number;
  latestNews: Array<{
    id: number;
    title: string;
    status: string;
    isFeatured?: boolean;
    isBreaking?: boolean;
    createdAt: string;
    author: { name: string } | null;
    category: { name: string } | null;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    targetType: string;
    targetId: number | null;
    details: string | null;
    createdAt: string;
    user: { name: string } | null;
  }>;
}

interface ActiveContestInfo {
  id: number;
  name: string;
  status: 'active' | 'completed' | 'draft';
  description?: string;
  participantsCount: number;
  matchesCount: number;
  startDate?: string;
  endDate?: string;
}

interface PredictionStatsInfo {
  totalMatches: number;
  evaluatedMatches: number;
  activeMatches: number;
  totalPredictions: number;
  correctPredictions: number;
  goldenPredictionsCount: number;
  totalPointsDistributed: number;
  goldenPointsDistributed: number;
  successRate: number;
}

interface MatchItem {
  id: number;
  homeTeam: { name: string; crest?: string; id?: number };
  awayTeam: { name: string; crest?: string; id?: number };
  utcDate: string;
  status: string;
  score?: { fullTime?: { home: number | null; away: number | null } };
  league?: { name?: string; id?: number; emblem?: string };
}

interface AdminOverviewProps {
  token: string | null;
  onNavigateTab?: (tab: 'overview' | 'news' | 'predictions_contests' | 'predictions_matches' | 'predictions_participants' | 'users' | 'logs') => void;
  isSuperAdmin?: boolean;
}

export default function AdminOverview({ token, onNavigateTab, isSuperAdmin }: AdminOverviewProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeContest, setActiveContest] = useState<ActiveContestInfo | null>(null);
  const [predictionStats, setPredictionStats] = useState<PredictionStatsInfo | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [hasError, setHasError] = useState(false);

  const fetchAllData = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setHasError(false);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const results = await Promise.allSettled([
        // 1. General Admin Stats & Recent Activities
        fetch('/api/admin/stats', { headers }).then((res) => (res.ok ? res.json() : Promise.reject(res))),
        // 2. Active Predictions Contest
        fetch('/api/admin/predictions/active-contest', { headers }).then((res) => (res.ok ? res.json() : Promise.reject(res))),
        // 3. Admin Predictions Stats
        fetch('/api/admin/predictions/stats', { headers }).then((res) => (res.ok ? res.json() : Promise.reject(res))),
        // 4. Matches for Today & Schedule
        fetch('/api/matches').then((res) => (res.ok ? res.json() : Promise.reject(res))),
      ]);

      // Handle Admin Stats
      if (results[0].status === 'fulfilled' && results[0].value) {
        setStats(results[0].value);
      }

      // Handle Active Contest
      if (results[1].status === 'fulfilled' && results[1].value) {
        setActiveContest(results[1].value.activeContest || null);
      }

      // Handle Prediction Stats
      if (results[2].status === 'fulfilled' && results[2].value) {
        setPredictionStats(results[2].value);
      }

      // Handle Matches
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) {
        setMatches(results[3].value.slice(0, 8));
      }

      setLastRefreshedAt(new Date());
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token, fetchAllData]);

  // Format relative time helper
  const getRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short' }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Translate activity action
  const formatActionName = (action: string) => {
    const actionMap: Record<string, string> = {
      create_news: 'نشر خبر جديد',
      update_news: 'تحديث خبر',
      delete_news: 'حذف خبر',
      create_category: 'إضافة تصنيف',
      update_user: 'تعديل صلاحية مستخدم',
      delete_user: 'حذف مستخدم',
      evaluate_prediction: 'احتساب نتيجة توقع',
      create_contest: 'إنشاء مسابقة',
      update_contest: 'تحديث مسابقة',
      sync_matches: 'مزامنة المباريات',
    };
    return actionMap[action] || action.replace(/_/g, ' ');
  };

  // Match Status Label Helper
  const getMatchStatusBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    if (st === 'IN_PLAY' || st === 'LIVE' || st === 'PAUSED') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-900/60 animate-pulse"><Radio className="w-3 h-3" /> مباشر</span>;
    }
    if (st === 'FINISHED' || st === 'FT') {
      return <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">انتهت</span>;
    }
    return <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">مجدولة</span>;
  };

  // Filter today's matches
  const todayStr = getSystemTodayStr();
  const todayMatches = matches.filter((m) => m.utcDate && m.utcDate.startsWith(todayStr));

  // Skeleton loading view
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-24 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl w-full" />
        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl" />
          ))}
        </div>
        {/* Quick actions skeleton */}
        <div className="h-32 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl" />
        {/* 2-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl" />
          <div className="h-80 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header & Live System Status */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">نظام التشغيل نشط</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                آخر تحديث: {lastRefreshedAt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              لوحة التحكم الرئيسية
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-normal">
              مركز العمليات المؤسساتي الموحد لمنصة <strong className="font-semibold text-slate-800 dark:text-slate-200">KoraNews</strong>، لمتابعة مؤشرات المحتوى، مباريات كرة القدم، ونتائج مسابقة التوقعات التفاعلية.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={() => fetchAllData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all border border-slate-200/60 dark:border-slate-700/60 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث المؤشرات</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
            >
              <span>معاينة الموقع</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {hasError && (
          <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            تعذر تحديث بعض المؤشرات الحالية تلقائياً. يمكنك النقر على زر التحديث لإعادة المحاولة.
          </div>
        )}
      </div>

      {/* 2. Core Operational KPI Cards (Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        
        {/* Card 1: News Count */}
        <div 
          onClick={() => onNavigateTab?.('news')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              المحتوى الإخباري
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats?.newsCount ?? 0}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats?.publishedCount ?? 0}</span> منشور • {stats?.draftsCount ?? 0} مسودة
            </div>
          </div>
        </div>

        {/* Card 2: Users Count */}
        <div 
          onClick={() => isSuperAdmin && onNavigateTab?.('users')}
          className={`group bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 transition-all shadow-xs flex flex-col justify-between ${
            isSuperAdmin ? 'cursor-pointer hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:shadow-sm' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              المستخدمون
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats?.usersCount ?? 0}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              <span className="text-blue-600 dark:text-blue-400 font-bold">{stats?.adminsCount ?? 0}</span> مسؤولين بالنظام
            </div>
          </div>
        </div>

        {/* Card 3: Active Contest */}
        <div 
          onClick={() => onNavigateTab?.('predictions_contests')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
              المسابقة النشطة
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate" title={activeContest?.name || 'لا توجد مسابقة'}>
              {activeContest ? activeContest.name : 'غير محددة'}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {activeContest ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold">{activeContest.participantsCount} مشارك مسجل</span>
              ) : (
                'انقر لتهيئة مسابقة'
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Prediction Matches */}
        <div 
          onClick={() => onNavigateTab?.('predictions_matches')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/60 dark:hover:border-purple-500/60 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              مباريات التوقع
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {predictionStats?.totalMatches ?? activeContest?.matchesCount ?? 0}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              <span className="text-purple-600 dark:text-purple-400 font-bold">{predictionStats?.evaluatedMatches ?? 0}</span> محسوبة ومعتمدة
            </div>
          </div>
        </div>

        {/* Card 5: Total Predictions */}
        <div 
          onClick={() => onNavigateTab?.('predictions_participants')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-rose-500/60 dark:hover:border-rose-500/60 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              إجمالي التوقعات
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {predictionStats?.totalPredictions ?? 0}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              دقة: <span className="text-rose-600 dark:text-rose-400 font-bold">{predictionStats?.successRate ?? 0}%</span> • {predictionStats?.correctPredictions ?? 0} صحيح
            </div>
          </div>
        </div>

        {/* Card 6: Scheduled Matches */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              مباريات الكرة
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {matches.length}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{todayMatches.length}</span> مباراة مسجلة اليوم
            </div>
          </div>
        </div>

      </div>

      {/* 3. Quick Administrative Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              العمليات والإجراءات السريعة
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              الوصول الفوري لأهم أقسام الإدارة والتحرير وإعدادات المسابقات
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigateTab?.('news')}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 text-right transition-all flex flex-col justify-between group min-h-[90px]"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                إدارة الأخبار
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">إضافة وتعديل المقالات</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab?.('predictions_contests')}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-800 text-right transition-all flex flex-col justify-between group min-h-[90px]"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                إعدادات المسابقات
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">الجوائز ونظام النقاط</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab?.('predictions_matches')}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-800 text-right transition-all flex flex-col justify-between group min-h-[90px]"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                مباريات التوقع
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">جدولة واحتساب النتائج</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab?.('predictions_participants')}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 text-right transition-all flex flex-col justify-between group min-h-[90px]"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                المشاركون بالمسابقة
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">مراجعة طلبات الانضمام</div>
            </div>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => onNavigateTab?.('users')}
              className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-800 text-right transition-all flex flex-col justify-between group min-h-[90px]"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  إدارة المستخدمين
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">الصلاحيات والوصول</div>
              </div>
            </button>
          )}

          <button
            onClick={() => onNavigateTab?.('logs')}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-right transition-all flex flex-col justify-between group min-h-[90px]"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                سجل العمليات
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">تتبع أحداث وتغييرات النظام</div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Active Contest & Predictions Dedicated Section */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                حالة المسابقة الرياضية الحالية والتوقعات
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                متابعة مباشرة لأداء المسابقة التنافسية وتفاعل المشاركين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/predictions/leaderboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              لوحة المتصدرين العامة
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {activeContest ? (
          <div className="mt-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <div className="flex items-center gap-2.5">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">{activeContest.name}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    activeContest.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {activeContest.status === 'active' ? 'مسابقة جارية' : activeContest.status}
                  </span>
                </div>
                {activeContest.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                    {activeContest.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onNavigateTab?.('predictions_matches')}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5" />
                  جدولة المباريات
                </button>
                <button
                  onClick={() => onNavigateTab?.('predictions_contests')}
                  className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                >
                  إعدادات المسابقة
                </button>
              </div>
            </div>

            {/* Micro stats for active contest */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-right">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">المشاركون المعتمدون</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {activeContest.participantsCount || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-right">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مباريات المسابقة</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {predictionStats?.totalMatches ?? activeContest.matchesCount ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-right">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">النقاط الموزعة</div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {predictionStats?.totalPointsDistributed ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-right">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">النقاط الذهبية</div>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {predictionStats?.goldenPointsDistributed ?? 0}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 text-center py-8 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <Trophy className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">لا توجد مسابقة توقعات نشطة حالياً</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              يمكنك تهيئة وتفعيل مسابقة جديدة لتسمح للمستخدمين بتسجيل توقعاتهم والمنافسة على جوائز المتصدرين.
            </p>
            <button
              onClick={() => onNavigateTab?.('predictions_contests')}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4" />
              الانتقال لإعدادات المسابقات
            </button>
          </div>
        )}
      </div>

      {/* 5. Two-Column Operational Layout: Latest News & Scheduled Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Latest News */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                أحدث الأخبار والمقالات
              </h3>
              <button
                onClick={() => onNavigateTab?.('news')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {stats?.latestNews && stats.latestNews.length > 0 ? (
                stats.latestNews.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.category?.name && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                            {item.category.name}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.status === 'published'
                            ? 'text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/60'
                            : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
                        }`}>
                          {item.status === 'published' ? 'منشور' : 'مسودة'}
                        </span>
                        {item.isBreaking && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                            عاجل
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </h4>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>بواسطة: {item.author?.name || 'محرر KoraNews'}</span>
                        <span>•</span>
                        <span>{getRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <Link
                      to={`/news/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors shrink-0"
                      title="معاينة المقال"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  لا توجد أخبار مسجلة في النظام حتى الآن.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab?.('news')}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
            >
              فتح محرر الأخبار وإضافة مقال جديد
            </button>
          </div>
        </div>

        {/* Right Column: Scheduled Matches */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                مباريات كرة القدم (اليوم والبطولات)
              </h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {matches.length} مباراة مسجلة
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {matches.length > 0 ? (
                matches.slice(0, 5).map((match) => (
                  <div
                    key={match.id}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Home Team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-right">
                        {translateTeamName(match.homeTeam?.name || 'الفريق المضيف')}
                      </span>
                      {match.homeTeam?.crest ? (
                        <img src={match.homeTeam.crest} alt="" className="w-5 h-5 object-contain shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                      )}
                    </div>

                    {/* Score or Status */}
                    <div className="flex flex-col items-center justify-center px-2 shrink-0 min-w-[70px]">
                      {match.score?.fullTime?.home !== null && match.score?.fullTime?.home !== undefined ? (
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {match.score.fullTime.home} - {match.score.fullTime.away}
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {new Date(match.utcDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <div className="mt-0.5">
                        {getMatchStatusBadge(match.status)}
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                      {match.awayTeam?.crest ? (
                        <img src={match.awayTeam.crest} alt="" className="w-5 h-5 object-contain shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                      )}
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-left">
                        {translateTeamName(match.awayTeam?.name || 'الفريق الضيف')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  لا توجد مباريات مسجلة حالياً في قاعدة البيانات.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab?.('predictions_matches')}
              className="w-full py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors"
            >
              ربط وتعيين مباريات لمسابقة التوقعات
            </button>
          </div>
        </div>

      </div>

      {/* 6. System Activity & Google Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Recent Activity Logs */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                سجل نشاطات النظام الأخيرة
              </h3>
              <button
                onClick={() => onNavigateTab?.('logs')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>فتح السجل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {formatActionName(log.action)}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {getRelativeTime(log.createdAt)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        بواسطة: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.user?.name || 'مستخدم النظام'}</span>
                        {log.details && ` • ${log.details}`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  لا توجد أنشطة إدارية مسجلة حديثاً.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
            <span className="text-[11px] text-slate-400 font-medium">
              يتم حفظ كافة عمليات التحرير والاحتساب تلقائياً للأمان والتدقيق.
            </span>
          </div>
        </div>

        {/* Right: Google Analytics Integration */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  تحليلات Google Analytics للزوار
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  رصد الزيارات الحية ومعدل قراءة الأخبار والتفاعل
                </p>
              </div>
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors"
              >
                فتح Analytics
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">الجلسات الفريدة</div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">تتبع تلقائي</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">قراءة الأخبار</div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">أحداث مخصصة</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">أجهزة الزوار</div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">هواتف وحواسيب</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {GA_MEASUREMENT_ID ? (
                <span>المعرف النشط: <strong className="font-mono text-slate-800 dark:text-slate-200">{GA_MEASUREMENT_ID}</strong></span>
              ) : (
                <span>معرف القياس: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">VITE_GA_MEASUREMENT_ID</code></span>
              )}
            </span>
            <span className="text-[11px] text-slate-400">يتم إرسال الأحداث عند كل تنقل وصفحة</span>
          </div>
        </div>

      </div>

    </div>
  );
}


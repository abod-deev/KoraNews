import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Award,
  AlertCircle,
  HelpCircle,
  LogIn,
  ChevronLeft,
  RotateCw,
  Target,
  Medal,
  Calendar,
  UserCheck,
  Send,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Crown,
  Shield,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PredictionMatchCard from '../components/predictions/PredictionMatchCard';
import MyPredictionsList, { MyPredictionItem } from '../components/predictions/MyPredictionsList';
import PredictionsLeaderboard, { LeaderboardUser } from '../components/predictions/PredictionsLeaderboard';
import { PredictionMatchInfo } from '../services/predictionService';
import { getContestPermissions } from '../utils/contestPermissions';

export default function Predictions() {
  useSEO('توقعات المباريات', 'توقع نتائج المباريات العالمية واكسب النقاط وتصدر قائمة الترتيب في KoraNews');
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'matches' | 'my_predictions' | 'leaderboard'>('matches');
  const [matchFilter, setMatchFilter] = useState<'all' | 'open' | 'finished'>('open');

  // Data states
  const [predictionMatches, setPredictionMatches] = useState<PredictionMatchInfo[]>([]);
  const [myPredictions, setMyPredictions] = useState<MyPredictionItem[]>([]);
  const [stats, setStats] = useState<{
    totalPoints: number;
    totalPredictions: number;
    correctPredictions: number;
    wrongPredictions: number;
    pendingPredictions: number;
    successRate: number;
    userRank: number;
    goldenPredictions?: number;
    goldenPoints?: number;
    goldenRank?: number;
  } | null>(null);

  const [contestSettings, setContestSettings] = useState<any>(null);
  const [participationStatus, setParticipationStatus] = useState<{
    status: 'not_registered' | 'pending' | 'approved' | 'rejected' | 'blocked';
    appliedAt?: string;
    reviewedAt?: string;
    notes?: string;
  }>({ status: 'not_registered' });

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyNotes, setApplyNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch contest settings
  const fetchContestSettings = async () => {
    try {
      const res = await fetch('/api/predictions/contest/settings');
      if (res.ok) {
        setContestSettings(await res.json());
      }
    } catch (e) {}
  };

  // Fetch participation status
  const fetchParticipationStatus = async () => {
    if (!token) {
      setParticipationStatus({ status: 'not_registered' });
      return;
    }
    try {
      const res = await fetch('/api/predictions/contest/my-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setParticipationStatus(await res.json());
      }
    } catch (e) {}
  };

  // Fetch all prediction matches
  const fetchMatches = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/predictions', { headers });
      if (res.ok) {
        const data = await res.json();
        setPredictionMatches(data);
      }
    } catch (e) {
      console.error('Failed to fetch prediction matches:', e);
    }
  };

  // Fetch user history
  const fetchMyHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/predictions/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyPredictions(data);
      }
    } catch (e) {
      console.error('Failed to fetch my predictions:', e);
    }
  };

  // Fetch user stats
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/predictions/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
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
    }
  };

  const loadAllData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);

    await Promise.all([
      fetchContestSettings(),
      fetchMatches(),
      token ? fetchParticipationStatus() : Promise.resolve(),
      token ? fetchMyHistory() : Promise.resolve(),
      token ? fetchStats() : Promise.resolve(),
      fetchLeaderboard(),
    ]);

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadAllData(true);
  }, [token]);

  // Handle contest registration request
  const handleApplyContest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }

    setIsApplying(true);
    try {
      const res = await fetch('/api/predictions/contest/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: applyNotes }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'فشل في إرسال طلب الاشتراك');
        await loadAllData(false);
      } else {
        showToast('success', data.message || 'تم إرسال طلب اشتراكك في المسابقة بنجاح');
        setApplyModalOpen(false);
        await loadAllData(false);
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsApplying(false);
    }
  };

  // Handle saving prediction
  const handleSavePrediction = async (
    predictionMatchId: number,
    homeScore: number,
    awayScore: number
  ): Promise<boolean> => {
    if (!token) {
      navigate('/login');
      return false;
    }

    if (contestStatus !== 'active') {
      showToast('error', 'انتهت المسابقة، لم يعد بإمكانك تنفيذ هذا الإجراء.');
      await loadAllData(false);
      return false;
    }

    if (participationStatus.status !== 'approved') {
      showToast('error', 'يجب أن يكون اشتراكك في المسابقة معتمداً من الإدارة لتسجيل التوقعات');
      return false;
    }

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionMatchId,
          homeScore,
          awayScore,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'فشل في حفظ التوقع';
        showToast('error', errorMsg);
        // Refresh all data if contest or match status changed on server
        await loadAllData(false);
        return false;
      }

      showToast('success', data.message || 'تم حفظ توقعك بنجاح');
      // Refresh matches and user state
      fetchMatches();
      fetchMyHistory();
      fetchStats();
      fetchLeaderboard();
      return true;
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ في الاتصال');
      return false;
    }
  };

  const openMatches = predictionMatches.filter((p) => p.isOpenForPrediction || p.matchState === 'open');
  const finishedMatches = predictionMatches.filter(
    (p) => p.matchState === 'calculated' || p.matchState === 'pending_admin' || p.matchState === 'live' || p.match.status === 'FINISHED'
  );

  const displayedMatches =
    matchFilter === 'open'
      ? openMatches
      : matchFilter === 'finished'
      ? finishedMatches
      : predictionMatches;

  const contestPerms = getContestPermissions(contestSettings, user, participationStatus);
  const { contestStatus, canParticipate, canPredict, isParticipant } = contestPerms;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 py-6 sm:py-8 px-3 sm:px-6 lg:px-8 dir-rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. Header Banner & Title */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-emerald-700 to-teal-900 text-white p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-black">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>{contestSettings?.name || 'مسابقة توقعات KoraNews'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                  {contestStatus === 'active' ? 'مسابقة نشطة' : contestStatus === 'completed' ? 'انتهت المسابقة' : 'لا توجد مسابقة'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                توقعات نتائج المباريات
              </h1>
              <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed font-bold">
                {contestSettings?.description ||
                  'توقع النتيجة النهائية الدقيقة لأقوى مباريات اليوم والغد. احصل على نقاط التوقع الصحيح لكل مباراة وتنافس على صدارة الترتيب العام والتوقعات الذهبية!'}
              </p>
            </div>

            {/* Quick Refresh Button & Active Matches Counter */}
            <div className="flex items-center gap-3 self-start md:self-center">
              <Link
                to="/predictions/leaderboard"
                className="px-4 py-2.5 rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Trophy className="w-4 h-4" />
                <span>جدول الترتيب</span>
              </Link>

              <button
                onClick={() => loadAllData(false)}
                disabled={isRefreshing}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15 cursor-pointer disabled:opacity-50"
                title="تحديث البيانات"
                aria-label="تحديث"
              >
                <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Contest Details Strip */}
          {contestStatus !== 'none' && (
            <div className="relative z-10 mt-5 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-emerald-100 font-bold">الحالة</div>
                  <div className="font-black text-white">{contestStatus === 'active' ? 'نشطة' : 'انتهت المسابقة'}</div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-emerald-100 font-bold">المشاركون</div>
                  <div className="font-black text-white">{contestSettings?.participantsCount ?? leaderboard.length} متسابق</div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-emerald-100 font-bold">مباريات التوقع</div>
                  <div className="font-black text-white">{predictionMatches.length} مباراة</div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-emerald-100 font-bold">النقاط</div>
                  <div className="font-black text-white">{user && stats ? `${stats.totalPoints} نقطة` : 'حسب المباراة'}</div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 flex items-center gap-2 col-span-2 sm:col-span-1">
                <Medal className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-emerald-100 font-bold">الترتيب</div>
                  <div className="font-black text-white">{user && stats?.userRank ? `#${stats.userRank}` : 'جدول المتصدرين'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Decorative background glow */}
          <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-10 -top-10 w-60 h-60 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* 2. Participation / Contest Status Banner */}
        {contestStatus === 'none' ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  لا توجد مسابقة حالية
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-bold">
                  ستظهر المسابقة هنا عند إنشائها من الإدارة.
                </p>
              </div>
            </div>
          </div>
        ) : contestStatus === 'completed' ? (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-3xl p-5 sm:p-6 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-200">
                    انتهت المسابقة
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] font-black">
                    مكتملة
                  </span>
                </div>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5 font-bold">
                  انتهت المسابقة - تم حساب كافة النقاط وإعلان النتائج والترتيب النهائي للمشاركين.
                </p>
              </div>
            </div>
          </div>
        ) : !user ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  سجل دخولك أو أنشئ حسابك للمشاركة في مسابقة التوقعات!
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-bold">
                  المشاركة مجانية ومتاحة لجميع أعضاء KoraNews المعتمدين.
                </p>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand text-white font-black text-xs sm:text-sm hover:bg-emerald-600 transition-all shadow-xs text-center shrink-0"
            >
              تسجيل الدخول / إنشاء حساب
            </Link>
          </div>
        ) : canParticipate ? (
          <div className="bg-gradient-to-r from-amber-500/10 via-brand/10 to-teal-500/10 border-2 border-amber-400/40 dark:border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    لم تشترك في مسابقة التوقعات بعد
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black">
                    تسجيل مفتوح
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-bold">
                  اضغط على زر الاشتراك لتقديم طلب الانضمام للمسابقة وبدء توقع النتائج فوراً.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setApplyModalOpen(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand text-white font-black text-xs sm:text-sm hover:bg-emerald-600 transition-all shadow-xs text-center shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>طلب الاشتراك في المسابقة</span>
            </button>
          </div>
        ) : participationStatus.status === 'pending' ? (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                  طلب اشتراكك قيد المراجعة والاعتماد من قبل الإدارة
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-black">
                  قيد المراجعة
                </span>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 font-bold mt-0.5">
                تم استلام طلبك بنجاح. ستتمكن من تسجيل توقعات المباريات بمجرد قيام الأدمن باعتماد حسابك.
              </p>
            </div>
          </div>
        ) : participationStatus.status === 'rejected' ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-400/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                  تم رفض طلب اشتراكك في المسابقة
                </h4>
                <p className="text-xs text-rose-700/80 dark:text-rose-300/80 font-bold mt-0.5">
                  {participationStatus.notes || 'يمكنك إعادة تقديم الطلب أو التواصل مع الإدارة لمزيد من التفاصيل.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setApplyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-700 transition-colors"
            >
              إعادة تقديم طلب الاشتراك
            </button>
          </div>
        ) : participationStatus.status === 'blocked' ? (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700/60 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-400/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-red-900 dark:text-red-200">
                حسابك محظور من المشاركة في مسابقة التوقعات
              </h4>
              <p className="text-xs text-red-700/80 dark:text-red-300/80 font-bold mt-0.5">
                يرجى مراجعة إدارة الموقع في حال كان هناك أي استفسار.
              </p>
            </div>
          </div>
        ) : null}

        {/* 3. Approved User Stats Dashboard */}
        {user && isParticipant && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Total Points */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[11px] mb-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>إجمالي النقاط</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
                {stats.totalPoints}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 font-bold">الرصيد الكلي</div>
            </div>

            {/* 2. Total Predictions */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-1.5 text-blue-500 font-bold text-[11px] mb-1">
                <Target className="w-3.5 h-3.5" />
                <span>عدد التوقعات</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
                {stats.totalPredictions}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 font-bold">مباراة متوقعة</div>
            </div>

            {/* 3. Correct Predictions */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[11px] mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>التوقعات الصحيحة</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {stats.correctPredictions}
              </div>
              <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-bold">
                نتيجة دقيقة
              </div>
            </div>

            {/* 4. Golden Predictions */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-b from-amber-500/5 to-transparent shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>عدد الذهبيات</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {stats.goldenPredictions}
              </div>
              <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1 font-bold">توقع منفرد 👑</div>
            </div>

            {/* 5. Golden Points */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-b from-amber-500/5 to-transparent shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] mb-1">
                <Crown className="w-3.5 h-3.5" />
                <span>نقاط الذهبيات</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {stats.goldenPoints}
              </div>
              <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1 font-bold">+1 لكُل ذهبية</div>
            </div>

            {/* 6. Success Rate */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-1.5 text-purple-500 font-bold text-[11px] mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>نسبة النجاح</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {stats.successRate}%
              </div>
              <div className="text-[10px] text-gray-400 mt-1 font-bold">معدل الإصابة</div>
            </div>

            {/* 7. General Rank */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-1.5 text-brand font-bold text-[11px] mb-1">
                <Medal className="w-3.5 h-3.5" />
                <span>الترتيب العام</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-brand font-mono">
                #{stats.userRank || '-'}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 font-bold">حسب النقاط</div>
            </div>

            {/* 8. Golden Rank */}
            <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-amber-400/80 dark:border-amber-600/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] mb-1">
                <Crown className="w-3.5 h-3.5" />
                <span>ترتيب الذهبيات</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                #{stats.goldenRank || '-'}
              </div>
              <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1 font-bold">حسب الذهبيات</div>
            </div>
          </div>
        )}

        {/* 4. Simple Rules Summary Bar */}
        <div className="bg-white/80 dark:bg-gray-900/80 rounded-2xl p-3.5 sm:p-4 border border-gray-200/70 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-black text-gray-800 dark:text-gray-200">
            <HelpCircle className="w-4 h-4 text-brand" />
            <span>نظام النقاط والقواعد:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-gray-600 dark:text-gray-300 font-bold text-[11px] sm:text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              التوقع الصحيح = <strong>نقاط المباراة المقررة (حسب البطاقة)</strong>
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              التوقع الذهبي المنفرد = <strong>+1 نقطة ذهبية إضافية 👑</strong>
            </span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Clock className="w-3.5 h-3.5" />
              مهلة تعديل التوقع = <strong>دقيقة واحدة فقط</strong>
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <XCircle className="w-3.5 h-3.5 text-gray-400" />
              توقع خاطئ = <strong>0 نقطة</strong>
            </span>
          </div>

          <Link
            to="/predictions/golden"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-black hover:bg-amber-500/20 transition-all text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>صفحة التوقعات الذهبية 👑</span>
          </Link>
        </div>

        {/* 5. Navigation Main Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {[
              {
                id: 'matches',
                label: 'مباريات التوقعات',
                badge: openMatches.length > 0 ? openMatches.length : undefined,
                icon: Sparkles,
              },
              {
                id: 'my_predictions',
                label: 'توقعاتي وسجلي',
                badge: myPredictions.length > 0 ? myPredictions.length : undefined,
                icon: Target,
              },
              {
                id: 'leaderboard',
                label: 'لائحة المتصدرين',
                icon: Trophy,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                    active
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-filters for matches tab */}
          {activeTab === 'matches' && (
            <div className="flex items-center bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMatchFilter('open')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  matchFilter === 'open'
                    ? 'bg-brand text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                المتاحة للتوقع ({openMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setMatchFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  matchFilter === 'all'
                    ? 'bg-brand text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                الكل ({predictionMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setMatchFilter('finished')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  matchFilter === 'finished'
                    ? 'bg-brand text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                المباشرة والمنتهية ({finishedMatches.length})
              </button>
            </div>
          )}
        </div>

        {/* 6. Tab Contents */}
        <div>
          {/* TAB 1: MATCHES */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-56 bg-gray-100 dark:bg-gray-800/60 rounded-3xl animate-pulse border border-gray-200/60 dark:border-gray-800"
                    />
                  ))}
                </div>
              ) : displayedMatches.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {matchFilter === 'open'
                      ? 'لا توجد مباريات مفتوحة للتوقع حالياً'
                      : 'لا توجد مباريات في هذه القائمة'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                    سيقوم مسؤولو الموقع بإضافة مباريات الجولة القادمة لمسابقات اليوم والغد. تابعنا باستمرار!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedMatches.map((pm) => (
                    <PredictionMatchCard
                      key={pm.id}
                      predictionMatch={pm}
                      isLoggedIn={!!user}
                      isApprovedParticipant={isParticipant}
                      userParticipationStatus={participationStatus.status}
                      contestStatus={contestStatus}
                      onSavePrediction={handleSavePrediction}
                      onRequestLogin={() => navigate('/login')}
                      onRequestRegister={() => setApplyModalOpen(true)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY PREDICTIONS */}
          {activeTab === 'my_predictions' && (
            <div>
              {!user ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xs">
                  <LogIn className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    سجل الدخول لعرض سجل توقعاتك
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-bold">
                    يمكنك متابعة نتائج توقعاتك وتاريخ المباريات التي شاركت بها بعد تسجيل الدخول.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block mt-4 px-6 py-2 rounded-xl bg-brand text-white font-black text-xs"
                  >
                    تسجيل الدخول
                  </Link>
                </div>
              ) : (
                <MyPredictionsList
                  predictions={myPredictions}
                  isLoading={isLoading}
                  onGoToActive={() => setActiveTab('matches')}
                />
              )}
            </div>
          )}

          {/* TAB 3: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <PredictionsLeaderboard
              leaderboard={leaderboard}
              currentUserRank={currentUserRank}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Participation Application Modal */}
      <AnimatePresence>
        {applyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    طلب الاشتراك في مسابقة التوقعات
                  </h3>
                  <p className="text-xs text-gray-500 font-bold">
                    سيتم إرسال طلبك لإدارة الموقع لاعتماده.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl space-y-1.5 text-gray-600 dark:text-gray-300 font-bold">
                  <div className="flex items-center gap-2 text-brand font-black">
                    <ShieldCheck className="w-4 h-4" />
                    <span>شروط وقواعد الاشتراك:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li>+2 نقطة لكل توقع للنتيجة النهائية بالضبط.</li>
                    <li>0 نقطة للتوقع الخاطئ (لا توجد نقاط سالبة).</li>
                    <li>الالتزام بالروح الرياضية وعدم استخدام حسابات متعددة.</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ملاحظات أو تعليق اختياري للإدارة:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="مثال: جاهز للتحدي والمنافسة على المركز الأول!"
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyContest()}
                  disabled={isApplying}
                  className="px-5 py-2 rounded-xl bg-brand text-white font-black text-xs flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-xs disabled:opacity-50"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>تأكيد وإرسال الطلب</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs sm:text-sm font-black ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-500/40 shadow-emerald-950/30'
                : 'bg-rose-950 text-white border-rose-500/40 shadow-rose-950/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

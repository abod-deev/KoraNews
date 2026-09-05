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
  AlertCircle,
  LogIn,
  RotateCw,
  Target,
  Medal,
  Calendar,
  UserCheck,
  Loader2,
  Crown,
  Users,
  Activity,
  X,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PredictionMatchCard from '../components/predictions/PredictionMatchCard';
import MyPredictionsList, { MyPredictionItem } from '../components/predictions/MyPredictionsList';
import PredictionsLeaderboard, { LeaderboardUser } from '../components/predictions/PredictionsLeaderboard';
import { PredictionMatchInfo } from '../services/predictionService';
import { getContestPermissions } from '../utils/contestPermissions';

export default function Predictions() {
  useSEO(
    'مسابقة التوقعات',
    'توقع نتائج المباريات الرياضية واكسب النقاط وتصدر قائمة الترتيب في KoraNews'
  );
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
        await loadAllData(false);
        return false;
      }

      showToast('success', data.message || 'تم حفظ توقعك بنجاح');
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
    (p) =>
      p.matchState === 'calculated' ||
      p.matchState === 'pending_admin' ||
      p.matchState === 'live' ||
      p.match.status === 'FINISHED'
  );

  const displayedMatches =
    matchFilter === 'open'
      ? openMatches
      : matchFilter === 'finished'
      ? finishedMatches
      : predictionMatches;

  const contestPerms = getContestPermissions(contestSettings, user, participationStatus);
  const { contestStatus, canParticipate, isParticipant } = contestPerms;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs sm:text-sm font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* 1. Hero Contest Card: Clean, high-contrast, professional */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{contestSettings?.name || 'مسابقة توقعات KoraNews'}</span>
                </span>

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                    contestStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                      : contestStatus === 'completed'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {contestStatus === 'active'
                    ? 'مسابقة جارية'
                    : contestStatus === 'completed'
                    ? 'مكتملة'
                    : 'غير مفعلة'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                مسابقة التوقعات الرياضية
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                {contestSettings?.description ||
                  'توقع النتيجة الدقيقة لأبرز المباريات المحلية والعالمية، واكسب النقاط للتنافس على صدارة الترتيب العام والتتويج بالأوسمة الذهبية.'}
              </p>
            </div>

            {/* Quick Actions & Navigation */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Link
                to="/predictions/leaderboard"
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>الترتيب العام</span>
              </Link>

              <Link
                to="/predictions/golden"
                className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 font-black text-xs flex items-center gap-1.5 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                <Crown className="w-4 h-4 text-amber-500" />
                <span>الترتيب الذهبي</span>
              </Link>

              <button
                type="button"
                onClick={() => loadAllData(false)}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                title="تحديث البيانات"
                aria-label="تحديث البيانات"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
              </button>
            </div>
          </div>

          {/* Key Metrics Strip */}
          {contestStatus !== 'none' && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">المباريات المتاحة</div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {openMatches.length} مباراة
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">المشاركون</div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {contestSettings?.participantsCount ?? leaderboard.length} متسابق
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">نقاطك الحالية</div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {user && stats ? `${stats.totalPoints} نقطة` : '—'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Medal className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">ترتيبك العام</div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {user && stats?.userRank ? `#${stats.userRank}` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Participation / Contest Status Notice */}
        {contestStatus === 'none' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                لا توجد مسابقة نشطة حالياً
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                سيتم تفعيل المسابقة وطرح المباريات للتوقع عند جدولتها من قِبل إدارة الموقع.
              </p>
            </div>
          </div>
        ) : contestStatus === 'completed' ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">
                  انتهت فعاليات المسابقة
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 font-medium mt-0.5">
                  تم اعتماد نتائج جميع المباريات واحتساب النقاط النهائية. يمكنك مراجعة لوحة المتصدرين.
                </p>
              </div>
            </div>
            <Link
              to="/predictions/leaderboard"
              className="px-4 py-2 rounded-xl bg-amber-500 text-white font-black text-xs hover:bg-amber-600 transition-colors shrink-0"
            >
              عرض النتائج النهائية
            </Link>
          </div>
        ) : !user ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  سجل دخولك للمشاركة في مسابقة التوقعات
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  المشاركة مفتوحة لجميع مستخدمي KoraNews مجاناً.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs text-center transition-colors shrink-0"
            >
              تسجيل الدخول / إنشاء حساب
            </Link>
          </div>
        ) : canParticipate ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-amber-300 dark:border-amber-800/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  انضم إلى مسابقة التوقعات وابدأ اللعب
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  أرسل طلب انضمامك لمرة واحدة فقط لتتمكن من تسجيل توقعات المباريات المتاحة.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setApplyModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              <span>طلب الاشتراك في المسابقة</span>
            </button>
          </div>
        ) : participationStatus.status === 'pending' ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                طلب اشتراكك قيد المراجعة
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 font-medium mt-0.5">
                تم استلام طلب انضمامك للمسابقة. ستتمكن من تسجيل التوقعات فور اعتماد الطلب من الإدارة.
              </p>
            </div>
          </div>
        ) : participationStatus.status === 'rejected' ? (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                  تم رفض طلب اشتراكك
                </h4>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80 font-medium mt-0.5">
                  {participationStatus.notes || 'يمكنك تقديم طلب جديد للمراجعة.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setApplyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              إعادة تقديم الطلب
            </button>
          </div>
        ) : participationStatus.status === 'blocked' ? (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                الحساب محظور من المشاركة
              </h4>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 font-medium mt-0.5">
                حسابك محظور من المشاركة في مسابقة التوقعات. يرجى التواصل مع إدارة الموقع.
              </p>
            </div>
          </div>
        ) : null}

        {/* 3. Approved User Stats Dashboard */}
        {user && isParticipant && stats && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand" />
                <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  سجل إحصائياتك الشخصية
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                نسبة النجاح: {stats.successRate}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-100 dark:divide-slate-800/80">
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 mb-1">إجمالي النقاط</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {stats.totalPoints}
                </div>
              </div>

              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 mb-1">توقعاتك المسجلة</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {stats.totalPredictions}
                </div>
              </div>

              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 mb-1">توقعات صحيحة</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {stats.correctPredictions}
                </div>
              </div>

              <div className="p-4 text-center bg-amber-50/20 dark:bg-amber-950/10">
                <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span>توقعات ذهبية</span>
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {stats.goldenPredictions || 0}
                </div>
              </div>

              <div className="p-4 text-center col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold text-slate-400 mb-1">الترتيب الحالي</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {stats.userRank ? `#${stats.userRank}` : '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Main Tabs Navigation: Matches, My Predictions, Leaderboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-1">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'matches'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>مباريات التوقع</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    activeTab === 'matches'
                      ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {predictionMatches.length}
                </span>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => setActiveTab('my_predictions')}
                  className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'my_predictions'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>توقعاتي</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      activeTab === 'my_predictions'
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {myPredictions.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'leaderboard'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>جدول الترتيب</span>
              </button>
            </div>

            <Link
              to="/predictions/golden"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors"
            >
              <Crown className="w-4 h-4" />
              <span>الترتيب الذهبي</span>
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>

          {/* Sub-Filters for Matches Tab */}
          {activeTab === 'matches' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setMatchFilter('open')}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  matchFilter === 'open'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                المتاحة للتوقع ({openMatches.length})
              </button>

              <button
                type="button"
                onClick={() => setMatchFilter('finished')}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  matchFilter === 'finished'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                المنتهية والجارية ({finishedMatches.length})
              </button>

              <button
                type="button"
                onClick={() => setMatchFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  matchFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                جميع المباريات ({predictionMatches.length})
              </button>
            </div>
          )}

          {/* Tab 1: Matches View */}
          {activeTab === 'matches' && (
            <div>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : displayedMatches.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
                    {matchFilter === 'open'
                      ? 'لا توجد مباريات متاحة للتوقع حالياً'
                      : matchFilter === 'finished'
                      ? 'لا توجد مباريات منتهية مسجلة'
                      : 'لا توجد مباريات مسجلة في المسابقة'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {matchFilter === 'open'
                      ? 'انتظر حتى يقوم المشرف بجدولة مباريات جديدة للتوقع قريباً.'
                      : 'تابع الجدول عند انتهاء المباريات واحتساب النقاط.'}
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

          {/* Tab 2: My Predictions View */}
          {activeTab === 'my_predictions' && user && (
            <MyPredictionsList
              predictions={myPredictions}
              isLoading={isLoading}
              onGoToActive={() => {
                setActiveTab('matches');
                setMatchFilter('open');
              }}
            />
          )}

          {/* Tab 3: Leaderboard View */}
          {activeTab === 'leaderboard' && (
            <PredictionsLeaderboard
              leaderboard={leaderboard}
              currentUserRank={currentUserRank}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* 5. Apply Contest Modal */}
      <AnimatePresence>
        {applyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 relative"
            >
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    طلب الاشتراك في مسابقة التوقعات
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    انضم للمتسابقين وتوقع نتائج أقوى المباريات
                  </p>
                </div>
              </div>

              <form onSubmit={handleApplyContest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ملاحظات أو تعليق اختياري للإدارة:
                  </label>
                  <textarea
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    placeholder="يمكنك كتابة رسالة قصيرة هنا..."
                    rows={3}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isApplying}
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <span>تأكيد إرسال الطلب</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

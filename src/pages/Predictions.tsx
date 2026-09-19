import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  FolderArchive,
  Archive,
  ArrowRight,
  Check,
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PredictionMatchCard from '../components/predictions/PredictionMatchCard';
import MyPredictionsList, { MyPredictionItem } from '../components/predictions/MyPredictionsList';
import PredictionsLeaderboard, { LeaderboardUser } from '../components/predictions/PredictionsLeaderboard';
import type { PredictionMatchInfo } from '../types';
import { getContestPermissions } from '../utils/contestPermissions';

export default function Predictions() {
  useSEO(
    'مسابقة التوقعات',
    'توقع نتائج المباريات الرياضية واكسب النقاط وتصدر قائمة الترتيب في KoraNews'
  );
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlContestId = searchParams.get('contestId') ? parseInt(searchParams.get('contestId')!, 10) : null;
  const [selectedContestId, setSelectedContestId] = useState<number | null>(
    urlContestId && !isNaN(urlContestId) ? urlContestId : null
  );

  const [activeTab, setActiveTab] = useState<'matches' | 'my_predictions' | 'leaderboard' | 'stats'>('matches');
  const [matchFilter, setMatchFilter] = useState<'all' | 'open' | 'live' | 'finished'>('open');

  // Contests list
  const [allContests, setAllContests] = useState<any[]>([]);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

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

  // Keep selectedContestId synchronized with searchParams
  useEffect(() => {
    const pId = searchParams.get('contestId') ? parseInt(searchParams.get('contestId')!, 10) : null;
    if (pId && !isNaN(pId)) {
      setSelectedContestId(pId);
    } else {
      setSelectedContestId(null);
    }
  }, [searchParams]);

  // Fetch contests list
  const fetchContestsList = async () => {
    try {
      const res = await fetch('/api/predictions/contests');
      if (res.ok) {
        const data = await res.json();
        setAllContests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch contests list:', e);
    }
  };

  // Fetch contest settings
  const fetchContestSettings = async (targetContestId?: number | null) => {
    try {
      const url = targetContestId
        ? `/api/predictions/contest/settings?contestId=${targetContestId}`
        : '/api/predictions/contest/settings';
      const res = await fetch(url);
      if (res.ok) {
        setContestSettings(await res.json());
      }
    } catch (e) {}
  };

  // Fetch participation status
  const fetchParticipationStatus = async (targetContestId?: number | null) => {
    if (!token) {
      setParticipationStatus({ status: 'not_registered' });
      return;
    }
    try {
      const url = targetContestId
        ? `/api/predictions/contest/my-status?contestId=${targetContestId}`
        : '/api/predictions/contest/my-status';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setParticipationStatus(await res.json());
      }
    } catch (e) {}
  };

  // Fetch all prediction matches
  const fetchMatches = async (targetContestId?: number | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const url = targetContestId
        ? `/api/predictions?contestId=${targetContestId}`
        : '/api/predictions';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setPredictionMatches(data);
      }
    } catch (e) {
      console.error('Failed to fetch prediction matches:', e);
    }
  };

  // Fetch user history
  const fetchMyHistory = async (targetContestId?: number | null) => {
    if (!token) return;
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const url = targetContestId
        ? `/api/predictions/my?contestId=${targetContestId}`
        : '/api/predictions/my';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setMyPredictions(data);
      }
    } catch (e) {
      console.error('Failed to fetch my predictions:', e);
    }
  };

  // Fetch user stats
  const fetchStats = async (targetContestId?: number | null) => {
    if (!token) return;
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const url = targetContestId
        ? `/api/predictions/stats?contestId=${targetContestId}`
        : '/api/predictions/stats';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async (targetContestId?: number | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const url = targetContestId
        ? `/api/predictions/leaderboard?contestId=${targetContestId}`
        : '/api/predictions/leaderboard';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setCurrentUserRank(data.currentUserRank || null);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  };

  const loadAllData = async (showLoader = true, targetContestId = selectedContestId) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);

    await Promise.all([
      fetchContestsList(),
      fetchContestSettings(targetContestId),
      fetchMatches(targetContestId),
      token ? fetchParticipationStatus(targetContestId) : Promise.resolve(),
      token ? fetchMyHistory(targetContestId) : Promise.resolve(),
      token ? fetchStats(targetContestId) : Promise.resolve(),
      fetchLeaderboard(targetContestId),
    ]);

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadAllData(true, selectedContestId);
  }, [token, selectedContestId]);

  const handleSelectContest = (contestId: number | null) => {
    setSelectedContestId(contestId);
    if (contestId) {
      setSearchParams({ contestId: String(contestId) });
    } else {
      setSearchParams({});
    }
    setArchiveModalOpen(false);
  };

  // Active contest in the whole system
  const activeContest = allContests.find((c) => c.status === 'active');
  const completedContests = allContests.filter((c) => c.status === 'completed');

  // Check if current view is an archived completed contest
  const isBrowsingArchive = Boolean(
    contestSettings &&
    (contestSettings.status === 'completed' ||
      (selectedContestId && activeContest && selectedContestId !== activeContest.id))
  );

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
  const liveMatches = predictionMatches.filter(
    (p) =>
      !p.isOpenForPrediction &&
      p.matchState !== 'open' &&
      (p.matchState === 'live' ||
        p.match.status === 'LIVE' ||
        p.match.status === 'IN_PLAY' ||
        p.match.status === 'PAUSED')
  );
  const finishedMatches = predictionMatches.filter(
    (p) =>
      !p.isOpenForPrediction &&
      p.matchState !== 'open' &&
      p.matchState !== 'live' &&
      p.match.status !== 'LIVE' &&
      p.match.status !== 'IN_PLAY' &&
      p.match.status !== 'PAUSED' &&
      (p.matchState === 'calculated' ||
        p.matchState === 'pending_admin' ||
        p.match.status === 'FINISHED')
  );

  const displayedMatches =
    matchFilter === 'open'
      ? openMatches
      : matchFilter === 'live'
      ? liveMatches
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
        {/* 1. Contest Header: Premium Minimalist Corporate Sports Design */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{contestSettings?.name || 'مسابقة توقعات KoraNews'}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                    contestStatus === 'active'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40'
                      : contestStatus === 'completed'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      contestStatus === 'active'
                        ? 'bg-emerald-500 animate-pulse'
                        : contestStatus === 'completed'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>
                    {contestStatus === 'active'
                      ? 'مسابقة جارية'
                      : contestStatus === 'completed'
                      ? 'مكتملة'
                      : 'غير مفعلة'}
                  </span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                مسابقة التوقعات الرياضية
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {contestSettings?.description ||
                  'توقع النتيجة الدقيقة لأبرز المباريات المحلية والعالمية، واكسب النقاط للتنافس على صدارة الترتيب العام والتتويج بالأوسمة الذهبية.'}
              </p>
            </div>

            {/* Quick Actions & Navigation Links */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Link
                to={selectedContestId ? `/predictions/leaderboard?contestId=${selectedContestId}` : '/predictions/leaderboard'}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>الترتيب العام</span>
              </Link>

              <Link
                to={selectedContestId ? `/predictions/golden?contestId=${selectedContestId}` : '/predictions/golden'}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 font-black text-xs flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-2xs"
              >
                <Crown className="w-4 h-4 text-amber-500" />
                <span>الترتيب الذهبي</span>
              </Link>

              <button
                type="button"
                onClick={() => loadAllData(false, selectedContestId)}
                disabled={isRefreshing}
                className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center justify-center"
                title="تحديث البيانات"
                aria-label="تحديث البيانات"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Current Available Contest Information */}
          {contestStatus !== 'none' && (
            <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div className="p-2 sm:p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-right gap-1.5 sm:gap-2.5 shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate">المباريات المتاحة</div>
                  <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                    {openMatches.length} مباراة
                  </div>
                </div>
              </div>

              <div className="p-2 sm:p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-right gap-1.5 sm:gap-2.5 shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate">المشاركون</div>
                  <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                    {contestSettings?.participantsCount ?? leaderboard.length} متسابق
                  </div>
                </div>
              </div>

              <div className="p-2 sm:p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-right gap-1.5 sm:gap-2.5 shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate">التوقع الذهبي</div>
                  <div className="font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm truncate">
                    +{contestSettings?.pointsExact || 3} نقاط
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Archived Contest Alert Banner */}
        {isBrowsingArchive && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-300/80 dark:border-amber-700/60 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Archive className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-100">
                    أنت تتصفح أرشيف مسابقة منتهية: {contestSettings?.name || `#${selectedContestId}`}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    أرشيف للعرض فقط
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 font-medium">
                  يتم عرض كافة المباريات والنتائج المسجلة وسجل التوقعات ولائحة المتصدرين النهائية لهذه المسابقة السابقة.
                </p>
              </div>
            </div>

            {activeContest && (
              <button
                type="button"
                onClick={() => handleSelectContest(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 transition-all shrink-0 shadow-xs cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>العودة للمسابقة الحالية النشطة</span>
              </button>
            )}
          </div>
        )}

        {/* Participation status notice if applicable */}
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
        ) : contestStatus === 'completed' && !isBrowsingArchive ? (
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
              to={selectedContestId ? `/predictions/leaderboard?contestId=${selectedContestId}` : '/predictions/leaderboard'}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shrink-0 flex items-center justify-center shadow-xs"
            >
              عرض النتائج النهائية
            </Link>
          </div>
        ) : !user ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
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
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs text-center transition-colors shrink-0 flex items-center justify-center shadow-xs"
            >
              تسجيل الدخول / إنشاء حساب
            </Link>
          </div>
        ) : canParticipate ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-amber-300/80 dark:border-amber-800/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
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
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              <span>طلب الاشتراك في المسابقة</span>
            </button>
          </div>
        ) : participationStatus.status === 'pending' ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
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
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
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
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center shadow-xs"
            >
              إعادة تقديم الطلب
            </button>
          </div>
        ) : participationStatus.status === 'blocked' ? (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
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

        {/* 3. Navigation Tabs: Segmented Navigation (المباريات / توقعاتي / الترتيب / المسابقات المنتهية) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex items-center gap-1.5 w-full sm:w-auto shadow-inner overflow-x-auto scrollbar-hide">
              
              {/* Tab 1: المباريات */}
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'matches'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Target className="w-4 h-4 shrink-0" />
                <span>المباريات</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    activeTab === 'matches'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {predictionMatches.length}
                </span>
              </button>

              {/* Tab 2: توقعاتي */}
              <button
                type="button"
                onClick={() => setActiveTab('my_predictions')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'my_predictions'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4 shrink-0" />
                <span>توقعاتي</span>
                {user ? (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                      activeTab === 'my_predictions'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {myPredictions.length}
                  </span>
                ) : null}
              </button>

              {/* Tab 3: الترتيب */}
              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'leaderboard'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                <span>الترتيب</span>
              </button>

              {/* Tab 4: الإحصائيات */}
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'stats'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>الإحصائيات</span>
                {user && isParticipant && stats ? (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                      activeTab === 'stats'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200'
                    }`}
                  >
                    {stats.totalPoints} نقطة
                  </span>
                ) : null}
              </button>
            </div>

            <Link
              to="/predictions/golden"
              className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors self-end sm:self-center shrink-0"
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
                onClick={() => setMatchFilter('live')}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  matchFilter === 'live'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {liveMatches.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                )}
                <span>المباريات الجارية ({liveMatches.length})</span>
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
                المباريات المنتهية ({finishedMatches.length})
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

          {/* Tab 1: Prediction Matches */}
          {activeTab === 'matches' && (
            <div>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4 shadow-xs"
                    >
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded-full" />
                        <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                      </div>
                      <div className="flex justify-around items-center py-2">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                        </div>
                        <div className="h-6 w-12 bg-slate-100 dark:bg-slate-800 rounded-full" />
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                      <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </div>
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
                      : matchFilter === 'live'
                      ? 'لا توجد مباريات جارية حالياً'
                      : matchFilter === 'finished'
                      ? 'لا توجد مباريات منتهية مسجلة'
                      : 'لا توجد مباريات مسجلة في المسابقة'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {matchFilter === 'open'
                      ? 'انتظر حتى يقوم المشرف بجدولة مباريات جديدة للتوقع قريباً.'
                      : matchFilter === 'live'
                      ? 'تابع نتائج المباريات فور انطلاقها واحتساب التوقعات مباشرة.'
                      : matchFilter === 'finished'
                      ? 'تابع الجدول عند انتهاء المباريات واحتساب النقاط.'
                      : 'لا توجد مباريات مسجلة في المسابقة حالياً.'}
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

          {/* Tab 2: My Predictions */}
          {activeTab === 'my_predictions' && (
            user ? (
              <MyPredictionsList
                predictions={myPredictions}
                isLoading={isLoading}
                onGoToActive={() => {
                  setActiveTab('matches');
                  setMatchFilter('open');
                }}
              />
            ) : (
              <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                  <LogIn className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                  سجل دخولك لعرض قائمة توقعاتك
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  يمكنك متابعة نتائج توقعاتك والنقاط المحتسبة بعد تسجيل الدخول.
                </p>
                <Link
                  to="/login"
                  className="inline-flex px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  تسجيل الدخول الآن
                </Link>
              </div>
            )
          )}

          {/* Tab 3: Leaderboard / Ranking */}
          {activeTab === 'leaderboard' && (
            <PredictionsLeaderboard
              leaderboard={leaderboard}
              currentUserRank={currentUserRank}
              isLoading={isLoading}
            />
          )}

          {/* Tab 4: Statistics (الإحصائيات) */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* User Personal Stats Section */}
              {user && isParticipant && stats ? (
                <div className="space-y-4">
                  {/* User Stats Card Header */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                          <Activity className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                              إحصائياتك في المسابقة
                            </h3>
                            {stats.userRank && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-amber-500" />
                                <span>المركز #{stats.userRank}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            سجل أدائك ودقة توقعاتك والنقاط المكتسبة في مسابقة {contestSettings?.name || 'التوقعات'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400">نسبة النجاح العامة</div>
                          <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                            {stats.successRate}%
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Stats Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800/80">
                      <div className="p-4 sm:p-5 text-center border-l border-slate-100 dark:border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-400 mb-1">إجمالي النقاط</div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                          {stats.totalPoints}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-1">نقطة مكتسبة</div>
                      </div>

                      <div className="p-4 sm:p-5 text-center border-l border-slate-100 dark:border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-400 mb-1">التوقعات المسجلة</div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                          {stats.totalPredictions}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-1">مباراة متوقعة</div>
                      </div>

                      <div className="p-4 sm:p-5 text-center border-l border-slate-100 dark:border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-400 mb-1">توقعات صحيحة</div>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {stats.correctPredictions}
                        </div>
                        <div className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80 mt-1">فائز / تعادل</div>
                      </div>

                      <div className="p-4 sm:p-5 text-center border-l border-slate-100 dark:border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-400 mb-1">النتيجة الدقيقة</div>
                        <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">
                          {stats.exactScorePredictions || 0}
                        </div>
                        <div className="text-[10px] font-medium text-purple-600/80 dark:text-purple-400/80 mt-1">نتيجة مطابقة</div>
                      </div>

                      <div className="p-4 sm:p-5 text-center bg-amber-50/40 dark:bg-amber-950/15 border-l border-slate-100 dark:border-slate-800/80">
                        <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1 flex items-center justify-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>توقعات ذهبية</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                          {stats.goldenPredictions || 0}
                        </div>
                        <div className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80 mt-1">مضاعفة النقاط</div>
                      </div>

                      <div className="p-4 sm:p-5 text-center col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-bold text-slate-400 mb-1">الترتيب العام</div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                          {stats.userRank ? `#${stats.userRank}` : '—'}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-1">من {contestSettings?.participantsCount ?? leaderboard.length} متسابق</div>
                      </div>
                    </div>

                    {/* Accuracy Visual Progress Bar */}
                    <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-blue-500" />
                          <span>معدل دقة التوقعات</span>
                        </span>
                        <span className="font-mono text-slate-900 dark:text-white">{stats.correctPredictions} صحيحة من {stats.totalPredictions} مسجلة ({stats.successRate}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${Math.min(100, stats.successRate)}%` }}
                          title={`توقعات صحيحة: ${stats.correctPredictions}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>توقعات صحيحة ({stats.correctPredictions})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>توقعات غير موفقة ({Math.max(0, stats.totalPredictions - stats.correctPredictions)})</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : user && !isParticipant ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        أنت غير مشترك في هذه المسابقة بعد
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        قم بالاشتراك في المسابقة لتسجيل توقعاتك للمباريات ومتابعة إحصائياتك ونقاطك وترتيبك.
                      </p>
                    </div>
                  </div>
                  {participationStatus.status === 'none' && contestStatus === 'active' && (
                    <button
                      type="button"
                      onClick={() => setApplyModalOpen(true)}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-colors shadow-xs shrink-0 cursor-pointer"
                    >
                      طلب الاشتراك في المسابقة
                    </button>
                  )}
                </div>
              ) : !user ? (
                <div className="text-center py-10 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                    سجل دخولك لعرض إحصائياتك الشخصية
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    يمكنك متابعة معدل نجاحك في التوقعات وإجمالي نقاطك وترتيبك عند تسجيل الدخول.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                  >
                    تسجيل الدخول الآن
                  </Link>
                </div>
              ) : null}

              {/* Contest Overview & General Stats */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      إحصائيات عامة للمسابقة
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {contestSettings?.name || 'مسابقة التوقعات'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">إجمالي المباريات</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {predictionMatches.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">المتاحة للتوقع</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {openMatches.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                    <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 mb-1">المباريات الجارية</div>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                      {liveMatches.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">المباريات المنتهية</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {finishedMatches.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-1">إجمالي المشتركين</div>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                      {contestSettings?.participantsCount ?? leaderboard.length}
                    </div>
                  </div>
                </div>

                {/* Scoring System Rules Banner */}
                <div className="pt-2">
                  <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        نظام النقاط:
                      </span>
                      <span className="text-slate-500">
                        النتيجة الدقيقة (<strong className="text-slate-800 dark:text-slate-200">+{contestSettings?.pointsExact || 3} نقاط</strong>) • توقع الفائز (<strong className="text-slate-800 dark:text-slate-200">+{contestSettings?.pointsWinner || 1} نقطة</strong>)
                      </span>
                    </div>

                    <Link
                      to={selectedContestId ? `/predictions/leaderboard?contestId=${selectedContestId}` : '/predictions/leaderboard'}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>عرض لائحة الترتيب كاملة</span>
                      <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
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
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 relative"
            >
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
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
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-750 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isApplying}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

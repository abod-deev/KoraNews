import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  RotateCw,
  Target,
  ChevronLeft,
  Crown,
  AlertCircle,
  RefreshCw,
  Archive,
  FolderArchive,
  Share2,
  Check,
} from 'lucide-react';
import PredictionsLeaderboard, { LeaderboardUser } from '../components/predictions/PredictionsLeaderboard';

export default function PredictionsLeaderboardPage() {
  useSEO(
    'ترتيب التوقعات',
    'جدول الترتيب العام للمتسابقين وأصحاب أعلى النقاط في مسابقة توقعات KoraNews'
  );
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlContestId = searchParams.get('contestId') ? parseInt(searchParams.get('contestId')!, 10) : null;
  const [selectedContestId, setSelectedContestId] = useState<number | null>(
    urlContestId && !isNaN(urlContestId) ? urlContestId : null
  );

  const [allContests, setAllContests] = useState<any[]>([]);
  const [currentContest, setCurrentContest] = useState<any>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async () => {
    const contestTitle = currentContest?.name || 'مسابقة توقعات KoraNews';
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

    const shareUrl = `${window.location.origin}/predictions/leaderboard${selectedContestId ? `?contestId=${selectedContestId}` : ''}`;
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
        // Dismissed or unsupported
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

  // Sync state with URL params
  useEffect(() => {
    const pId = searchParams.get('contestId') ? parseInt(searchParams.get('contestId')!, 10) : null;
    if (pId && !isNaN(pId)) {
      setSelectedContestId(pId);
    } else {
      setSelectedContestId(null);
    }
  }, [searchParams]);

  const fetchContests = async () => {
    try {
      const res = await fetch('/api/predictions/contests');
      if (res.ok) {
        const data = await res.json();
        setAllContests(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  };

  const fetchLeaderboard = async (isManualRefresh = false, targetContestId = selectedContestId) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

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
    fetchContests();
  }, []);

  useEffect(() => {
    fetchLeaderboard(false, selectedContestId);
  }, [token, selectedContestId]);

  useEffect(() => {
    if (selectedContestId && allContests.length > 0) {
      const found = allContests.find((c) => c.id === selectedContestId);
      setCurrentContest(found || null);
    } else if (allContests.length > 0) {
      const active = allContests.find((c) => c.status === 'active');
      setCurrentContest(active || allContests[0] || null);
    }
  }, [selectedContestId, allContests]);

  const handleContestChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setSelectedContestId(null);
      setSearchParams({});
    } else {
      const id = parseInt(val, 10);
      setSelectedContestId(id);
      setSearchParams({ contestId: String(id) });
    }
  };

  const isArchived = currentContest?.status === 'completed';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header, Breadcrumb, and Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
              <Link
                to={selectedContestId ? `/predictions?contestId=${selectedContestId}` : '/predictions'}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    ترتيب التوقعات
                  </h1>
                  {isArchived && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center gap-1">
                      <Archive className="w-3 h-3" />
                      <span>أرشيف مكتمل</span>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentContest
                    ? `ترتيب المتسابقين في: ${currentContest.name}`
                    : 'الترتيب التراكمي للمتسابقين وتوزيع النقاط المكتسبة من التوقعات الصحيحة للمباريات.'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions: Contest Selector, تحديث، الانتقال للترتيب الذهبي، العودة للمسابقة */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {allContests.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <FolderArchive className="w-4 h-4 text-slate-400 ml-1" />
                <select
                  value={selectedContestId ? String(selectedContestId) : ''}
                  onChange={handleContestChange}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer py-1"
                >
                  <option value="" className="dark:bg-slate-800">
                    المسابقة النشطة (الافتراضية)
                  </option>
                  {allContests.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-800">
                      {c.name} {c.status === 'completed' ? '(منتهية)' : '(جارية)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* العودة للمسابقة */}
            <Link
              to={selectedContestId ? `/predictions?contestId=${selectedContestId}` : '/predictions'}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>العودة للمسابقة</span>
            </Link>

            {/* الانتقال للترتيب الذهبي */}
            <Link
              to={selectedContestId ? `/predictions/golden?contestId=${selectedContestId}` : '/predictions/golden'}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-2xs"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>الترتيب الذهبي</span>
            </Link>

            {/* زر مشاركة الترتيب العام */}
            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="مشاركة جدول الترتيب العام"
              aria-label="مشاركة جدول الترتيب العام"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">مشاركة</span>
                </>
              )}
            </button>

            {/* تحديث */}
            <button
              type="button"
              onClick={() => fetchLeaderboard(true, selectedContestId)}
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
        contestName={currentContest?.name}
        contestId={selectedContestId}
      />
    </div>
  );
}

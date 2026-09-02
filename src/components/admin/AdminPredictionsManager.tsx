import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Loader2,
  RotateCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Users,
  Settings,
  UserCheck,
  UserX,
  Ban,
  Calendar,
  Globe,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Radio,
  Archive,
  Award,
  Edit3,
  Filter,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPredictionsManagerProps {
  token: string | null;
  onShowMessage: (type: 'success' | 'error', text: string) => void;
}

interface PredictionItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  homeScore: number;
  awayScore: number;
  pointsEarned: number;
  isEvaluated: boolean;
  isGolden: boolean;
  goldenPoints: number;
  createdAt: string;
  updatedAt: string;
}

interface PredictionMatchItem {
  id: number;
  matchId: string | null;
  isExternal: boolean;
  pointsPerMatch: number;
  isActive: boolean;
  isCalculated: boolean;
  calculatedAt: string | null;
  isConfirmedByAdmin: boolean;
  confirmedAt: string | null;
  createdAt: string;
  isOpenForPrediction: boolean;
  matchState: 'open' | 'upcoming' | 'live' | 'pending_admin' | 'calculated';
  participantsCount: number;
  correctPredictorsCount: number;
  correctPredictors: Array<{
    id: number;
    name: string;
    avatar: string | null;
    isGolden: boolean;
  }>;
  goldenPredictor: {
    id: number;
    name: string;
    avatar: string | null;
  } | null;
  predictions: PredictionItem[];
  match: {
    id: string;
    leagueName: string;
    leagueLogo?: string;
    homeTeam: {
      id: string;
      name: string;
      logo?: string;
    };
    awayTeam: {
      id: string;
      name: string;
      logo?: string;
    };
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    matchTime: string;
    matchDate: string;
  };
}

export default function AdminPredictionsManager({
  token,
  onShowMessage,
}: AdminPredictionsManagerProps) {
  // Sub-tabs inside Predictions Admin
  const [subTab, setSubTab] = useState<'matches' | 'add_match' | 'participants' | 'settings'>('matches');

  // Matches Data
  const [predictionMatches, setPredictionMatches] = useState<PredictionMatchItem[]>([]);
  const [availableMatches, setAvailableMatches] = useState<any[]>([]);
  const [addDayTab, setAddDayTab] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatchPoints, setSelectedMatchPoints] = useState<number>(2);

  // Filter in main matches tab
  const [mainMatchesFilter, setMainMatchesFilter] = useState<'all' | 'pending' | 'calculated' | 'open'>('all');
  const [mainMatchesSearch, setMainMatchesSearch] = useState('');

  // Manual Result Confirmation State
  const [confirmingMatch, setConfirmingMatch] = useState<PredictionMatchItem | null>(null);
  const [manualHomeScore, setManualHomeScore] = useState<number>(0);
  const [manualAwayScore, setManualAwayScore] = useState<number>(0);
  const [isConfirmingScore, setIsConfirmingScore] = useState(false);

  // Edit Points Modal State
  const [editingPointsMatch, setEditingPointsMatch] = useState<PredictionMatchItem | null>(null);
  const [customPointsValue, setCustomPointsValue] = useState<number>(2);
  const [isSavingPoints, setIsSavingPoints] = useState(false);

  // External Custom Match Form State
  const [customMatch, setCustomMatch] = useState({
    leagueName: '',
    leagueLogo: '',
    homeTeamName: '',
    homeTeamLogo: '',
    awayTeamName: '',
    awayTeamLogo: '',
    matchDate: new Date().toISOString().slice(0, 16),
    pointsPerMatch: 2,
  });

  // Participants Data
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantFilter, setParticipantFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'blocked'>('all');
  const [participantSearch, setParticipantSearch] = useState('');

  // Contest Settings Data
  const [contestSettings, setContestSettings] = useState({
    id: 1,
    name: 'مسابقة توقعات KoraNews',
    description: 'توقع نتائج المباريات واربح النقاط واعتلِ صدارة الترتيب',
    status: 'active',
    pointsPerCorrectScore: 2,
    startDate: '',
    endDate: '',
  });

  // Modal Views
  const [viewingPredictionsForMatch, setViewingPredictionsForMatch] = useState<PredictionMatchItem | null>(null);
  const [predictionModalSearch, setPredictionModalSearch] = useState('');
  const [predictionModalFilter, setPredictionModalFilter] = useState<'all' | 'correct' | 'golden' | 'incorrect'>('all');
  const [deleteModalItem, setDeleteModalItem] = useState<PredictionMatchItem | null>(null);

  // UI / Action loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch prediction matches from Backend
  const fetchPredictionMatches = async () => {
    try {
      const res = await fetch('/api/admin/predictions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPredictionMatches(data);
      }
    } catch (e) {
      console.error('Error fetching prediction matches:', e);
    }
  };

  // Fetch available matches for selection (Today / Tomorrow / All)
  const fetchAvailableMatches = async (dateFilter: 'today' | 'tomorrow' | 'all' = 'all') => {
    try {
      const res = await fetch(`/api/admin/predictions/available-matches?date=${dateFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableMatches(data);
      }
    } catch (e) {
      console.error('Error fetching available matches:', e);
    }
  };

  // Fetch contest participants
  const fetchParticipants = async () => {
    try {
      const res = await fetch('/api/admin/predictions/participants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } catch (e) {
      console.error('Error fetching participants:', e);
    }
  };

  // Fetch contest settings
  const fetchContestSettings = async () => {
    try {
      const res = await fetch('/api/predictions/contest/settings');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setContestSettings({
            id: data.id || 1,
            name: data.name || 'مسابقة توقعات KoraNews',
            description: data.description || '',
            status: data.status || 'active',
            pointsPerCorrectScore: data.pointsPerCorrectScore || 2,
            startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 10) : '',
            endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 10) : '',
          });
        }
      }
    } catch (e) {
      console.error('Error fetching contest settings:', e);
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchPredictionMatches(),
      fetchAvailableMatches('all'),
      fetchParticipants(),
      fetchContestSettings(),
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (token) loadAll();
  }, [token]);

  // Keep viewingPredictionsForMatch up to date if predictionMatches updates
  useEffect(() => {
    if (viewingPredictionsForMatch) {
      const updated = predictionMatches.find((pm) => pm.id === viewingPredictionsForMatch.id);
      if (updated) {
        setViewingPredictionsForMatch(updated);
      }
    }
  }, [predictionMatches]);

  // Add match from system database with customized points
  const handleAddSelectedMatch = async () => {
    if (!selectedMatchId) {
      onShowMessage('error', 'يرجى اختيار مباراة من القائمة أولاً');
      return;
    }

    const pts = Number(selectedMatchPoints) || 2;
    if (pts < 1 || pts > 20) {
      onShowMessage('error', 'نقاط المباراة يجب أن تكون بين 1 و 20 نقطة');
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch('/api/admin/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchId: selectedMatchId,
          pointsPerMatch: pts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        onShowMessage('error', data.error || 'فشل في إضافة المباراة');
      } else {
        onShowMessage('success', `تمت إضافة المباراة لمسابقات التوقع بنجاح (${pts} نقاط)!`);
        setSelectedMatchId(null);
        setSelectedMatchPoints(2);
        await Promise.all([fetchPredictionMatches(), fetchAvailableMatches('all')]);
        setSubTab('matches');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Add external custom league match
  const handleAddCustomMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMatch.leagueName || !customMatch.homeTeamName || !customMatch.awayTeamName) {
      onShowMessage('error', 'يرجى ملء اسم البطولة واسمي الفريقين');
      return;
    }

    const pts = Number(customMatch.pointsPerMatch) || 2;
    if (pts < 1 || pts > 20) {
      onShowMessage('error', 'نقاط المباراة يجب أن تكون بين 1 و 20 نقطة');
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch('/api/admin/predictions/custom-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...customMatch,
          pointsPerMatch: pts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        onShowMessage('error', data.error || 'فشل في إضافة المباراة الخاصة');
      } else {
        onShowMessage('success', `تمت إضافة مباراة الدوري الخاص للتوقعات بنجاح (${pts} نقاط)!`);
        setCustomMatch({
          leagueName: '',
          leagueLogo: '',
          homeTeamName: '',
          homeTeamLogo: '',
          awayTeamName: '',
          awayTeamLogo: '',
          matchDate: new Date().toISOString().slice(0, 16),
          pointsPerMatch: 2,
        });
        await fetchPredictionMatches();
        setSubTab('matches');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Update Points for an Existing Match
  const handleUpdatePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPointsMatch) return;

    const pts = Number(customPointsValue) || 2;
    if (pts < 1 || pts > 20) {
      onShowMessage('error', 'نقاط المباراة يجب أن تكون بين 1 و 20 نقطة');
      return;
    }

    setIsSavingPoints(true);
    try {
      const res = await fetch(`/api/admin/predictions/${editingPointsMatch.id}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pointsPerMatch: pts }),
      });

      const data = await res.json();
      if (!res.ok) {
        onShowMessage('error', data.error || 'فشل في تحديث نقاط المباراة');
      } else {
        onShowMessage('success', `تم تحديث نقاط المباراة إلى (${pts} نقاط) بنجاح`);
        setEditingPointsMatch(null);
        await fetchPredictionMatches();
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsSavingPoints(false);
    }
  };

  // Toggle active state / archive toggle
  const handleToggleActive = async (predictionMatchId: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/predictions/${predictionMatchId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (res.ok) {
        onShowMessage('success', !currentActive ? 'تم فتح التوقع للمباراة' : 'تم إغلاق/أرشفة التوقع للمباراة');
        await fetchPredictionMatches();
      } else {
        const data = await res.json();
        onShowMessage('error', data.error || 'فشل في تعديل حالة التوقع');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    }
  };

  // Delete prediction match (Blocked if already calculated, user gets explanation)
  const handleDeletePrediction = async (item: PredictionMatchItem) => {
    if (item.isCalculated || item.isConfirmedByAdmin) {
      onShowMessage('error', 'لا يمكن حذف مباراة تم اعتماد نتيجتها وتوزيع نقاطها؛ تم أرشفتها لحفظ سجل المتسابقين.');
      setDeleteModalItem(null);
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/admin/predictions/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        onShowMessage('success', 'تم حذف المباراة من مسابقة التوقعات بنجاح');
        setDeleteModalItem(null);
        await Promise.all([fetchPredictionMatches(), fetchAvailableMatches('all')]);
      } else {
        const data = await res.json();
        onShowMessage('error', data.error || 'فشل في حذف المباراة');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Manual Result Confirmation & Safe Recalculation
  const handleConfirmResultAndEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingMatch) return;

    const targetPoints = confirmingMatch.pointsPerMatch || 2;
    setIsConfirmingScore(true);
    try {
      const res = await fetch(`/api/admin/predictions/${confirmingMatch.id}/confirm-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          homeScore: manualHomeScore,
          awayScore: manualAwayScore,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        onShowMessage('error', data.error || 'فشل في اعتماد النتيجة واحتساب النقاط');
      } else {
        const correctCount = data.data?.correctPredictorsCount ?? data.correctPredictorsCount ?? 0;
        onShowMessage(
          'success',
          `تم اعتماد النتيجة (${manualHomeScore} - ${manualAwayScore}) واحتساب النقاط بنجاح لـ ${correctCount} متسابق (+${targetPoints} نقطة)!`
        );
        setConfirmingMatch(null);
        await fetchPredictionMatches();
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsConfirmingScore(false);
    }
  };

  // Participant status update (Approve, Reject, Block)
  const handleUpdateParticipantStatus = async (
    participantId: number,
    newStatus: 'pending' | 'approved' | 'rejected' | 'blocked'
  ) => {
    try {
      const res = await fetch(`/api/admin/predictions/participants/${participantId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        onShowMessage('success', data.message || 'تم تحديث حالة المتسابق بنجاح');
        await fetchParticipants();
      } else {
        onShowMessage('error', data.error || 'فشل في تحديث حالة المتسابق');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    }
  };

  // Save contest settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/admin/predictions/contest/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contestSettings),
      });

      const data = await res.json();
      if (res.ok) {
        onShowMessage('success', 'تم حفظ إعدادات المسابقة بنجاح');
        await fetchContestSettings();
      } else {
        onShowMessage('error', data.error || 'فشل في حفظ إعدادات المسابقة');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Date strings for comparison in UTC format
  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const tomorrowObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrowObj.toISOString().slice(0, 10);

  // Filter available matches by Today vs Tomorrow vs Search
  const filteredAvailableMatches = availableMatches
    .filter((m) => {
      const mDateStr = new Date(m.matchDate).toISOString().slice(0, 10);
      if (addDayTab === 'today') return mDateStr === todayDateStr;
      if (addDayTab === 'tomorrow') return mDateStr === tomorrowDateStr;
      return true;
    })
    .filter((m) => {
      if (!matchSearchQuery.trim()) return true;
      const q = matchSearchQuery.toLowerCase();
      const home = (m.homeTeam?.name || '').toLowerCase();
      const away = (m.awayTeam?.name || '').toLowerCase();
      const league = (m.leagueName || '').toLowerCase();
      return home.includes(q) || away.includes(q) || league.includes(q);
    });

  // Filter main prediction matches list
  const filteredMainMatches = predictionMatches
    .filter((pm) => {
      if (mainMatchesFilter === 'pending') return !pm.isCalculated && !pm.isConfirmedByAdmin;
      if (mainMatchesFilter === 'calculated') return pm.isCalculated || pm.isConfirmedByAdmin;
      if (mainMatchesFilter === 'open') return pm.isOpenForPrediction;
      return true;
    })
    .filter((pm) => {
      if (!mainMatchesSearch.trim()) return true;
      const q = mainMatchesSearch.toLowerCase();
      const home = (pm.match?.homeTeam?.name || '').toLowerCase();
      const away = (pm.match?.awayTeam?.name || '').toLowerCase();
      const league = (pm.match?.leagueName || '').toLowerCase();
      return home.includes(q) || away.includes(q) || league.includes(q);
    });

  // Filter participants
  const filteredParticipants = participants
    .filter((p) => {
      const matchesStatus = participantFilter === 'all' || p.status === participantFilter;
      const q = participantSearch.toLowerCase().trim();
      const userName = (p.user?.name || '').toLowerCase();
      const userEmail = (p.user?.email || '').toLowerCase();
      const matchesSearch = !q || userName.includes(q) || userEmail.includes(q);
      return matchesStatus && matchesSearch;
    });

  const pendingParticipantsCount = participants.filter((p) => p.status === 'pending').length;

  // Filter predictions inside the Viewing Predictions Modal
  const filteredModalPredictions = (viewingPredictionsForMatch?.predictions || [])
    .filter((p) => {
      if (predictionModalFilter === 'correct') return p.isEvaluated && p.pointsEarned > 0;
      if (predictionModalFilter === 'golden') return p.isGolden;
      if (predictionModalFilter === 'incorrect') return p.isEvaluated && p.pointsEarned === 0;
      return true;
    })
    .filter((p) => {
      if (!predictionModalSearch.trim()) return true;
      const q = predictionModalSearch.toLowerCase().trim();
      const uName = (p.userName || '').toLowerCase();
      const uEmail = (p.userEmail || '').toLowerCase();
      return uName.includes(q) || uEmail.includes(q);
    });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-brand" />
        <span className="text-xs font-bold text-gray-500">جاري تحميل بيانات مسابقة التوقعات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Sub-Tabs Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap bg-white dark:bg-gray-900 p-1.5 sm:p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs scrollbar-hide">
        {[
          { id: 'matches', label: 'مباريات التوقعات واعتماد النتائج', mobileLabel: 'مباريات التوقعات', icon: Trophy, count: predictionMatches.length },
          { id: 'add_match', label: 'إضافة مباريات (اليوم / الغد / دوري خارجي)', mobileLabel: 'إضافة مباريات', icon: Plus },
          {
            id: 'participants',
            label: 'المتسابقون وطلبات الاشتراك',
            mobileLabel: 'المتسابقين',
            icon: Users,
            badge: pendingParticipantsCount > 0 ? pendingParticipantsCount : undefined,
          },
          { id: 'settings', label: 'إعدادات المسابقة', mobileLabel: 'إعدادات', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline sm:hidden">{tab.mobileLabel}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. SUB-TAB 1: MATCHES LIST & MANUAL EVALUATION */}
      {subTab === 'matches' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand" />
                المباريات المدرجة في مسابقة التوقعات ({predictionMatches.length})
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                تحكم في فتح وإغلاق التوقعات، تحديد نقاط كل مباراة، واعتماد النتائج النهائية يدوياً لاحتساب وتوزيع النقاط بدقة.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              {/* Search in main matches */}
              <div className="relative flex-1 md:w-48">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالفريق أو البطولة..."
                  value={mainMatchesSearch}
                  onChange={(e) => setMainMatchesSearch(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMainMatchesFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    mainMatchesFilter === 'all' ? 'bg-brand text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setMainMatchesFilter('open')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    mainMatchesFilter === 'open' ? 'bg-brand text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  مفتوحة
                </button>
                <button
                  type="button"
                  onClick={() => setMainMatchesFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    mainMatchesFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  بانتظار الاعتماد
                </button>
                <button
                  type="button"
                  onClick={() => setMainMatchesFilter('calculated')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    mainMatchesFilter === 'calculated' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  معتمدة ومحسوبة
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSubTab('add_match')}
                className="px-3.5 py-1.5 rounded-xl bg-brand text-white font-black text-xs hover:bg-emerald-600 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مباراة</span>
              </button>
            </div>
          </div>

          {/* Matches Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            {filteredMainMatches.length === 0 ? (
              <div className="text-center py-16 px-4 text-gray-400 font-bold text-xs">
                لا توجد مباريات مطابقة للفلتر الحالي. اضغط على "إضافة مباراة" لاختيار مباريات اليوم أو الغد أو دوري خارجي.
              </div>
            ) : (
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 text-[11px] sm:text-xs">
                        <th className="p-3 sm:p-4 font-black">المباراة</th>
                        <th className="p-3 sm:p-4 font-black">البطولة والموعد</th>
                        <th className="p-3 sm:p-4 font-black text-center">نقاط المباراة</th>
                        <th className="p-3 sm:p-4 font-black text-center">النتيجة المسجلة</th>
                        <th className="p-3 sm:p-4 font-black text-center">حالة التوقع</th>
                        <th className="p-3 sm:p-4 font-black text-center">المشاركون</th>
                        <th className="p-3 sm:p-4 font-black text-center">اعتماد النتيجة والنقاط</th>
                        <th className="p-3 sm:p-4 font-black text-center">إجراءات وأرشفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredMainMatches.map((pm) => {
                        const m = pm.match;
                        if (!m) return null;
                        const matchDate = new Date(m.matchDate);
                        const isEvaluated = pm.isCalculated || pm.isConfirmedByAdmin;
                        const points = pm.pointsPerMatch || 2;

                        return (
                          <tr key={pm.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            {/* Teams */}
                            <td className="p-3 sm:p-4 font-bold">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {m.homeTeam.logo ? (
                                    <img loading="lazy" src={m.homeTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                                  ) : null}
                                  <span className="font-black truncate text-gray-900 dark:text-white max-w-[110px]">
                                    {m.homeTeam.name}
                                  </span>
                                </div>
                                <span className="text-gray-400 font-mono text-xs">vs</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {m.awayTeam.logo ? (
                                    <img loading="lazy" src={m.awayTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                                  ) : null}
                                  <span className="font-black truncate text-gray-900 dark:text-white max-w-[110px]">
                                    {m.awayTeam.name}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* League & Date */}
                            <td className="p-3 sm:p-4">
                              <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                                <span>{m.leagueName}</span>
                                {pm.isExternal && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black">
                                    دوري خاص
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 font-medium">
                                {matchDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })} •{' '}
                                {matchDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                            </td>

                            {/* Points per match (Customizable) */}
                            <td className="p-3 sm:p-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-black px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs">
                                  {points} نقاط
                                </span>
                                {!isEvaluated && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPointsMatch(pm);
                                      setCustomPointsValue(points);
                                    }}
                                    className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                                    title="تعديل نقاط المباراة"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Score */}
                            <td className="p-3 sm:p-4 text-center">
                              <span className="font-mono font-black px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-xs border border-gray-200 dark:border-gray-700">
                                {m.homeScore ?? 0} - {m.awayScore ?? 0}
                              </span>
                            </td>

                            {/* Match State */}
                            <td className="p-3 sm:p-4 text-center">
                              {isEvaluated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" />
                                  تم احتساب النقاط
                                </span>
                              ) : m.status === 'LIVE' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 animate-pulse">
                                  <Radio className="w-3 h-3" />
                                  مباشر
                                </span>
                              ) : pm.isOpenForPrediction ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand/10 text-brand">
                                  <Sparkles className="w-3 h-3" />
                                  التوقع مفتوح
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  مغلق
                                </span>
                              )}
                            </td>

                            {/* Participants & View Predictions */}
                            <td className="p-3 sm:p-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingPredictionsForMatch(pm);
                                  setPredictionModalSearch('');
                                  setPredictionModalFilter('all');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 hover:bg-brand/10 hover:text-brand dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
                                title="عرض تفاصيل جميع توقعات المشاركين"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>{pm.participantsCount || pm.predictions?.length || 0} مشارك</span>
                                <Eye className="w-3 h-3" />
                              </button>
                            </td>

                            {/* Manual Result Confirmation & Points Evaluation Button */}
                            <td className="p-3 sm:p-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmingMatch(pm);
                                  setManualHomeScore(m.homeScore ?? 0);
                                  setManualAwayScore(m.awayScore ?? 0);
                                }}
                                className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                                  isEvaluated
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs active:scale-95'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isEvaluated ? 'إعادة احتساب' : `تأكيد (+${points})`}</span>
                              </button>
                            </td>

                            {/* Actions & Archive */}
                            <td className="p-3 sm:p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Open/Close toggle */}
                                <button
                                  type="button"
                                  disabled={isEvaluated}
                                  onClick={() => handleToggleActive(pm.id, pm.isActive)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    isEvaluated
                                      ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800'
                                      : pm.isActive
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 hover:bg-emerald-200 cursor-pointer'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 hover:bg-gray-200 cursor-pointer'
                                  }`}
                                  title={isEvaluated ? 'المباراة معتمدة ومؤرشفة' : 'تغيير حالة فتح التوقع'}
                                >
                                  {isEvaluated ? 'مؤرشفة' : pm.isActive ? 'مفتوح' : 'مغلق'}
                                </button>

                                {/* Archive vs Delete */}
                                {isEvaluated ? (
                                  <span
                                    className="p-2 rounded-lg text-gray-400 bg-gray-100 dark:bg-gray-800 text-xs font-bold inline-flex items-center"
                                    title="تم احتساب النقاط وتوثيق السجل - محفوظة ومؤرشفة لحماية بيانات المتسابقين"
                                  >
                                    <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteModalItem(pm)}
                                    className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 transition-colors cursor-pointer"
                                    title="حذف من مسابقة التوقعات"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                  {filteredMainMatches.map((pm) => {
                    const m = pm.match;
                    if (!m) return null;
                    const matchDate = new Date(m.matchDate);
                    const isEvaluated = pm.isCalculated || pm.isConfirmedByAdmin;
                    const points = pm.pointsPerMatch || 2;

                    return (
                      <div key={pm.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200 text-xs">
                            <span>{m.leagueName}</span>
                            {pm.isExternal && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black">
                                دوري خاص
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-black px-2 py-0.5 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs border border-gray-200 dark:border-gray-700">
                            {m.homeScore ?? 0} - {m.awayScore ?? 0}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {m.homeTeam.logo && <img loading="lazy" src={m.homeTeam.logo} alt="" className="w-5 h-5 object-contain" />}
                            <span className="font-black text-sm text-gray-900 dark:text-white truncate">{m.homeTeam.name}</span>
                          </div>
                          <span className="text-gray-400 font-mono text-xs px-2">vs</span>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="font-black text-sm text-gray-900 dark:text-white truncate text-right">{m.awayTeam.name}</span>
                            {m.awayTeam.logo && <img loading="lazy" src={m.awayTeam.logo} alt="" className="w-5 h-5 object-contain" />}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          {isEvaluated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> محسوبة
                            </span>
                          ) : m.status === 'LIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 animate-pulse">
                              <Radio className="w-3 h-3" /> مباشر
                            </span>
                          ) : pm.isOpenForPrediction ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black bg-brand/10 text-brand">
                              <Sparkles className="w-3 h-3" /> مفتوح
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              <Clock className="w-3 h-3" /> مغلق
                            </span>
                          )}
                          <span className="font-black px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {points} نقاط
                          </span>
                          {!isEvaluated && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPointsMatch(pm);
                                setCustomPointsValue(points);
                              }}
                              className="p-2 rounded bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingPredictionsForMatch(pm);
                              setPredictionModalSearch('');
                              setPredictionModalFilter('all');
                            }}
                            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white hover:bg-brand/10 hover:text-brand dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs transition-colors border border-gray-200 dark:border-gray-700"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{pm.participantsCount || pm.predictions?.length || 0} مشارك</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingMatch(pm);
                              setManualHomeScore(m.homeScore ?? 0);
                              setManualAwayScore(m.awayScore ?? 0);
                            }}
                            className={`flex items-center justify-center gap-1.5 p-2 rounded-lg font-black text-xs transition-all ${
                              isEvaluated
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isEvaluated ? 'إعادة احتساب' : 'تأكيد النتيجة'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUB-TAB 2: ADD MATCHES (Today, Tomorrow & Custom External with Points per Match) */}
      {subTab === 'add_match' && (
        <div className="space-y-6">
          {/* Day selection tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setAddDayTab('today');
                  setSelectedMatchId(null);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'today'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                مباريات اليوم ({availableMatches.filter((m) => new Date(m.matchDate).toISOString().slice(0, 10) === todayDateStr).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddDayTab('tomorrow');
                  setSelectedMatchId(null);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'tomorrow'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                مباريات الغد ({availableMatches.filter((m) => new Date(m.matchDate).toISOString().slice(0, 10) === tomorrowDateStr).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddDayTab('custom');
                  setSelectedMatchId(null);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'custom'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                + إضافة دوري خارجي / مباراة خاصة
              </button>
            </div>

            {addDayTab !== 'custom' && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالفريق أو البطولة..."
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Form for Custom External Match */}
          {addDayTab === 'custom' ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs">
              <div className="mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  إضافة مباراة دوري خارجي أو بطولة خاصة
                </h3>
                <p className="text-xs text-gray-400 font-bold mt-1">
                  أدخل تفاصيل المباراة التي ترغب بإتاحتها للتوقع مع تحديد نقاط الفوز المخصصة لها.
                </p>
              </div>

              <form onSubmit={handleAddCustomMatch} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      اسم الدوري / البطولة *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الدوري العراقي الممتاز"
                      value={customMatch.leagueName}
                      onChange={(e) => setCustomMatch({ ...customMatch, leagueName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      رابط شعار البطولة (اختياري)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={customMatch.leagueLogo}
                      onChange={(e) => setCustomMatch({ ...customMatch, leagueLogo: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      الفريق المضيف (صاحب الأرض) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: القوة الجوية"
                      value={customMatch.homeTeamName}
                      onChange={(e) => setCustomMatch({ ...customMatch, homeTeamName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      شعار الفريق المضيف (اختياري)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={customMatch.homeTeamLogo}
                      onChange={(e) => setCustomMatch({ ...customMatch, homeTeamLogo: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      الفريق الضيف *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الزوراء"
                      value={customMatch.awayTeamName}
                      onChange={(e) => setCustomMatch({ ...customMatch, awayTeamName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      شعار الفريق الضيف (اختياري)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={customMatch.awayTeamLogo}
                      onChange={(e) => setCustomMatch({ ...customMatch, awayTeamLogo: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      موعد وتاريخ انطلاق المباراة *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={customMatch.matchDate}
                      onChange={(e) => setCustomMatch({ ...customMatch, matchDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      نقاط المباراة للمتوقع الفائز *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={customMatch.pointsPerMatch}
                        onChange={(e) => setCustomMatch({ ...customMatch, pointsPerMatch: parseInt(e.target.value, 10) || 2 })}
                        className="w-24 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-black text-center text-gray-900 dark:text-white"
                      />
                      <div className="flex items-center gap-1">
                        {[2, 3, 5, 10].map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setCustomMatch({ ...customMatch, pointsPerMatch: pts })}
                            className={`px-2 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              customMatch.pointsPerMatch === pts
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            +{pts}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>إضافة المباراة الخاصة للتوقعات</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Match Selection Grid for Today/Tomorrow with Points Configuration */
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    اختر مباراة، وحدد نقاطها:
                  </span>
                  {selectedMatchId && (
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
                      <span className="text-xs font-black text-purple-700 dark:text-purple-300">النقاط:</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={selectedMatchPoints}
                        onChange={(e) => setSelectedMatchPoints(parseInt(e.target.value, 10) || 2)}
                        className="w-16 text-center py-0.5 rounded-lg border border-purple-300 dark:border-purple-700 font-black text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <div className="flex items-center gap-1">
                        {[2, 3, 5, 10].map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setSelectedMatchPoints(pts)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-black cursor-pointer ${
                              selectedMatchPoints === pts
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                            }`}
                          >
                            +{pts}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!selectedMatchId || isActionLoading}
                  onClick={handleAddSelectedMatch}
                  className="px-5 py-2 rounded-xl bg-brand text-white font-black text-xs hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إضافة المباراة المحددة ({selectedMatchPoints} نقاط)</span>
                </button>
              </div>

              {filteredAvailableMatches.length === 0 ? (
                <div className="text-center py-14 text-gray-400 font-bold text-xs">
                  لا توجد مباريات مطابقة لتاريخ {addDayTab === 'today' ? 'اليوم' : 'الغد'}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredAvailableMatches.map((m) => {
                    const isSelected = selectedMatchId === m.id;
                    const isAlreadyAdded = predictionMatches.some((pm) => pm.matchId === m.id);
                    const mDate = new Date(m.matchDate);

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (!isAlreadyAdded) setSelectedMatchId(m.id);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                          isAlreadyAdded
                            ? 'opacity-40 bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                            : isSelected
                            ? 'bg-brand/10 border-brand ring-2 ring-brand/30 cursor-pointer shadow-xs'
                            : 'bg-white dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 hover:border-brand/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                          <span className="truncate max-w-[150px] text-gray-700 dark:text-gray-300 font-black">
                            {m.leagueName}
                          </span>
                          <span>
                            {mDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {m.homeTeam?.logo && (
                              <img loading="lazy" src={m.homeTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                            )}
                            <span className="font-black text-xs text-gray-900 dark:text-white truncate">
                              {m.homeTeam?.name}
                            </span>
                          </div>
                          <span className="text-gray-400 text-xs font-mono">VS</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-xs text-gray-900 dark:text-white truncate">
                              {m.awayTeam?.name}
                            </span>
                            {m.awayTeam?.logo && (
                              <img loading="lazy" src={m.awayTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                            )}
                          </div>
                        </div>

                        {isAlreadyAdded ? (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-center">
                            مضافة مسبقاً لمسابقة التوقعات
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded text-center">
                            تم التحديد (جاهزة للإضافة بـ {selectedMatchPoints} نقاط)
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. SUB-TAB 3: PARTICIPANTS MANAGEMENT */}
      {subTab === 'participants' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand" />
                المتسابقون وطلبات الاشتراك ({participants.length})
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                تحكم في قبول أو رفض طلبات الانضمام لمسابقة التوقعات وإدارة حالات الحسابات.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="flex items-center bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setParticipantFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    participantFilter === 'all' ? 'bg-brand text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    participantFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  قيد المراجعة ({pendingParticipantsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantFilter('approved')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    participantFilter === 'approved' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  المعتمدون
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantFilter('blocked')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    participantFilter === 'blocked' ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  المحظورون
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو البريد..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="pr-8 pl-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Participants Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-14 px-4 text-gray-400 font-bold text-xs">
                لا يوجد متسابقون يطابقون الفلتر الحالي.
              </div>
            ) : (
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 text-[11px] sm:text-xs">
                        <th className="p-3 sm:p-4 font-black">المتسابق</th>
                        <th className="p-3 sm:p-4 font-black">البريد الإلكتروني</th>
                        <th className="p-3 sm:p-4 font-black text-center">الحالة</th>
                        <th className="p-3 sm:p-4 font-black">تاريخ التقديم</th>
                        <th className="p-3 sm:p-4 font-black">ملاحظات المتسابق</th>
                        <th className="p-3 sm:p-4 font-black text-center">إجراءات الاعتماد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredParticipants.map((part) => {
                        const u = part.user;
                        const status = part.status;

                        return (
                          <tr key={part.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 sm:p-4 font-bold">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0">
                                  {u?.avatar ? (
                                    <img loading="lazy" src={u.avatar} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (u?.name || 'U').charAt(0)
                                  )}
                                </div>
                                <span className="text-gray-900 dark:text-white font-black">{u?.name || 'مستخدم'}</span>
                              </div>
                            </td>

                            <td className="p-3 sm:p-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                              {u?.email}
                            </td>

                            <td className="p-3 sm:p-4 text-center">
                              {status === 'approved' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  معتمد
                                </span>
                              ) : status === 'pending' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                                  قيد المراجعة
                                </span>
                              ) : status === 'rejected' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  مرفوض
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                                  محظور
                                </span>
                              )}
                            </td>

                            <td className="p-3 sm:p-4 text-xs text-gray-400">
                              {part.appliedAt ? new Date(part.appliedAt).toLocaleDateString('ar-EG') : '-'}
                            </td>

                            <td className="p-3 sm:p-4 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate">
                              {part.notes || '-'}
                            </td>

                            <td className="p-3 sm:p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                    title="اعتماد المشاركة"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>اعتماد</span>
                                  </button>
                                )}

                                {status !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParticipantStatus(part.id, 'rejected')}
                                    className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="رفض الطلب"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>رفض</span>
                                  </button>
                                )}

                                {status !== 'blocked' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParticipantStatus(part.id, 'blocked')}
                                    className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 transition-colors cursor-pointer"
                                    title="حظر المستخدم من المسابقة"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs cursor-pointer"
                                    title="إلغاء الحظر"
                                  >
                                    إلغاء الحظر
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                  {filteredParticipants.map((part) => {
                    const u = part.user;
                    const status = part.status;

                    return (
                      <div key={part.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0">
                              {u?.avatar ? (
                                <img loading="lazy" src={u.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (u?.name || 'U').charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="text-gray-900 dark:text-white font-black text-sm">{u?.name || 'مستخدم'}</div>
                              <div className="font-mono text-[10px] text-gray-500">{u?.email}</div>
                            </div>
                          </div>
                          <div>
                            {status === 'approved' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                معتمد
                              </span>
                            ) : status === 'pending' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                                قيد المراجعة
                              </span>
                            ) : status === 'rejected' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                مرفوض
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                                محظور
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                          <div className="font-bold text-gray-400 mb-1">ملاحظات المتسابق:</div>
                          {part.notes || 'لا يوجد ملاحظات'}
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-[10px] text-gray-400">
                            {part.appliedAt ? new Date(part.appliedAt).toLocaleDateString('ar-EG') : '-'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] flex items-center gap-1 transition-colors"
                              >
                                <UserCheck className="w-3 h-3" /> اعتماد
                              </button>
                            )}

                            {status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateParticipantStatus(part.id, 'rejected')}
                                className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-200 font-bold text-[10px] flex items-center gap-1 transition-colors"
                              >
                                <UserX className="w-3 h-3" /> رفض
                              </button>
                            )}

                            {status !== 'blocked' ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateParticipantStatus(part.id, 'blocked')}
                                className="p-2 rounded text-red-600 bg-red-50 dark:bg-red-950"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]"
                              >
                                إلغاء الحظر
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 4: CONTEST SETTINGS */}
      {subTab === 'settings' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs max-w-2xl">
          <div className="mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand" />
              إعدادات مسابقة التوقعات
            </h3>
            <p className="text-xs text-gray-400 font-bold mt-1">
              التحكم في عنوان المسابقة، حالتها، ووصفها وقواعد النقاط الافتراضية.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                اسم المسابقة
              </label>
              <input
                type="text"
                required
                value={contestSettings.name}
                onChange={(e) => setContestSettings({ ...contestSettings, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                وصف المسابقة والشروط
              </label>
              <textarea
                rows={3}
                value={contestSettings.description}
                onChange={(e) => setContestSettings({ ...contestSettings, description: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  حالة المسابقة
                </label>
                <select
                  value={contestSettings.status}
                  onChange={(e) => setContestSettings({ ...contestSettings, status: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                >
                  <option value="active">نشطة ومتاحة للتوقعات (Active)</option>
                  <option value="registration_only">فتح التسجيل فقط (Registration Only)</option>
                  <option value="paused">موقوفة مؤقتاً (Paused)</option>
                  <option value="completed">منتهية (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  نقاط التوقع الافتراضية
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={contestSettings.pointsPerCorrectScore}
                  onChange={(e) =>
                    setContestSettings({
                      ...contestSettings,
                      pointsPerCorrectScore: parseInt(e.target.value, 10) || 2,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                type="submit"
                disabled={isActionLoading}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ التغييرات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. MODAL: Manual Result Confirmation & Safe Recalculation */}
      {confirmingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {confirmingMatch.isCalculated || confirmingMatch.isConfirmedByAdmin
                    ? 'إعادة احتساب النتيجة وتعديل النقاط'
                    : 'اعتماد النتيجة واحتساب النقاط'}
                </h3>
                <p className="text-xs text-gray-400 font-bold">
                  {confirmingMatch.match?.homeTeam?.name} vs {confirmingMatch.match?.awayTeam?.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmResultAndEvaluate} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-2xl text-center space-y-3">
                <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                  حدد النتيجة النهائية المعتمدة للمباراة:
                </span>

                <div className="flex items-center justify-center gap-4 dir-ltr">
                  <div className="text-center">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 max-w-[90px] truncate">
                      {confirmingMatch.match?.homeTeam?.name}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={manualHomeScore}
                      onChange={(e) => setManualHomeScore(parseInt(e.target.value, 10) || 0)}
                      className="w-16 h-12 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <span className="text-xl font-black text-gray-400 self-end pb-2">:</span>

                  <div className="text-center">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 max-w-[90px] truncate">
                      {confirmingMatch.match?.awayTeam?.name}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={manualAwayScore}
                      onChange={(e) => setManualAwayScore(parseInt(e.target.value, 10) || 0)}
                      className="w-16 h-12 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl text-right">
                  <div>
                    ⚡ سيتم احتساب <strong>+{confirmingMatch.pointsPerMatch || 2} نقاط</strong> فوراً لكل متسابق توقع هذه النتيجة بدقة.
                  </div>
                  {confirmingMatch.pointsPerMatch === 2 && (
                    <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                      🏆 في حال انفرد متسابق واحد فقط بالتوقع الصحيح، سيحصل تلقائياً على نقطة ذهبية إضافية (+1).
                    </div>
                  )}
                  {(confirmingMatch.isCalculated || confirmingMatch.isConfirmedByAdmin) && (
                    <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>إعادة الحساب آمنة (Atomic Transaction) وستعيد احتساب سجل النقاط بدقة دون تكرار.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setConfirmingMatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isConfirmingScore}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isConfirmingScore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الاعتماد واحتساب النقاط...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {confirmingMatch.isCalculated || confirmingMatch.isConfirmedByAdmin
                          ? `إعادة الاحتساب (${manualHomeScore}-${manualAwayScore})`
                          : `تأكيد واحتساب (+${confirmingMatch.pointsPerMatch || 2})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: View Match Predictions Details (All 20 Requirements Checked) */}
      {viewingPredictionsForMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <span>توقعات المشاركين ({viewingPredictionsForMatch.predictions?.length || 0})</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                      {viewingPredictionsForMatch.pointsPerMatch || 2} نقاط
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {viewingPredictionsForMatch.match?.homeTeam?.name} vs {viewingPredictionsForMatch.match?.awayTeam?.name} •{' '}
                    {viewingPredictionsForMatch.match?.leagueName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPredictionsForMatch(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Match Meta & Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-center">
              <div>
                <span className="text-[10px] text-gray-400 font-bold block">النتيجة الرسمية</span>
                <span className="text-xs font-black text-gray-900 dark:text-white font-mono">
                  {viewingPredictionsForMatch.match?.homeScore ?? '-'} : {viewingPredictionsForMatch.match?.awayScore ?? '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block">إجمالي المشاركين</span>
                <span className="text-xs font-black text-gray-900 dark:text-white">
                  {viewingPredictionsForMatch.predictions?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block">التوقعات الصحيحة</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {viewingPredictionsForMatch.correctPredictorsCount || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block">التوقع الذهبي</span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                  {viewingPredictionsForMatch.goldenPredictor ? `🏆 ${viewingPredictionsForMatch.goldenPredictor.name}` : '-'}
                </span>
              </div>
            </div>

            {/* Filter & Search inside modal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPredictionModalFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    predictionModalFilter === 'all' ? 'bg-brand text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  الكل ({viewingPredictionsForMatch.predictions?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPredictionModalFilter('correct')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    predictionModalFilter === 'correct' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  الصحيحة ({viewingPredictionsForMatch.predictions?.filter((p) => p.isEvaluated && p.pointsEarned > 0).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPredictionModalFilter('golden')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    predictionModalFilter === 'golden' ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  الذهبية ({viewingPredictionsForMatch.predictions?.filter((p) => p.isGolden).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPredictionModalFilter('incorrect')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    predictionModalFilter === 'incorrect' ? 'bg-gray-700 text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  الخاطئة
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث باسم المتسابق أو البريد..."
                  value={predictionModalSearch}
                  onChange={(e) => setPredictionModalSearch(e.target.value)}
                  className="w-full sm:w-56 pr-8 pl-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Predictions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[260px] max-h-[440px]">
              {filteredModalPredictions.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-bold text-xs">
                  {viewingPredictionsForMatch.predictions?.length === 0
                    ? 'لم يقم أي متسابق بتسجيل توقع لهذه المباراة بعد.'
                    : 'لا توجد نتائج تطابق بحثك أو الفلتر المحدد.'}
                </div>
              ) : (
                filteredModalPredictions.map((p) => {
                  const predDate = new Date(p.createdAt);
                  const isCorrect = p.isEvaluated && p.pointsEarned > 0;
                  const isGolden = p.isGolden;

                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isGolden
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-2xs'
                          : isCorrect
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                          : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200/80 dark:border-gray-700'
                      }`}
                    >
                      {/* User Info (Flat fields: userName, userEmail, userAvatar) */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-brand/10 text-brand flex items-center justify-center font-black text-sm shrink-0 border border-brand/20">
                          {p.userAvatar ? (
                            <img loading="lazy" src={p.userAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (p.userName || 'U').charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                              {p.userName || 'مستخدم'}
                            </span>
                            {isGolden && (
                              <span className="px-2 py-0.2 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center gap-1 shadow-2xs animate-pulse">
                                <Award className="w-3 h-3" />
                                <span>ذهبي</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                            {p.userEmail}
                          </div>
                          {/* Date and Time */}
                          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>
                              {predDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span>•</span>
                            <span>
                              {predDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Prediction & Outcome */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {/* Score */}
                        <div className="text-center">
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5">التوقع</span>
                          <span className="font-mono font-black text-sm px-3 py-1 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-2xs">
                            {p.homeScore} - {p.awayScore}
                          </span>
                        </div>

                        {/* Status / Points Badge */}
                        <div className="text-left sm:text-center min-w-[110px]">
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5">الحالة والنقاط</span>
                          {p.isEvaluated ? (
                            isGolden ? (
                              <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" />
                                <span>+{p.pointsEarned} نقاط (ذهبي)</span>
                              </span>
                            ) : isCorrect ? (
                              <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>+{p.pointsEarned} نقاط (صحيح)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl font-bold text-xs bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>0 نقطة (خاطئ)</span>
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl font-bold text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>بانتظار الاعتماد</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-bold">
                عرض {filteredModalPredictions.length} من أصل {viewingPredictionsForMatch.predictions?.length || 0} توقع
              </span>
              <button
                type="button"
                onClick={() => setViewingPredictionsForMatch(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-bold text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: Edit Points Per Match */}
      {editingPointsMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                تعديل نقاط المباراة
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                {editingPointsMatch.match?.homeTeam?.name} vs {editingPointsMatch.match?.awayTeam?.name}
              </p>
            </div>

            <form onSubmit={handleUpdatePoints} className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={customPointsValue}
                  onChange={(e) => setCustomPointsValue(parseInt(e.target.value, 10) || 2)}
                  className="w-24 text-center text-xl font-black py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <span className="text-sm font-black text-gray-600 dark:text-gray-300">نقاط</span>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                {[2, 3, 5, 10, 15].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setCustomPointsValue(pts)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      customPointsValue === pts
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    +{pts}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingPointsMatch(null)}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingPoints}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-xs cursor-pointer flex items-center gap-1"
                >
                  {isSavingPoints ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ النقاط</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: Delete Prediction Match */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              حذف المباراة من التوقعات؟
            </h3>
            <p className="text-xs text-gray-400 font-bold">
              هل أنت متأكد من حذف مباراة ({deleteModalItem.match?.homeTeam?.name} vs {deleteModalItem.match?.awayTeam?.name})؟ سيتم حذف جميع التوقعات المسجلة عليها.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 rounded-xl font-bold text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => handleDeletePrediction(deleteModalItem)}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-black text-xs hover:bg-red-700 shadow-xs cursor-pointer"
              >
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

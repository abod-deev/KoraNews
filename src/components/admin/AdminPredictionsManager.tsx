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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPredictionsManagerProps {
  token: string | null;
  onShowMessage: (type: 'success' | 'error', text: string) => void;
}

export default function AdminPredictionsManager({
  token,
  onShowMessage,
}: AdminPredictionsManagerProps) {
  // Sub-tabs inside Predictions Admin
  const [subTab, setSubTab] = useState<'matches' | 'add_match' | 'participants' | 'settings'>('matches');

  // Matches Data
  const [predictionMatches, setPredictionMatches] = useState<any[]>([]);
  const [availableMatches, setAvailableMatches] = useState<any[]>([]);
  const [addDayTab, setAddDayTab] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Manual Result Confirmation State
  const [confirmingMatch, setConfirmingMatch] = useState<any | null>(null);
  const [manualHomeScore, setManualHomeScore] = useState<number>(0);
  const [manualAwayScore, setManualAwayScore] = useState<number>(0);
  const [isConfirmingScore, setIsConfirmingScore] = useState(false);

  // External Custom Match Form State
  const [customMatch, setCustomMatch] = useState({
    leagueName: '',
    leagueLogo: '',
    homeTeamName: '',
    homeTeamLogo: '',
    awayTeamName: '',
    awayTeamLogo: '',
    matchDate: new Date().toISOString().slice(0, 16),
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

  // UI / Action loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [viewingPredictionsForMatch, setViewingPredictionsForMatch] = useState<any | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<any | null>(null);

  // Fetch prediction matches
  const fetchPredictionMatches = async () => {
    try {
      const res = await fetch('/api/admin/predictions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPredictionMatches(await res.json());
    } catch (e) {}
  };

  // Fetch available matches for today/tomorrow
  const fetchAvailableMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) setAvailableMatches(await res.json());
    } catch (e) {}
  };

  // Fetch contest participants
  const fetchParticipants = async () => {
    try {
      const res = await fetch('/api/admin/predictions/participants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setParticipants(await res.json());
    } catch (e) {}
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
    } catch (e) {}
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchPredictionMatches(),
      fetchAvailableMatches(),
      fetchParticipants(),
      fetchContestSettings(),
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (token) loadAll();
  }, [token]);

  // Add match from KoraNews database
  const handleAddSelectedMatch = async () => {
    if (!selectedMatchId) {
      onShowMessage('error', 'يرجى اختيار مباراة من القائمة أولاً');
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
        body: JSON.stringify({ matchId: selectedMatchId }),
      });

      const data = await res.json();
      if (!res.ok) {
        onShowMessage('error', data.error || 'فشل في إضافة المباراة');
      } else {
        onShowMessage('success', 'تمت إضافة المباراة لمسابقات التوقع بنجاح');
        setSelectedMatchId(null);
        fetchPredictionMatches();
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

    setIsActionLoading(true);
    try {
      const res = await fetch('/api/admin/predictions/custom-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(customMatch),
      });

      const data = await res.json();
      if (!res.ok) {
        onShowMessage('error', data.error || 'فشل في إضافة المباراة الخاصة');
      } else {
        onShowMessage('success', 'تمت إضافة مباراة الدوري الخاص لمسابقة التوقعات بنجاح');
        setCustomMatch({
          leagueName: '',
          leagueLogo: '',
          homeTeamName: '',
          homeTeamLogo: '',
          awayTeamName: '',
          awayTeamLogo: '',
          matchDate: new Date().toISOString().slice(0, 16),
        });
        fetchPredictionMatches();
        setSubTab('matches');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Toggle active state
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
        onShowMessage('success', !currentActive ? 'تم فتح التوقع للمباراة' : 'تم إغلاق التوقع للمباراة');
        fetchPredictionMatches();
      } else {
        const data = await res.json();
        onShowMessage('error', data.error || 'فشل في تعديل حالة التوقع');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    }
  };

  // Delete prediction match
  const handleDeletePrediction = async (id: number) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        onShowMessage('success', 'تم حذف المباراة من مسابقة التوقعات');
        setDeleteModalItem(null);
        fetchPredictionMatches();
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

  // Manual Result Confirmation & Point Evaluation (Req 3)
  const handleConfirmResultAndEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingMatch) return;

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
        onShowMessage(
          'success',
          `تم اعتماد النتيجة (${manualHomeScore} - ${manualAwayScore}) واحتساب النقاط لـ ${data.correctPredictorsCount} متسابق (+2 نقطة)!`
        );
        setConfirmingMatch(null);
        fetchPredictionMatches();
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
        fetchParticipants();
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
        fetchContestSettings();
      } else {
        onShowMessage('error', data.error || 'فشل في حفظ إعدادات المسابقة');
      }
    } catch (e: any) {
      onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter available matches by Today vs Tomorrow
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowDateStr = tomorrowObj.toISOString().slice(0, 10);

  const filteredAvailableMatches = availableMatches.filter((m) => {
    const mDateStr = new Date(m.matchDate).toISOString().slice(0, 10);
    if (addDayTab === 'today') {
      return mDateStr === todayDateStr;
    }
    if (addDayTab === 'tomorrow') {
      return mDateStr === tomorrowDateStr;
    }
    return true;
  }).filter((m) => {
    if (!matchSearchQuery.trim()) return true;
    const q = matchSearchQuery.toLowerCase();
    const home = (m.homeTeam?.name || '').toLowerCase();
    const away = (m.awayTeam?.name || '').toLowerCase();
    const league = (m.leagueName || '').toLowerCase();
    return home.includes(q) || away.includes(q) || league.includes(q);
  });

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchesStatus = participantFilter === 'all' || p.status === participantFilter;
    const q = participantSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (p.user?.name || '').toLowerCase().includes(q) ||
      (p.user?.email || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingParticipantsCount = participants.filter((p) => p.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
        {[
          { id: 'matches', label: 'مباريات التوقعات واعتماد النتائج', icon: Trophy, count: predictionMatches.length },
          { id: 'add_match', label: 'إضافة مباريات (اليوم / الغد / دوري خاص)', icon: Plus },
          {
            id: 'participants',
            label: 'المتسابقون وطلبات الاشتراك',
            icon: Users,
            badge: pendingParticipantsCount > 0 ? pendingParticipantsCount : undefined,
          },
          { id: 'settings', label: 'إعدادات المسابقة', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                active
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {tab.count}
                </span>
              )}
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {tab.badge} جديد
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. SUB-TAB 1: MATCHES LIST & MANUAL EVALUATION */}
      {subTab === 'matches' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand" />
                المباريات المدرجة في مسابقة التوقعات ({predictionMatches.length})
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                يمكنك مراجعة وتأكيد النتائج النهائية يدوياً لاحتساب وتوزيع نقاط المتوقعين بدقة (+2 نقطة).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubTab('add_match')}
                className="px-4 py-2 rounded-xl bg-brand text-white font-black text-xs hover:bg-emerald-600 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مباراة للتوقع</span>
              </button>
            </div>
          </div>

          {/* Matches Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            {predictionMatches.length === 0 ? (
              <div className="text-center py-16 px-4 text-gray-400 font-bold text-xs">
                لم تتم إضافة أي مباراة بعد. اضغط على "إضافة مباراة للتوقع" لاختيار مباريات اليوم أو الغد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 text-[11px] sm:text-xs">
                      <th className="p-3 sm:p-4 font-black">المباراة</th>
                      <th className="p-3 sm:p-4 font-black">البطولة والموعد</th>
                      <th className="p-3 sm:p-4 font-black text-center">النتيجة المسجلة</th>
                      <th className="p-3 sm:p-4 font-black text-center">حالة المباراة</th>
                      <th className="p-3 sm:p-4 font-black text-center">المشاركون</th>
                      <th className="p-3 sm:p-4 font-black text-center">اعتماد النتيجة والنقاط</th>
                      <th className="p-3 sm:p-4 font-black text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {predictionMatches.map((pm) => {
                      const m = pm.match;
                      if (!m) return null;
                      const matchDate = new Date(m.matchDate);
                      const isEvaluated = pm.isEvaluated;
                      const isFinished = m.status === 'FINISHED' || isEvaluated;

                      return (
                        <tr key={pm.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          {/* Teams */}
                          <td className="p-3 sm:p-4 font-bold">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {m.homeTeam.logo ? (
                                  <img src={m.homeTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                                ) : null}
                                <span className="font-black truncate text-gray-900 dark:text-white max-w-[110px]">
                                  {m.homeTeam.name}
                                </span>
                              </div>
                              <span className="text-gray-400 font-mono text-xs">vs</span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                {m.awayTeam.logo ? (
                                  <img src={m.awayTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
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
                                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black">
                                  دوري خاص
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-medium">
                              {matchDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} •{' '}
                              {matchDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          </td>

                          {/* Score */}
                          <td className="p-3 sm:p-4 text-center">
                            <span className="font-mono font-black px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-xs">
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
                            ) : pm.isActive ? (
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

                          {/* Participants */}
                          <td className="p-3 sm:p-4 text-center">
                            <button
                              type="button"
                              onClick={() => setViewingPredictionsForMatch(pm)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs transition-colors cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-gray-500" />
                              <span>{pm.participantsCount} مشارك</span>
                              <Eye className="w-3 h-3 text-gray-400" />
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
                              className={`px-3 py-1 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                                isEvaluated
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs active:scale-95'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isEvaluated ? 'تعديل/إعادة احتساب' : 'تأكيد النتيجة واحتساب'}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="p-3 sm:p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(pm.id, pm.isActive)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  pm.isActive
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                }`}
                                title="تغيير حالة فتح التوقع"
                              >
                                {pm.isActive ? 'مفتوح' : 'مغلق'}
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteModalItem(pm)}
                                className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 transition-colors cursor-pointer"
                                title="حذف من مسابقة التوقعات"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUB-TAB 2: ADD MATCHES (Today, Tomorrow & Custom External) */}
      {subTab === 'add_match' && (
        <div className="space-y-6">
          {/* Day selection tabs */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddDayTab('today')}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'today'
                    ? 'bg-brand text-white'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                مباريات اليوم ({availableMatches.filter((m) => new Date(m.matchDate).toISOString().slice(0, 10) === todayDateStr).length})
              </button>
              <button
                type="button"
                onClick={() => setAddDayTab('tomorrow')}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'tomorrow'
                    ? 'bg-brand text-white'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                مباريات الغد ({availableMatches.filter((m) => new Date(m.matchDate).toISOString().slice(0, 10) === tomorrowDateStr).length})
              </button>
              <button
                type="button"
                onClick={() => setAddDayTab('custom')}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                + إضافة دوري خاص / مباراة مخصصة
              </button>
            </div>

            {addDayTab !== 'custom' && (
              <div className="relative w-64 hidden sm:block">
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
                  أدخل تفاصيل المباراة التي ترغب بإتاحتها للتوقع حتى وإن لم تكن متوفرة في جداول الـ API الأساسية.
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

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    موعد وتاريخ انطلاق المباراة *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={customMatch.matchDate}
                    onChange={(e) => setCustomMatch({ ...customMatch, matchDate: e.target.value })}
                    className="w-full sm:w-64 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  />
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
            /* Match Selection Grid for Today/Tomorrow */
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">
                  اختر مباراة لإضافتها لمسابقة التوقعات:
                </span>
                <button
                  type="button"
                  disabled={!selectedMatchId || isActionLoading}
                  onClick={handleAddSelectedMatch}
                  className="px-5 py-2 rounded-xl bg-brand text-white font-black text-xs hover:bg-emerald-600 disabled:opacity-40 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إضافة المباراة المحددة</span>
                </button>
              </div>

              {filteredAvailableMatches.length === 0 ? (
                <div className="text-center py-14 text-gray-400 font-bold text-xs">
                  لا توجد مباريات مطابقة لتاريخ {addDayTab === 'today' ? 'اليوم' : 'الغد'}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
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
                            ? 'bg-brand/10 border-brand ring-2 ring-brand/30 cursor-pointer'
                            : 'bg-white dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 hover:border-brand/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                          <span className="truncate max-w-[150px] text-gray-700 dark:text-gray-300 font-black">
                            {m.leagueName}
                          </span>
                          <span>
                            {mDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {m.homeTeam?.logo && (
                              <img src={m.homeTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
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
                              <img src={m.awayTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                            )}
                          </div>
                        </div>

                        {isAlreadyAdded && (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-center">
                            مضافة مسبقاً لمسابقة التوقعات
                          </span>
                        )}
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
              <div className="overflow-x-auto">
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
                                  <img src={u.avatar} alt="" className="w-full h-full object-cover" />
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
                                  className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 transition-colors cursor-pointer"
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
              التحكم في عنوان المسابقة، حالتها، ووصفها وقواعدها.
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
                  نقاط التوقع الصحيح (+2 نقطة افتراضياً)
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

      {/* 6. MODAL: Manual Result Confirmation & Points Evaluation */}
      {confirmingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  اعتماد النتيجة واحتساب النقاط
                </h3>
                <p className="text-xs text-gray-400 font-bold">
                  {confirmingMatch.match?.homeTeam?.name} vs {confirmingMatch.match?.awayTeam?.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmResultAndEvaluate} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-2xl text-center space-y-3">
                <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                  حدد النتيجة النهائية المعتمدة:
                </span>

                <div className="flex items-center justify-center gap-4 dir-ltr">
                  <div className="text-center">
                    <div className="text-[11px] font-bold text-gray-400 mb-1">
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
                    <div className="text-[11px] font-bold text-gray-400 mb-1">
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

                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
                  ⚡ سيتم فحص جميع توقعات المسجلين وإضافة +2 نقطة فوراً لأصحاب التوقع الدقيق.
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
                      <span>جاري الاحتساب...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تأكيد واحتساب النقاط (+2)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: View Match Predictions */}
      {viewingPredictionsForMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-brand" />
                <div>
                  <h3 className="font-black text-base text-gray-900 dark:text-white">
                    توقعات المشاركين ({viewingPredictionsForMatch.participantsCount})
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    {viewingPredictionsForMatch.match?.homeTeam?.name} vs {viewingPredictionsForMatch.match?.awayTeam?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPredictionsForMatch(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 custom-scrollbar min-h-[200px]">
              {(!viewingPredictionsForMatch.predictions || viewingPredictionsForMatch.predictions.length === 0) ? (
                <div className="text-center py-12 text-gray-400 font-bold text-xs">
                  لا توجد توقعات مسجلة لهذه المباراة حتى الآن.
                </div>
              ) : (
                viewingPredictionsForMatch.predictions.map((p: any) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      p.isEvaluated && p.pointsEarned === 2
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                        : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200/80 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0">
                        {p.user?.avatar ? (
                          <img src={p.user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (p.user?.name || 'U').charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-xs text-gray-900 dark:text-white truncate">
                          {p.user?.name || 'مستخدم'}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {p.user?.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                        {p.homeScore} - {p.awayScore}
                      </div>

                      {p.isEvaluated ? (
                        p.pointsEarned === 2 ? (
                          <span className="px-2 py-0.5 rounded-lg font-black text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            +2 نقطة (صحيح) ✅
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            0 نقطة (خاطئ) ❌
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          بانتظار الاعتماد
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPredictionsForMatch(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: Delete Prediction Match */}
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
                onClick={() => handleDeletePrediction(deleteModalItem.id)}
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

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Loader2,
  RotateCw,
  Eye,
  CheckCircle,
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
  X,
  Shield,
  PlusCircle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  History,
  RefreshCw,
  BarChart3,
  ListOrdered,
  Calculator,
  TrendingUp,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../common/ConfirmModal';
import TeamLogoPickerModal from './TeamLogoPickerModal';
import AdminAccessDenied from './AdminAccessDenied';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';
import {
  matchTeamFromCatalog,
  searchTeamsFromCatalog,
  matchLeagueFromCatalog,
  SAUDI_TEAMS,
  SAUDI_LEAGUES,
  NATIONAL_TEAMS,
  ARAB_AND_GLOBAL_CLUBS,
  ALL_KNOWN_TEAMS,
  ALL_KNOWN_LEAGUES,
  normalizeSportsName,
  isNationalTournament,
  isSaudiTournament,
  isNationalTeam,
  getSuggestedTeamsForLeague,
} from '../../services/knownTeamsAndLeagues';

interface AdminPredictionsManagerProps {
  token: string | null;
  onShowMessage: (type: 'success' | 'error', text: string) => void;
  activeSubTab?: 'matches' | 'add_match' | 'participants' | 'settings' | 'completed_contests';
  hideTabs?: boolean;
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
  activeSubTab,
  hideTabs = false
}: AdminPredictionsManagerProps) {
  const { isOwner, isManager, hasPermission, hasAnyPermission } = useAuth();

  const canViewPredictions = isOwner || isManager || hasAnyPermission(
    PERMISSIONS.PREDICTIONS_VIEW,
    PERMISSIONS.PREDICTIONS_MANAGE,
    PERMISSIONS.PREDICTIONS_MATCH_ADD,
    PERMISSIONS.PREDICTIONS_MATCH_EDIT,
    PERMISSIONS.PREDICTIONS_MATCH_DELETE,
    PERMISSIONS.PREDICTIONS_PARTICIPANTS_MANAGE,
    PERMISSIONS.PREDICTIONS_RESULTS_MANAGE,
    PERMISSIONS.PREDICTIONS_POINTS_MANAGE,
    PERMISSIONS.PREDICTIONS_CONTEST_CREATE,
    PERMISSIONS.PREDICTIONS_CONTEST_END,
    PERMISSIONS.PREDICTIONS_CONTEST_DELETE,
    PERMISSIONS.MATCHES_VIEW,
    PERMISSIONS.MATCHES_MANAGE
  );
  const canAddMatch = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_MATCH_ADD);
  const canEditMatch = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_MATCH_EDIT);
  const canDeleteMatch = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_MATCH_DELETE);
  const canManageResults = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_RESULTS_MANAGE);
  const canManagePoints = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_POINTS_MANAGE);
  const canManageParticipants = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_PARTICIPANTS_MANAGE);
  const canManageContest = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_MANAGE);
  const canCreateContest = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_CONTEST_CREATE);
  const canEndContest = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_CONTEST_END);
  const canDeleteContest = isOwner || isManager || hasPermission(PERMISSIONS.PREDICTIONS_CONTEST_DELETE);
  const canSyncMatches = isOwner || isManager;

  // Sub-tabs inside Predictions Admin
  const [subTab, setSubTab] = useState<'matches' | 'add_match' | 'participants' | 'completed_contests' | 'settings'>(activeSubTab || 'matches');

  useEffect(() => {
    if (activeSubTab) {
      setSubTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (subTab === 'add_match' && !canAddMatch) {
      setSubTab('matches');
    } else if (subTab === 'settings' && !canManageContest) {
      setSubTab('matches');
    }
  }, [subTab, canAddMatch, canManageContest]);

  // Matches Data
  const [predictionMatches, setPredictionMatches] = useState<PredictionMatchItem[]>([]);
  const [availableMatches, setAvailableMatches] = useState<any[]>([]);
  const [addDayTab, setAddDayTab] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [selectedMatchPoints, setSelectedMatchPoints] = useState<number>(2);

  // Filter in main matches tab
  const [mainMatchesFilter, setMainMatchesFilter] = useState<'all' | 'pending' | 'calculated' | 'open'>('all');
  const [mainMatchesSearch, setMainMatchesSearch] = useState('');

  // Manual Result Confirmation State
  const [confirmingMatch, setConfirmingMatch] = useState<PredictionMatchItem | null>(null);
  const [manualHomeScore, setManualHomeScore] = useState<number>(0);
  const [manualAwayScore, setManualAwayScore] = useState<number>(0);
  const [confirmingMatchStatus, setConfirmingMatchStatus] = useState<string>('FINISHED');
  const [isConfirmingScore, setIsConfirmingScore] = useState(false);

  // Edit Prediction Match Full Details Modal State
  const [editingMatch, setEditingMatch] = useState<PredictionMatchItem | null>(null);
  const [editingMatchForm, setEditingMatchForm] = useState({
    homeTeamName: '',
    homeTeamLogo: '',
    awayTeamName: '',
    awayTeamLogo: '',
    leagueName: '',
    leagueLogo: '',
    matchDate: '',
    pointsPerMatch: 2,
    homeScore: '' as number | string,
    awayScore: '' as number | string,
    status: 'SCHEDULED',
    isActive: true,
  });
  const [isSavingMatchEdit, setIsSavingMatchEdit] = useState(false);

  // Existing Teams & Leagues in System (for auto-complete and zero duplication)
  const [existingData, setExistingData] = useState<{
    leagues: Array<{ id: string; name: string; logo: string | null }>;
    teams: Array<{ id: string; name: string; logo: string | null }>;
  }>({ leagues: [], teams: [] });

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

  // Participants Data & Advanced Sorting
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantFilter, setParticipantFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'blocked'>('all');
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSortBy, setParticipantSortBy] = useState<'points' | 'correct' | 'incorrect' | 'golden' | 'accuracy' | 'total' | 'date' | 'name'>('points');
  const [participantSortDir, setParticipantSortDir] = useState<'desc' | 'asc'>('desc');

  // Participant Predictions History Modal State
  const [inspectingUser, setInspectingUser] = useState<{ id: number; name: string; email?: string; avatar?: string | null } | null>(null);
  const [inspectingUserPredictions, setInspectingUserPredictions] = useState<any[]>([]);
  const [isLoadingUserHistory, setIsLoadingUserHistory] = useState(false);
  const [isRecalculatingAll, setIsRecalculatingAll] = useState(false);

  // Active Contest Management Data
  const [activeContest, setActiveContest] = useState<{
    id: number;
    name: string;
    description: string | null;
    status: string;
    participantsCount: number;
    matchesCount: number;
    createdAt?: string;
  } | null>(null);
  const [selectedAdminContestId, setSelectedAdminContestId] = useState<number | null>(null);
  const [allContests, setAllContests] = useState<
    Array<{
      id: number;
      name: string;
      description: string | null;
      status: string;
      createdAt?: string;
    }>
  >([]);
  const [isCreateContestModalOpen, setIsCreateContestModalOpen] = useState(false);
  const [newContestName, setNewContestName] = useState('');
  const [newContestDescription, setNewContestDescription] = useState('');
  const [isCreatingContest, setIsCreatingContest] = useState(false);

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

  // Unified Confirmation Dialog State for all admin contest actions
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'تأكيد',
    cancelText: 'إلغاء',
    variant: 'warning',
    isLoading: false,
    onConfirm: () => {},
  });

  const requestConfirmation = ({
    title,
    message,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    variant = 'warning',
    onConfirm,
  }: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void> | void;
  }) => {
    setConfirmModalConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      variant,
      isLoading: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await onConfirm();
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch {
          setConfirmModalConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  // Create League Modal State
  const [isCreateLeagueModalOpen, setIsCreateLeagueModalOpen] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueLogo, setNewLeagueLogo] = useState('');
  const [isCreatingLeague, setIsCreatingLeague] = useState(false);

  // Create Team Modal State
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Add Participant Prediction Modal State
  const [isAddUserPredModalOpen, setIsAddUserPredModalOpen] = useState(false);
  const [newPredUserId, setNewPredUserId] = useState('');
  const [newPredHomeScore, setNewPredHomeScore] = useState('');
  const [newPredAwayScore, setNewPredAwayScore] = useState('');
  const [isSavingUserPred, setIsSavingUserPred] = useState(false);

  // Edit Participant Prediction Modal State
  const [editingUserPred, setEditingUserPred] = useState<PredictionItem | null>(null);
  const [editPredHomeScore, setEditPredHomeScore] = useState('');
  const [editPredAwayScore, setEditPredAwayScore] = useState('');
  const [isUpdatingUserPred, setIsUpdatingUserPred] = useState(false);

  // Visual Team Logo Picker Modal State
  const [logoPickerModal, setLogoPickerModal] = useState<{
    isOpen: boolean;
    target: 'home' | 'away' | 'edit_home' | 'edit_away' | null;
    title: string;
    currentLogo: string;
    currentTeamName: string;
    leagueName: string;
  }>({
    isOpen: false,
    target: null,
    title: '',
    currentLogo: '',
    currentTeamName: '',
    leagueName: '',
  });

  // Track if user explicitly confirmed/selected a team to prevent accidental override
  const [homeTeamConfirmed, setHomeTeamConfirmed] = useState(false);
  const [awayTeamConfirmed, setAwayTeamConfirmed] = useState(false);

  const handleSelectLogoFromModal = (logoUrl: string, selectedTeamName?: string) => {
    if (logoPickerModal.target === 'home') {
      setCustomMatch((prev) => ({
        ...prev,
        homeTeamLogo: logoUrl,
        homeTeamName: prev.homeTeamName.trim() ? prev.homeTeamName : (selectedTeamName || prev.homeTeamName),
      }));
      setHomeTeamConfirmed(true);
    } else if (logoPickerModal.target === 'away') {
      setCustomMatch((prev) => ({
        ...prev,
        awayTeamLogo: logoUrl,
        awayTeamName: prev.awayTeamName.trim() ? prev.awayTeamName : (selectedTeamName || prev.awayTeamName),
      }));
      setAwayTeamConfirmed(true);
    } else if (logoPickerModal.target === 'edit_home') {
      setEditingMatchForm((prev) => ({
        ...prev,
        homeTeamLogo: logoUrl,
        homeTeamName: prev.homeTeamName.trim() ? prev.homeTeamName : (selectedTeamName || prev.homeTeamName),
      }));
    } else if (logoPickerModal.target === 'edit_away') {
      setEditingMatchForm((prev) => ({
        ...prev,
        awayTeamLogo: logoUrl,
        awayTeamName: prev.awayTeamName.trim() ? prev.awayTeamName : (selectedTeamName || prev.awayTeamName),
      }));
    }
  };

  // UI / Action loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Resilient fetch helper to gracefully survive server reloads or transient network blips
  const safeFetchJson = async (url: string, options?: RequestInit, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await res.json();
          }
        }
        return null;
      } catch (err: any) {
        if (i < retries) {
          await new Promise((r) => setTimeout(r, 600 * (i + 1)));
          continue;
        }
        console.warn(`[PredictionsManager] Could not load ${url}:`, err?.message || err);
        return null;
      }
    }
    return null;
  };

  // Fetch prediction matches from Backend
  const fetchPredictionMatches = async (targetContestId?: number) => {
    if (!token) return;
    const cid = targetContestId !== undefined ? targetContestId : selectedAdminContestId;
    const url = cid ? `/api/admin/predictions?contestId=${cid}` : '/api/admin/predictions';
    const data = await safeFetchJson(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data && Array.isArray(data)) {
      setPredictionMatches(data);
    }
  };

  // Fetch available matches for selection (Today / Tomorrow / All)
  const fetchAvailableMatches = async (dateFilter: 'today' | 'tomorrow' | 'all' = 'all') => {
    if (!token) return;
    const data = await safeFetchJson(`/api/admin/predictions/available-matches?date=${dateFilter}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data && Array.isArray(data)) {
      setAvailableMatches(data);
    }
  };

  // Fetch contest participants
  const fetchParticipants = async (targetContestId?: number) => {
    if (!token) return;
    const cid = targetContestId !== undefined ? targetContestId : selectedAdminContestId;
    const url = cid ? `/api/admin/predictions/participants?contestId=${cid}` : '/api/admin/predictions/participants';
    const data = await safeFetchJson(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data && Array.isArray(data)) {
      setParticipants(data);
    }
  };

  // Fetch current active contest
  const fetchActiveContest = async () => {
    if (!token) return;
    const data = await safeFetchJson('/api/admin/predictions/active-contest', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data) {
      setActiveContest(data.activeContest || null);
      if (data.activeContest) {
        setContestSettings({
          id: data.activeContest.id,
          name: data.activeContest.name,
          description: data.activeContest.description || '',
          status: data.activeContest.status,
          pointsPerCorrectScore: data.activeContest.pointsPerCorrectScore || 2,
          startDate: '',
          endDate: '',
        });
      }
    }
  };

  // Fetch contest settings
  const fetchContestSettings = async () => {
    const data = await safeFetchJson('/api/predictions/contest/settings');
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
  };

  // Fetch all contests list (for completed contests & archive)
  const fetchAllContests = async () => {
    const data = await safeFetchJson(
      '/api/admin/predictions/contests',
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );
    if (data && Array.isArray(data)) {
      setAllContests(data);
    }
  };

  // Fetch all existing teams and leagues in the system for reuse and zero duplicates
  const fetchExistingTeamsAndLeagues = async () => {
    if (!token) return;
    const data = await safeFetchJson('/api/admin/predictions/teams-and-leagues', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data && typeof data === 'object') {
      setExistingData({
        leagues: Array.isArray(data.leagues) ? data.leagues : [],
        teams: Array.isArray(data.teams) ? data.teams : [],
      });
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchPredictionMatches(),
      fetchAvailableMatches('all'),
      fetchParticipants(),
      fetchActiveContest(),
      fetchAllContests(),
      fetchContestSettings(),
      fetchExistingTeamsAndLeagues(),
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

  // Add selected matches from system database with customized points (multi-select supported)
  const handleAddSelectedMatches = async () => {
    if (!activeContest || activeContest.status !== 'active') {
      onShowMessage('error', 'لا توجد مسابقة نشطة حالياً. لا يمكن إضافة مباريات إلا لمسابقة نشطة.');
      await loadAll();
      return;
    }

    if (selectedMatchIds.length === 0) {
      onShowMessage('error', 'يرجى تحديد مباراة واحدة على الأقل من القائمة أولاً');
      return;
    }

    const pts = Number(selectedMatchPoints) || 2;
    if (pts < 1 || pts > 20) {
      onShowMessage('error', 'نقاط المباراة يجب أن تكون بين 1 و 20 نقطة');
      return;
    }

    const isMultiple = selectedMatchIds.length > 1;
    let confirmMsg = '';
    let confirmTitle = 'إضافة مباراة للتوقعات';
    let confirmButtonText = 'تأكيد الإضافة';

    if (isMultiple) {
      confirmTitle = `إضافة (${selectedMatchIds.length}) مباريات للتوقعات`;
      confirmMsg = `هل أنت متأكد من إتاحة (${selectedMatchIds.length}) مباريات محددة للتوقع في المسابقة بـ (${pts} نقاط لكل مباراة)؟`;
      confirmButtonText = `تأكيد إضافة (${selectedMatchIds.length}) مباريات`;
    } else {
      const matched = availableMatches.find((m) => m.id === selectedMatchIds[0]);
      const matchLabel = matched ? `${matched.homeTeam.name} ضد ${matched.awayTeam.name}` : 'المباراة المحددة';
      confirmMsg = `هل أنت متأكد من إتاحة مباراة (${matchLabel}) للتوقع في المسابقة بـ (${pts} نقاط)؟`;
    }

    requestConfirmation({
      title: confirmTitle,
      message: confirmMsg,
      confirmText: confirmButtonText,
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch('/api/admin/predictions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              matchIds: selectedMatchIds,
              pointsPerMatch: pts,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في إضافة المباريات');
            await loadAll();
          } else {
            const countAdded = data.totalProcessed || selectedMatchIds.length;
            onShowMessage(
              'success',
              isMultiple
                ? `تمت إضافة (${countAdded}) مباريات لمسابقات التوقع بنجاح (${pts} نقاط لكل مباراة)!`
                : `تمت إضافة المباراة لمسابقات التوقع بنجاح (${pts} نقاط)!`
            );
            setSelectedMatchIds([]);
            setSelectedMatchPoints(2);
            await Promise.all([fetchPredictionMatches(), fetchAvailableMatches('all'), fetchActiveContest()]);
            setSubTab('matches');
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
          await loadAll();
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  // Add external custom league match
  const handleAddCustomMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContest || activeContest.status !== 'active') {
      onShowMessage('error', 'لا توجد مسابقة نشطة حالياً. لا يمكن إضافة مباريات إلا لمسابقة نشطة.');
      await loadAll();
      return;
    }

    if (!customMatch.leagueName || !customMatch.homeTeamName || !customMatch.awayTeamName) {
      onShowMessage('error', 'يرجى ملء اسم البطولة واسمي الفريقين');
      return;
    }

    const pts = Number(customMatch.pointsPerMatch) || 2;
    if (pts < 1 || pts > 20) {
      onShowMessage('error', 'نقاط المباراة يجب أن تكون بين 1 و 20 نقطة');
      return;
    }

    requestConfirmation({
      title: 'إضافة مباراة خاصة للتوقعات',
      message: `هل أنت متأكد من إضافة مباراة (${customMatch.homeTeamName} ضد ${customMatch.awayTeamName}) في بطولة (${customMatch.leagueName}) بـ (${pts} نقاط) إلى مسابقة التوقعات؟`,
      confirmText: 'تأكيد الإضافة',
      onConfirm: async () => {
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
            await loadAll();
          } else {
            onShowMessage('success', `تمت إضافة المباراة وتحديث شعارات الفرق المعتمدة بنجاح (${pts} نقاط)!`);
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
            await Promise.all([fetchPredictionMatches(), fetchActiveContest(), fetchExistingTeamsAndLeagues()]);
            setSubTab('matches');
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
          await loadAll();
        } finally {
          setIsActionLoading(false);
        }
      },
    });
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

    requestConfirmation({
      title: 'تعديل نقاط المباراة',
      message: `هل أنت متأكد من تغيير نقاط الفوز لهذه المباراة إلى (${pts} نقاط)؟`,
      confirmText: 'تأكيد التعديل',
      onConfirm: async () => {
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
      },
    });
  };

  // Toggle active state / archive toggle
  const handleToggleActive = async (predictionMatchId: number, currentActive: boolean) => {
    requestConfirmation({
      title: currentActive ? 'تعطيل استقبال التوقعات' : 'تفعيل استقبال التوقعات',
      message: `هل أنت متأكد من ${currentActive ? 'إيقاف' : 'إتاحة'} استقبال توقعات المتسابقين لهذه المباراة؟`,
      confirmText: currentActive ? 'تأكيد الإيقاف' : 'تأكيد التفعيل',
      variant: currentActive ? 'warning' : 'info',
      onConfirm: async () => {
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
      },
    });
  };

  // Delete prediction match (Blocked if already calculated, user gets explanation)
  const handleDeletePrediction = async (item: PredictionMatchItem) => {
    const homeName = item.match?.homeTeam?.name || (item as any).customHomeName || 'الفريق الأول';
    const awayName = item.match?.awayTeam?.name || (item as any).customAwayName || 'الفريق الثاني';

    requestConfirmation({
      title: 'حذف مباراة التوقع',
      message: `هل أنت متأكد من حذف مباراة (${homeName} ضد ${awayName})؟ سيتم حذف جميع التوقعات المسجلة عليها وإلغاء أي نقاط كانت محتسبة لها وتحديث الترتيب العام فوراً دون أي تكرار.`,
      confirmText: 'تأكيد الحذف',
      variant: 'danger',
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch(`/api/admin/predictions/${item.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            onShowMessage('success', 'تم حذف المباراة من مسابقة التوقعات بنجاح وتحديث الترتيب العام');
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
      },
    });
  };

  // Manual Result Confirmation & Safe Recalculation (Zero duplicates)
  const handleConfirmResultAndEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingMatch) return;

    requestConfirmation({
      title: 'تأكيد نتيجة المباراة واحتساب النقاط',
      message: `هل أنت متأكد من حفظ وتأكيد نتيجة المباراة (${manualHomeScore} - ${manualAwayScore})؟ سيتم احتساب نقاط التوقعات للمتسابقين وتحديث الترتيب العام فوراً دون تكرار النقاط.`,
      confirmText: 'اعتماد النتيجة واحتساب النقاط',
      variant: 'warning',
      onConfirm: async () => {
        setIsConfirmingScore(true);
        try {
          const res = await fetch(`/api/admin/predictions/${confirmingMatch.id}/result`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              homeScore: manualHomeScore,
              awayScore: manualAwayScore,
              status: confirmingMatchStatus,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في حفظ وتعديل النتيجة واحتساب النقاط');
          } else {
            onShowMessage(
              'success',
              `تم حفظ وتعديل نتيجة المباراة (${manualHomeScore} - ${manualAwayScore}) بنجاح وإعادة احتساب النقاط بدقة!`
            );
            setConfirmingMatch(null);
            await fetchPredictionMatches();
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
        } finally {
          setIsConfirmingScore(false);
        }
      },
    });
  };

  // Open Edit Prediction Match Modal
  const openEditMatchModal = (item: PredictionMatchItem) => {
    setEditingMatch(item);
    const m = item.match;
    let formattedDate = '';
    const dateSrc = m?.matchDate || item.createdAt;
    try {
      const d = new Date(dateSrc);
      if (!isNaN(d.getTime())) {
        formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
    } catch {
      formattedDate = new Date().toISOString().slice(0, 16);
    }

    setEditingMatchForm({
      homeTeamName: m?.homeTeam?.name || '',
      homeTeamLogo: m?.homeTeam?.logo || '',
      awayTeamName: m?.awayTeam?.name || '',
      awayTeamLogo: m?.awayTeam?.logo || '',
      leagueName: m?.leagueName || '',
      leagueLogo: m?.leagueLogo || '',
      matchDate: formattedDate,
      pointsPerMatch: item.pointsPerMatch || 2,
      homeScore: m?.homeScore !== null && m?.homeScore !== undefined ? m.homeScore : '',
      awayScore: m?.awayScore !== null && m?.awayScore !== undefined ? m.awayScore : '',
      status: m?.status || 'SCHEDULED',
      isActive: item.isActive,
    });
  };

  // Save Edit Prediction Match
  const handleSaveMatchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    if (!editingMatchForm.homeTeamName.trim() || !editingMatchForm.awayTeamName.trim()) {
      onShowMessage('error', 'يرجى إدخال أسماء الفريقين بشكل صحيح');
      return;
    }
    if (!editingMatchForm.leagueName.trim()) {
      onShowMessage('error', 'يرجى إدخال اسم البطولة / الدوري');
      return;
    }
    if (!editingMatchForm.matchDate) {
      onShowMessage('error', 'يرجى تحديد موعد وتاريخ انطلاق المباراة');
      return;
    }

    const pts = Number(editingMatchForm.pointsPerMatch) || 2;
    if (pts < 1 || pts > 20) {
      onShowMessage('error', 'النقاط المحددة للمباراة يجب أن تكون بين 1 و 20 نقطة');
      return;
    }

    requestConfirmation({
      title: 'تعديل تفاصيل التوقع والمباراة',
      message: 'هل أنت متأكد من حفظ التعديلات على بيانات وتفاصيل المباراة في قاعدة البيانات؟',
      confirmText: 'حفظ التعديلات',
      onConfirm: async () => {
        setIsSavingMatchEdit(true);
        try {
          const payload: {
            homeTeamName: string;
            homeTeamLogo?: string | null;
            awayTeamName: string;
            awayTeamLogo?: string | null;
            leagueName: string;
            leagueLogo?: string | null;
            matchDate: string;
            pointsPerMatch: number;
            homeScore: number | null;
            awayScore: number | null;
            status: string;
            isActive: boolean;
          } = {
            homeTeamName: editingMatchForm.homeTeamName.trim(),
            homeTeamLogo: editingMatchForm.homeTeamLogo.trim() || null,
            awayTeamName: editingMatchForm.awayTeamName.trim(),
            awayTeamLogo: editingMatchForm.awayTeamLogo.trim() || null,
            leagueName: editingMatchForm.leagueName.trim(),
            leagueLogo: editingMatchForm.leagueLogo.trim() || null,
            matchDate: editingMatchForm.matchDate,
            pointsPerMatch: pts,
            homeScore: editingMatchForm.homeScore !== '' && editingMatchForm.homeScore !== null ? Number(editingMatchForm.homeScore) : null,
            awayScore: editingMatchForm.awayScore !== '' && editingMatchForm.awayScore !== null ? Number(editingMatchForm.awayScore) : null,
            status: editingMatchForm.status,
            isActive: editingMatchForm.isActive,
          };

          const res = await fetch(`/api/admin/predictions/${editingMatch.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في حفظ تعديلات التوقع والمباراة');
          } else {
            onShowMessage('success', 'تم تعديل وحفظ بيانات التوقع والمباراة في قاعدة البيانات بنجاح!');
            setEditingMatch(null);
            await Promise.all([fetchPredictionMatches(), fetchExistingTeamsAndLeagues()]);
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ أثناء الاتصال بالخادم');
        } finally {
          setIsSavingMatchEdit(false);
        }
      },
    });
  };

  // Participant status update (Approve, Reject, Block)
  const handleUpdateParticipantStatus = (
    participantId: number,
    newStatus: 'pending' | 'approved' | 'rejected' | 'blocked',
    userName?: string
  ) => {
    const actionLabel =
      newStatus === 'approved' ? 'قبول' : newStatus === 'rejected' ? 'رفض' : newStatus === 'blocked' ? 'حظر' : 'تحديث';

    requestConfirmation({
      title: `${actionLabel} المشارك`,
      message: `هل أنت متأكد من ${actionLabel} المتسابق (${userName || 'المحدد'}) في المسابقة؟`,
      confirmText: `تأكيد ${actionLabel}`,
      variant: newStatus === 'blocked' ? 'danger' : 'warning',
      onConfirm: async () => {
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
      },
    });
  };

  // Delete participant from contest
  const handleDeleteParticipant = (participantId: number, userName?: string) => {
    requestConfirmation({
      title: 'حذف المشارك من المسابقة',
      message: `هل أنت متأكد من حذف المتسابق (${userName || 'المحدد'}) نهائياً من مسابقة التوقعات؟`,
      confirmText: 'تأكيد الحذف',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/predictions/participants/${participantId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await res.json();
          if (res.ok) {
            onShowMessage('success', data.message || 'تم حذف المتسابق من المسابقة بنجاح');
            await fetchParticipants();
          } else {
            onShowMessage('error', data.error || 'فشل في حذف المتسابق');
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
        }
      },
    });
  };

  // Add League explicit handler
  const handleCreateLeague = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) {
      onShowMessage('error', 'يرجى إدخال اسم البطولة أو الدوري');
      return;
    }

    requestConfirmation({
      title: 'إضافة دوري / بطولة جديدة',
      message: `هل أنت متأكد من إضافة "${newLeagueName.trim()}" إلى قائمة الدوريات والبطولات؟`,
      confirmText: 'تأكيد الإضافة',
      onConfirm: async () => {
        setIsCreatingLeague(true);
        try {
          const res = await fetch('/api/admin/predictions/leagues', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: newLeagueName.trim(),
              logo: newLeagueLogo.trim() || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في إضافة البطولة');
          } else {
            onShowMessage('success', `تمت إضافة بطولة "${newLeagueName.trim()}" بنجاح!`);
            setCustomMatch((prev) => ({
              ...prev,
              leagueName: newLeagueName.trim(),
              leagueLogo: newLeagueLogo.trim() || prev.leagueLogo,
            }));
            setNewLeagueName('');
            setNewLeagueLogo('');
            setIsCreateLeagueModalOpen(false);
            await fetchExistingTeamsAndLeagues();
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
        } finally {
          setIsCreatingLeague(false);
        }
      },
    });
  };

  // Add Team explicit handler
  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      onShowMessage('error', 'يرجى إدخال اسم الفريق أو المنتخب');
      return;
    }

    requestConfirmation({
      title: 'إضافة فريق أو منتخب جديد',
      message: `هل أنت متأكد من إضافة "${newTeamName.trim()}" إلى قاعدة بيانات الفرق والمنتخبات؟`,
      confirmText: 'تأكيد الإضافة',
      onConfirm: async () => {
        setIsCreatingTeam(true);
        try {
          const res = await fetch('/api/admin/predictions/teams', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: newTeamName.trim(),
              logo: newTeamLogo.trim() || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في إضافة الفريق');
          } else {
            onShowMessage('success', `تمت إضافة الفريق أو المنتخب "${newTeamName.trim()}" بنجاح!`);
            if (!customMatch.homeTeamName) {
              setCustomMatch((prev) => ({
                ...prev,
                homeTeamName: newTeamName.trim(),
                homeTeamLogo: newTeamLogo.trim() || prev.homeTeamLogo,
              }));
            } else if (!customMatch.awayTeamName) {
              setCustomMatch((prev) => ({
                ...prev,
                awayTeamName: newTeamName.trim(),
                awayTeamLogo: newTeamLogo.trim() || prev.awayTeamLogo,
              }));
            }
            setNewTeamName('');
            setNewTeamLogo('');
            setIsCreateTeamModalOpen(false);
            await fetchExistingTeamsAndLeagues();
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
        } finally {
          setIsCreatingTeam(false);
        }
      },
    });
  };

  // Admin Save Participant Prediction
  const handleAdminSaveUserPrediction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingPredictionsForMatch) return;
    const uid = Number(newPredUserId);
    const hScore = Number(newPredHomeScore);
    const aScore = Number(newPredAwayScore);

    if (!uid) {
      onShowMessage('error', 'يرجى اختيار المتسابق من القائمة');
      return;
    }
    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0 || hScore > 30 || aScore > 30) {
      onShowMessage('error', 'يرجى إدخال أرقام صحيحة للأهداف بين 0 و 30');
      return;
    }

    const participantName = participants.find((p) => p.userId === uid)?.userName || 'المتسابق المختار';

    requestConfirmation({
      title: 'إضافة توقع يدوي لمشارك',
      message: `هل أنت متأكد من حفظ التوقع (${hScore} - ${aScore}) للمتسابق "${participantName}"؟ سيتم احتساب النقاط وتحديث الترتيب العام فوراً في حال كانت نتيجة المباراة معتمدة.`,
      confirmText: 'تأكيد الحفظ',
      onConfirm: async () => {
        setIsSavingUserPred(true);
        try {
          const res = await fetch('/api/admin/predictions/user-prediction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: uid,
              predictionMatchId: viewingPredictionsForMatch.id,
              homeScore: hScore,
              awayScore: aScore,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في حفظ التوقع');
          } else {
            onShowMessage('success', data.message || 'تم حفظ التوقع بنجاح واحتساب النقاط!');
            setIsAddUserPredModalOpen(false);
            setNewPredUserId('');
            setNewPredHomeScore('');
            setNewPredAwayScore('');
            await fetchPredictionMatches();
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
        } finally {
          setIsSavingUserPred(false);
        }
      },
    });
  };

  // Admin Update Participant Prediction
  const handleAdminUpdateUserPrediction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserPred) return;
    const hScore = Number(editPredHomeScore);
    const aScore = Number(editPredAwayScore);

    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0 || hScore > 30 || aScore > 30) {
      onShowMessage('error', 'يرجى إدخال أرقام صحيحة للأهداف بين 0 و 30');
      return;
    }

    requestConfirmation({
      title: 'تعديل توقع المشارك',
      message: `هل أنت متأكد من تعديل توقع المتسابق "${editingUserPred.userName}" إلى (${hScore} - ${aScore})؟ سيتم إعادة تقييم النقاط وتحديث الترتيب العام فوراً في حال كانت نتيجة المباراة معتمدة.`,
      confirmText: 'حفظ التعديل',
      onConfirm: async () => {
        setIsUpdatingUserPred(true);
        try {
          const res = await fetch(`/api/admin/predictions/user-prediction/${editingUserPred.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              homeScore: hScore,
              awayScore: aScore,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في تعديل التوقع');
          } else {
            onShowMessage('success', data.message || 'تم تعديل التوقع بنجاح وتحديث النقاط والترتيب!');
            setEditingUserPred(null);
            await fetchPredictionMatches();
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
        } finally {
          setIsUpdatingUserPred(false);
        }
      },
    });
  };

  // Admin Delete Participant Prediction
  const handleAdminDeleteUserPrediction = (predId: number, userName?: string) => {
    requestConfirmation({
      title: 'حذف توقع المشارك',
      message: `هل أنت متأكد من حذف توقع المتسابق (${userName || 'المحدد'})؟ سيتم حذف التوقع وإلغاء أي نقاط كانت محتسبة له وتحديث الترتيب العام فوراً دون أي تكرار.`,
      confirmText: 'تأكيد الحذف',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/predictions/user-prediction/${predId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (!res.ok) {
            onShowMessage('error', data.error || 'فشل في حذف التوقع');
          } else {
            onShowMessage('success', data.message || 'تم حذف التوقع وتحديث الترتيب بنجاح');
            await fetchPredictionMatches();
          }
        } catch (e: any) {
          onShowMessage('error', e.message || 'حدث خطأ في الاتصال');
        }
      },
    });
  };

  // Create Contest Handler (Admin only)
  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newContestName.trim();
    if (!name) {
      onShowMessage('error', 'يرجى إدخال اسم المسابقة');
      return;
    }

    if (activeContest && activeContest.status === 'active') {
      onShowMessage('error', 'توجد مسابقة حالية. يجب إنهاؤها أولًا قبل إنشاء مسابقة جديدة.');
      return;
    }

    setIsCreatingContest(true);
    try {
      const res = await fetch('/api/admin/predictions/contests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: newContestDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل في إنشاء المسابقة');
      }

      onShowMessage('success', 'تم إنشاء المسابقة بنجاح وبدء تفعيلها');
      setIsCreateContestModalOpen(false);
      setNewContestName('');
      setNewContestDescription('');
      await loadAll();
    } catch (err: any) {
      onShowMessage('error', err.message || 'حدث خطأ أثناء إنشاء المسابقة');
    } finally {
      setIsCreatingContest(false);
    }
  };

  // Complete Contest Handler (Admin only)
  const handleCompleteContest = () => {
    if (!activeContest) return;

    requestConfirmation({
      title: 'إنهاء المسابقة',
      message: 'هل أنت متأكد من إنهاء المسابقة؟\nبعد الإنهاء لن يتمكن المستخدمون من تنفيذ العمليات الخاصة بالمسابقة النشطة.',
      confirmText: 'إنهاء المسابقة',
      cancelText: 'إلغاء',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/predictions/contests/${activeContest.id}/complete`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'فشل في إنهاء المسابقة');
          }

          onShowMessage('success', 'تم إنهاء المسابقة بنجاح وأرشفة بياناتها');
          await loadAll();
        } catch (err: any) {
          onShowMessage('error', err.message || 'حدث خطأ أثناء إنهاء المسابقة');
        }
      },
    });
  };

  // Delete Completed Contest Handler (Admin only)
  const handleDeleteContest = (contestId: number, contestName: string) => {
    requestConfirmation({
      title: 'حذف المسابقة',
      message: 'هل أنت متأكد من حذف هذه المسابقة؟\nسيتم حذف بيانات المشاركين والتوقعات والنقاط المرتبطة بها.',
      confirmText: 'تأكيد الحذف',
      cancelText: 'إلغاء',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/predictions/contests/${contestId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'فشل في حذف المسابقة');
          }

          onShowMessage('success', data.message || 'تم حذف المسابقة وجميع بياناتها بنجاح');
          await loadAll();
        } catch (err: any) {
          onShowMessage('error', err.message || 'حدث خطأ أثناء حذف المسابقة');
          await loadAll();
        }
      },
    });
  };

  // Save contest settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    requestConfirmation({
      title: 'حفظ إعدادات المسابقة',
      message: 'هل أنت متأكد من حفظ وتطبيق إعدادات ونقاط مسابقة التوقعات؟',
      confirmText: 'حفظ الإعدادات',
      onConfirm: async () => {
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
      },
    });
  };

  // Inspect Participant Predictions History
  const handleInspectUserHistory = async (userId: number, userName: string, userEmail?: string, userAvatar?: string | null) => {
    setInspectingUser({ id: userId, name: userName, email: userEmail, avatar: userAvatar });
    setIsLoadingUserHistory(true);
    try {
      const data = await safeFetchJson(`/api/admin/predictions/participants/${userId}/predictions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data && Array.isArray(data.predictions)) {
        setInspectingUserPredictions(data.predictions);
      } else {
        setInspectingUserPredictions([]);
      }
    } catch (err: any) {
      onShowMessage('error', err.message || 'فشل في تحميل سجل توقعات المتسابق');
    } finally {
      setIsLoadingUserHistory(false);
    }
  };

  // Recalculate and audit all points for active contest
  const handleRecalculateAllPoints = () => {
    requestConfirmation({
      title: 'تدقيق وإعادة احتساب نقاط المسابقة بالكامل',
      message:
        'سيقوم النظام بفحص جميع المباريات المعتمدة وإعادة تقييم كافة توقعات المشتركين وتحديث النقاط والترتيب العام تلقائياً لمنع أي تكرار أو احتساب نقاط وهمية أو غير دقيقة.\n\nهل ترغب في بدء عملية التدقيق الشامل؟',
      confirmText: 'بدء التدقيق واحتساب النقاط',
      variant: 'warning',
      onConfirm: async () => {
        setIsRecalculatingAll(true);
        try {
          const res = await fetch('/api/admin/predictions/recalculate-all', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();
          if (res.ok) {
            onShowMessage('success', data.message || 'تم تدقيق وإعادة احتساب نقاط جميع المشتركين بنجاح!');
            await Promise.all([fetchParticipants(), fetchPredictionMatches(), fetchActiveContest()]);
          } else {
            onShowMessage('error', data.error || 'فشل في إعادة احتساب النقاط');
          }
        } catch (err: any) {
          onShowMessage('error', err.message || 'حدث خطأ أثناء تدقيق النقاط');
        } finally {
          setIsRecalculatingAll(false);
        }
      },
    });
  };

  // Date strings for comparison in UTC format
  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const tomorrowObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrowObj.toISOString().slice(0, 10);

  // Helper to determine if a match has already started or finished
  const isMatchStartedOrFinished = (m: any) => {
    if (!m) return true;
    const mTime = new Date(m.matchDate).getTime();
    if (isNaN(mTime) || mTime <= Date.now()) return true;
    const st = (m.status || '').toUpperCase().trim();
    return [
      'FINISHED',
      'FT',
      'AET',
      'PEN_PK',
      'LIVE',
      'IN_PLAY',
      'PAUSED',
      'SUSPENDED',
      'CANCELLED',
      'POSTPONED',
    ].includes(st);
  };

  // Filter available matches by strictly unstarted matches and Today vs Tomorrow vs Search
  const filteredAvailableMatches = availableMatches
    .filter((m) => !isMatchStartedOrFinished(m))
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

  // Advanced Sorting of Participants
  const sortedParticipants = useMemo(() => {
    return [...filteredParticipants].sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      switch (participantSortBy) {
        case 'points':
          aVal = Number(a.stats?.totalPoints ?? a.user?.totalPoints ?? 0);
          bVal = Number(b.stats?.totalPoints ?? b.user?.totalPoints ?? 0);
          break;
        case 'correct':
          aVal = Number(a.stats?.correctPredictions ?? 0);
          bVal = Number(b.stats?.correctPredictions ?? 0);
          break;
        case 'incorrect':
          aVal = Number(a.stats?.incorrectPredictions ?? 0);
          bVal = Number(b.stats?.incorrectPredictions ?? 0);
          break;
        case 'golden':
          aVal = Number(a.stats?.goldenPredictions ?? 0);
          bVal = Number(b.stats?.goldenPredictions ?? 0);
          break;
        case 'accuracy':
          aVal = Number(a.stats?.accuracy ?? 0);
          bVal = Number(b.stats?.accuracy ?? 0);
          break;
        case 'total':
          aVal = Number(a.stats?.totalPredictions ?? 0);
          bVal = Number(b.stats?.totalPredictions ?? 0);
          break;
        case 'name':
          aVal = (a.user?.name || '').toLowerCase();
          bVal = (b.user?.name || '').toLowerCase();
          if (participantSortDir === 'asc') return aVal.localeCompare(bVal, 'ar');
          return bVal.localeCompare(aVal, 'ar');
        case 'date':
        default:
          aVal = new Date(a.appliedAt || 0).getTime();
          bVal = new Date(b.appliedAt || 0).getTime();
          break;
      }

      if (participantSortDir === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }, [filteredParticipants, participantSortBy, participantSortDir]);

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

  const hasActiveContest = Boolean(activeContest && activeContest.status === 'active');
  const currentViewingContest = useMemo(() => {
    if (selectedAdminContestId) {
      return allContests.find((c) => c.id === selectedAdminContestId) || activeContest;
    }
    return activeContest;
  }, [selectedAdminContestId, allContests, activeContest]);

  const isBrowsingArchivedContest = Boolean(currentViewingContest && currentViewingContest.status === 'completed');

  const handleSelectContestToBrowse = async (contestId: number) => {
    setSelectedAdminContestId(contestId);
    setSubTab('matches');
    setIsLoading(true);
    await Promise.all([
      fetchPredictionMatches(contestId),
      fetchParticipants(contestId),
    ]);
    setIsLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnToActiveContest = async () => {
    setSelectedAdminContestId(null);
    setSubTab('matches');
    setIsLoading(true);
    await Promise.all([
      fetchPredictionMatches(undefined),
      fetchParticipants(undefined),
    ]);
    setIsLoading(false);
  };

  if (!canViewPredictions) {
    return (
      <AdminAccessDenied
        title="غير مصرح لك بالوصول إلى إدارة التوقعات"
        sectionTitle="مسابقة التوقعات وإدارة المباريات"
        message="هذا القسم يتطلب صلاحية استعراض التوقعات أو إدارة المباريات للمتابعة والتحكم."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-brand" />
        <span className="text-xs font-bold text-gray-500">جاري تحميل بيانات مسابقة التوقعات...</span>
      </div>
    );
  }

  // If there is NO active contest and no contest selected for browsing: only display empty state & completed archive + create modal
  if (!hasActiveContest && !selectedAdminContestId && subTab !== 'completed_contests') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    مسابقة التوقعات
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    لا توجد مسابقة نشطة
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  التحكم المباشر في دورة حياة مسابقات التوقعات، تتبع الإحصائيات، والإنهاء اليدوي.
                </p>
              </div>
            </div>

            {canCreateContest && (
              <button
                type="button"
                onClick={() => setIsCreateContestModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء مسابقة جديدة</span>
              </button>
            )}
          </div>

          {/* EMPTY CONTEST VIEW */}
          <div className="text-center py-10 px-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">لا توجد مسابقة حالية نشطة</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
                لا توجد مسابقة جارية في الوقت الحالي. يمكنك إنشاء مسابقة جديدة الآن، أو تصفح بيانات المسابقات المنتهية السابقة من الأرشيف أدناه.
              </p>
            </div>
            {canCreateContest && (
              <button
                type="button"
                onClick={() => setIsCreateContestModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء مسابقة جديدة الآن</span>
              </button>
            )}
          </div>

          {/* COMPLETED CONTESTS LIST */}
          {allContests.filter((c) => c.status === 'completed').length > 0 && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-amber-500" />
                  المسابقات المنتهية والأرشيف ({allContests.filter((c) => c.status === 'completed').length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allContests
                  .filter((c) => c.status === 'completed')
                  .map((contest) => (
                    <div
                      key={contest.id}
                      className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                            {contest.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                            منتهية
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                          {contest.description || 'لا يوجد وصف'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          #{contest.id} {contest.createdAt ? `• ${new Date(contest.createdAt).toLocaleDateString('ar-EG')}` : ''}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectContestToBrowse(contest.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand/90 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تصفح بيانات ومباريات المسابقة باللوحة</span>
                        </button>

                        {canDeleteContest && (
                          <button
                            type="button"
                            onClick={() => handleDeleteContest(contest.id, contest.name)}
                            className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-black text-xs flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                            title="حذف المسابقة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* CREATE CONTEST MODAL */}
        {isCreateContestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-brand" />
                  <span>إنشاء مسابقة توقعات جديدة</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateContestModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateContest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    اسم المسابقة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newContestName}
                    onChange={(e) => setNewContestName(e.target.value)}
                    placeholder="مثال: مسابقة الدوري الإسباني 2026"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={newContestDescription}
                    onChange={(e) => setNewContestDescription(e.target.value)}
                    placeholder="وصف مختصر لمسابقة التوقعات والجوائز..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateContestModalOpen(false)}
                    disabled={isCreatingContest}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingContest || !newContestName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingContest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>إنشاء</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM MODAL */}
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText={confirmModalConfig.cancelText}
          variant={confirmModalConfig.variant}
          isLoading={confirmModalConfig.isLoading}
          onConfirm={confirmModalConfig.onConfirm}
          onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  // ACTIVE CONTEST OR SELECTED ARCHIVED CONTEST: Render full contest management & navigation
  return (
    <div className="space-y-6">
      {/* 0. Top Context Banner: When viewing an archived contest */}
      {isBrowsingArchivedContest && currentViewingContest && (
        <div className="p-4 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black">أنت تتصفح حالياً أرشيف المسابقة:</span>
                <span className="text-xs font-black underline decoration-amber-500">{currentViewingContest.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-black">منتهية (#{currentViewingContest.id})</span>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-medium mt-0.5">
                تصفح واستعراض لكافة مباريات المسابقة، النتائج المحتسبة، وقائمة المشاركين والتوقعات المسجلة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {hasActiveContest && (
              <button
                type="button"
                onClick={handleReturnToActiveContest}
                className="px-4 py-2 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>العودة للمسابقة النشطة</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSubTab('completed_contests')}
              className="px-3.5 py-2 rounded-xl bg-amber-200/70 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer"
            >
              <span>قائمة الأرشيف</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Sub-Tabs Bar */}
      {!hideTabs && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap bg-white dark:bg-gray-900 p-1.5 sm:p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs scrollbar-hide">
          {[
            { id: 'matches', label: isBrowsingArchivedContest ? 'مباريات المسابقة المؤرشفة' : 'المباريات الخاصة بالمسابقة', mobileLabel: 'المباريات', icon: Calendar, count: predictionMatches.length, show: true },
            { id: 'participants', label: isBrowsingArchivedContest ? 'المشاركون والنتائج' : 'المشاركون والإحصائيات', mobileLabel: 'المشاركون', icon: Users, count: participants.length, badge: pendingParticipantsCount > 0 ? pendingParticipantsCount : undefined, show: true },
            { id: 'add_match', label: 'إضافة مباريات', mobileLabel: 'إضافة مباراة', icon: Plus, show: canAddMatch && !isBrowsingArchivedContest },
            { id: 'completed_contests', label: 'المسابقات المنتهية والأرشيف', mobileLabel: 'الأرشيف', icon: Archive, count: allContests.filter((c) => c.status === 'completed').length, show: true },
            { id: 'settings', label: 'إعدادات المسابقة والنقاط', mobileLabel: 'الإعدادات', icon: Settings, show: canManageContest && !isBrowsingArchivedContest },
          ]
            .filter((tab) => tab.show)
            .map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
      )}

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
              {/* Recalculate all predictions trigger */}
              {canManagePoints && (
                <button
                  type="button"
                  onClick={handleRecalculateAllPoints}
                  disabled={isRecalculatingAll}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="تدقيق ومطابقة واحتساب جميع نقاط التوقعات لمنع أي احتساب خاطئ أو مكرر"
                >
                  <Calculator className={`w-3.5 h-3.5 ${isRecalculatingAll ? 'animate-spin' : ''}`} />
                  <span>{isRecalculatingAll ? 'جاري التدقيق...' : 'تدقيق واحتساب النقاط'}</span>
                </button>
              )}

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

              {canAddMatch && (
                <button
                  type="button"
                  onClick={() => setSubTab('add_match')}
                  className="px-3.5 py-1.5 rounded-xl bg-brand text-white font-black text-xs hover:bg-emerald-600 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مباراة</span>
                </button>
              )}
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
                                {!isEvaluated && canManagePoints && (
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
                              {canManageResults ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmingMatch(pm);
                                    setManualHomeScore(m.homeScore ?? 0);
                                    setManualAwayScore(m.awayScore ?? 0);
                                    setConfirmingMatchStatus(m.status || 'FINISHED');
                                  }}
                                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                                    isEvaluated
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs active:scale-95'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isEvaluated ? 'تعديل النتيجة' : `تأكيد (+${points})`}</span>
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>

                            {/* Actions & Archive */}
                            <td className="p-3 sm:p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Edit Prediction Match Details */}
                                {canEditMatch && (
                                  <button
                                    type="button"
                                    onClick={() => openEditMatchModal(pm)}
                                    className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 transition-colors cursor-pointer"
                                    title="تعديل بيانات التوقع والمباراة (الفرق، الموعد، البطولة، النتيجة)"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Open/Close toggle */}
                                {canEditMatch && (
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
                                )}

                                {/* Archive vs Delete */}
                                {isEvaluated ? (
                                  <span
                                    className="p-2 rounded-lg text-gray-400 bg-gray-100 dark:bg-gray-800 text-xs font-bold inline-flex items-center"
                                    title="تم احتساب النقاط وتوثيق السجل - محفوظة ومؤرشفة لحماية بيانات المتسابقين"
                                  >
                                    <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  </span>
                                ) : canDeleteMatch ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePrediction(pm)}
                                    className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 transition-colors cursor-pointer"
                                    title="حذف من مسابقة التوقعات"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : null}
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
                          {!isEvaluated && canManagePoints && (
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

                        <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingPredictionsForMatch(pm);
                              setPredictionModalSearch('');
                              setPredictionModalFilter('all');
                            }}
                            className="flex items-center justify-center gap-1 p-2 rounded-lg bg-white hover:bg-brand/10 hover:text-brand dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs transition-colors border border-gray-200 dark:border-gray-700"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{pm.participantsCount || pm.predictions?.length || 0}</span>
                          </button>

                          {canManageResults ? (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingMatch(pm);
                                setManualHomeScore(m.homeScore ?? 0);
                                setManualAwayScore(m.awayScore ?? 0);
                                setConfirmingMatchStatus(m.status || 'FINISHED');
                              }}
                              className={`flex items-center justify-center gap-1 p-2 rounded-lg font-black text-xs transition-all ${
                                isEvaluated
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isEvaluated ? 'النتيجة' : 'تأكيد'}</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center p-2 text-gray-400 font-bold text-xs">-</div>
                          )}

                          {canEditMatch ? (
                            <button
                              type="button"
                              onClick={() => openEditMatchModal(pm)}
                              className="flex items-center justify-center gap-1 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-black text-xs transition-colors border border-blue-200 dark:border-blue-900"
                              title="تعديل بيانات التوقع"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center p-2 text-gray-400 font-bold text-xs">-</div>
                          )}

                          {!isEvaluated ? (
                            canDeleteMatch ? (
                              <button
                                type="button"
                                onClick={() => handleDeletePrediction(pm)}
                                className="flex items-center justify-center gap-1 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 font-black text-xs transition-colors border border-red-200 dark:border-red-900"
                                title="حذف المباراة من التوقعات"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-center p-2 text-gray-400 font-bold text-xs">-</div>
                            )
                          ) : (
                            <div className="flex items-center justify-center p-2 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                              <Archive className="w-3.5 h-3.5" />
                            </div>
                          )}
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
          {(!activeContest || activeContest.status !== 'active') && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>تنبيه: لا توجد مسابقة نشطة حالياً. إضافة المباريات يتطلب وجود مسابقة نشطة. يرجى إنشاء مسابقة جديدة أولاً.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateContestModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 cursor-pointer transition-colors"
              >
                + إنشاء مسابقة
              </button>
            </div>
          )}

          {/* Day selection tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setAddDayTab('today');
                  setSelectedMatchIds([]);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'today'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                مباريات اليوم ({availableMatches.filter((m) => !isMatchStartedOrFinished(m) && new Date(m.matchDate).toISOString().slice(0, 10) === todayDateStr).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddDayTab('tomorrow');
                  setSelectedMatchIds([]);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  addDayTab === 'tomorrow'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                مباريات الغد ({availableMatches.filter((m) => !isMatchStartedOrFinished(m) && new Date(m.matchDate).toISOString().slice(0, 10) === tomorrowDateStr).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddDayTab('custom');
                  setSelectedMatchIds([]);
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

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {hideTabs && (
                <button
                  type="button"
                  onClick={() => setSubTab('matches')}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>العودة لقائمة المباريات</span>
                </button>
              )}
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        اسم الدوري / البطولة *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewLeagueName('');
                          setNewLeagueLogo('');
                          setIsCreateLeagueModalOpen(true);
                        }}
                        className="text-[11px] font-black text-brand hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ إضافة دوري جديد</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      list="existing-leagues-list"
                      placeholder="مثال: دوري روشن السعودي، كأس آسيا..."
                      value={customMatch.leagueName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const catalogMatch = matchLeagueFromCatalog(val);
                        const matchLeague = existingData.leagues.find(
                          (l) =>
                            l.name.toLowerCase() === val.trim().toLowerCase() ||
                            normalizeSportsName(l.name) === normalizeSportsName(val)
                        );
                        const resolvedLogo = catalogMatch?.logo || matchLeague?.logo || customMatch.leagueLogo;
                        setCustomMatch({
                          ...customMatch,
                          leagueName: val,
                          leagueLogo: resolvedLogo,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                    {customMatch.leagueLogo && (
                      <div className="mt-1.5 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                        <img
                          src={customMatch.leagueLogo}
                          alt="League Logo"
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          تم التعرف على شعار البطولة بنجاح
                        </span>
                      </div>
                    )}
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
                  {/* Home Team Container */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        الفريق المضيف (صاحب الأرض) *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTeamName('');
                          setNewTeamLogo('');
                          setIsCreateTeamModalOpen(true);
                        }}
                        className="text-[11px] font-black text-brand hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ إضافة فريق / منتخب</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      list="existing-teams-list"
                      placeholder="مثال: الهلال، النصر، الاتحاد، الاتفاق..."
                      value={customMatch.homeTeamName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHomeTeamConfirmed(false);
                        const catalogMatch = matchTeamFromCatalog(val, customMatch.leagueName);
                        const matchTeam = existingData.teams.find(
                          (t) =>
                            t.name.toLowerCase() === val.trim().toLowerCase() ||
                            normalizeSportsName(t.name) === normalizeSportsName(val)
                        );
                        const resolvedLogo = catalogMatch?.logo || matchTeam?.logo || customMatch.homeTeamLogo;
                        setCustomMatch({
                          ...customMatch,
                          homeTeamName: val,
                          homeTeamLogo: resolvedLogo,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />

                    {/* Interactive suggestions chips when typing */}
                    {customMatch.homeTeamName.trim().length >= 2 && !homeTeamConfirmed && (
                      (() => {
                        const suggs = searchTeamsFromCatalog(customMatch.homeTeamName, customMatch.leagueName, 4);
                        if (suggs.length === 0) return null;
                        return (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-bold">تأكيد النادي:</span>
                            {suggs.map((t) => (
                              <button
                                key={`h_sugg_${t.id}`}
                                type="button"
                                onClick={() => {
                                  setCustomMatch((prev) => ({
                                    ...prev,
                                    homeTeamName: t.name,
                                    homeTeamLogo: t.logo,
                                  }));
                                  setHomeTeamConfirmed(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[11px] font-black text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900 transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                                title={`تأكيد واختيار ${t.name}`}
                              >
                                <img
                                  src={t.logo}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <span>{t.name}</span>
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              </button>
                            ))}
                          </div>
                        );
                      })()
                    )}

                    {customMatch.homeTeamLogo && (
                      <div className="mt-1.5 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={customMatch.homeTeamLogo}
                            alt="Home Team Logo"
                            className="w-5 h-5 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate">
                            {isNationalTournament(customMatch.leagueName)
                              ? 'تم جلب شعار المنتخب المعتمد'
                              : 'تم جلب شعار النادي المعتمد'}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                          معتمد
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Home Team Logo Container */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        شعار الفريق المضيف (اضغط لفتح المعرض أو إدخال رابط)
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        placeholder="اضغط لاختيار الشعار بالصور أو أدخل رابطاً: https://..."
                        value={customMatch.homeTeamLogo}
                        onChange={(e) => setCustomMatch({ ...customMatch, homeTeamLogo: e.target.value })}
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'home',
                            title: 'اختيار شعار الفريق المضيف (صاحب الأرض)',
                            currentLogo: customMatch.homeTeamLogo,
                            currentTeamName: customMatch.homeTeamName,
                            leagueName: customMatch.leagueName,
                          })
                        }
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/70 bg-purple-50/20 dark:bg-purple-950/20 text-xs font-bold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'home',
                            title: 'اختيار شعار الفريق المضيف (صاحب الأرض)',
                            currentLogo: customMatch.homeTeamLogo,
                            currentTeamName: customMatch.homeTeamName,
                            leagueName: customMatch.leagueName,
                          })
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors cursor-pointer"
                        title="فتح معرض صور الشعارات"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {customMatch.homeTeamLogo ? (
                      <div className="mt-2 p-2.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700/60 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                            <img
                              src={customMatch.homeTeamLogo}
                              alt="Home Logo Preview"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="text-[11px] leading-tight truncate">
                            <span className="font-black text-purple-900 dark:text-purple-200 block truncate">
                              {customMatch.homeTeamName ? `شعار: ${customMatch.homeTeamName}` : 'شعار الفريق المضيف المعتمد'}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> تم تأكيد واعتماد الشعار
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setLogoPickerModal({
                                isOpen: true,
                                target: 'home',
                                title: 'تغيير شعار الفريق المضيف',
                                currentLogo: customMatch.homeTeamLogo,
                                currentTeamName: customMatch.homeTeamName,
                                leagueName: customMatch.leagueName,
                              })
                            }
                            className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors cursor-pointer"
                          >
                            تغيير الشعار
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomMatch({ ...customMatch, homeTeamLogo: '' })}
                            className="text-[10px] px-2 py-1 rounded-lg font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            مسح
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'home',
                            title: 'اختيار شعار الفريق المضيف (صاحب الأرض)',
                            currentLogo: '',
                            currentTeamName: customMatch.homeTeamName,
                            leagueName: customMatch.leagueName,
                          })
                        }
                        className="mt-2 w-full p-2.5 rounded-2xl border border-dashed border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 text-center hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-black text-purple-800 dark:text-purple-300">
                          اضغط لفتح واجهة صور الشعارات واختيار شعار الفريق
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Away Team Container */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        الفريق الضيف *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTeamName('');
                          setNewTeamLogo('');
                          setIsCreateTeamModalOpen(true);
                        }}
                        className="text-[11px] font-black text-brand hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ إضافة فريق / منتخب</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      list="existing-teams-list"
                      placeholder="مثال: الأهلي، الشباب، القادسية، التعاون..."
                      value={customMatch.awayTeamName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAwayTeamConfirmed(false);
                        const catalogMatch = matchTeamFromCatalog(val, customMatch.leagueName);
                        const matchTeam = existingData.teams.find(
                          (t) =>
                            t.name.toLowerCase() === val.trim().toLowerCase() ||
                            normalizeSportsName(t.name) === normalizeSportsName(val)
                        );
                        const resolvedLogo = catalogMatch?.logo || matchTeam?.logo || customMatch.awayTeamLogo;
                        setCustomMatch({
                          ...customMatch,
                          awayTeamName: val,
                          awayTeamLogo: resolvedLogo,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />

                    {/* Interactive suggestions chips when typing */}
                    {customMatch.awayTeamName.trim().length >= 2 && !awayTeamConfirmed && (
                      (() => {
                        const suggs = searchTeamsFromCatalog(customMatch.awayTeamName, customMatch.leagueName, 4);
                        if (suggs.length === 0) return null;
                        return (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-bold">تأكيد النادي:</span>
                            {suggs.map((t) => (
                              <button
                                key={`a_sugg_${t.id}`}
                                type="button"
                                onClick={() => {
                                  setCustomMatch((prev) => ({
                                    ...prev,
                                    awayTeamName: t.name,
                                    awayTeamLogo: t.logo,
                                  }));
                                  setAwayTeamConfirmed(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[11px] font-black text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900 transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                                title={`تأكيد واختيار ${t.name}`}
                              >
                                <img
                                  src={t.logo}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <span>{t.name}</span>
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              </button>
                            ))}
                          </div>
                        );
                      })()
                    )}

                    {customMatch.awayTeamLogo && (
                      <div className="mt-1.5 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={customMatch.awayTeamLogo}
                            alt="Away Team Logo"
                            className="w-5 h-5 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate">
                            {isNationalTournament(customMatch.leagueName)
                              ? 'تم جلب شعار المنتخب المعتمد'
                              : 'تم جلب شعار النادي المعتمد'}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                          معتمد
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Away Team Logo Container */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        شعار الفريق الضيف (اضغط لفتح المعرض أو إدخال رابط)
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        placeholder="اضغط لاختيار الشعار بالصور أو أدخل رابطاً: https://..."
                        value={customMatch.awayTeamLogo}
                        onChange={(e) => setCustomMatch({ ...customMatch, awayTeamLogo: e.target.value })}
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'away',
                            title: 'اختيار شعار الفريق الضيف',
                            currentLogo: customMatch.awayTeamLogo,
                            currentTeamName: customMatch.awayTeamName,
                            leagueName: customMatch.leagueName,
                          })
                        }
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/70 bg-purple-50/20 dark:bg-purple-950/20 text-xs font-bold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'away',
                            title: 'اختيار شعار الفريق الضيف',
                            currentLogo: customMatch.awayTeamLogo,
                            currentTeamName: customMatch.awayTeamName,
                            leagueName: customMatch.leagueName,
                          })
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors cursor-pointer"
                        title="فتح معرض صور الشعارات"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {customMatch.awayTeamLogo ? (
                      <div className="mt-2 p-2.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700/60 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                            <img
                              src={customMatch.awayTeamLogo}
                              alt="Away Logo Preview"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="text-[11px] leading-tight truncate">
                            <span className="font-black text-purple-900 dark:text-purple-200 block truncate">
                              {customMatch.awayTeamName ? `شعار: ${customMatch.awayTeamName}` : 'شعار الفريق الضيف المعتمد'}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> تم تأكيد واعتماد الشعار
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setLogoPickerModal({
                                isOpen: true,
                                target: 'away',
                                title: 'تغيير شعار الفريق الضيف',
                                currentLogo: customMatch.awayTeamLogo,
                                currentTeamName: customMatch.awayTeamName,
                                leagueName: customMatch.leagueName,
                              })
                            }
                            className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors cursor-pointer"
                          >
                            تغيير الشعار
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomMatch({ ...customMatch, awayTeamLogo: '' })}
                            className="text-[10px] px-2 py-1 rounded-lg font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            مسح
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'away',
                            title: 'اختيار شعار الفريق الضيف',
                            currentLogo: '',
                            currentTeamName: customMatch.awayTeamName,
                            leagueName: customMatch.leagueName,
                          })
                        }
                        className="mt-2 w-full p-2.5 rounded-2xl border border-dashed border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 text-center hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-black text-purple-800 dark:text-purple-300">
                          اضغط لفتح واجهة صور الشعارات واختيار شعار الفريق
                        </span>
                      </button>
                    )}
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
            /* Match Selection Grid for Today/Tomorrow with Points Configuration & Multi-Select */
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {selectedMatchIds.length === 0
                      ? 'حدد مباراة أو عدة مباريات للتوقع:'
                      : `تم تحديد (${selectedMatchIds.length}) من (${
                          filteredAvailableMatches.filter(
                            (m) => !predictionMatches.some((pm) => pm.matchId === m.id)
                          ).length
                        }) مباراة`}
                  </span>

                  {filteredAvailableMatches.some(
                    (m) => !predictionMatches.some((pm) => pm.matchId === m.id)
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        const selectable = filteredAvailableMatches.filter(
                          (m) => !predictionMatches.some((pm) => pm.matchId === m.id)
                        );
                        if (selectedMatchIds.length === selectable.length && selectable.length > 0) {
                          setSelectedMatchIds([]);
                        } else {
                          setSelectedMatchIds(selectable.map((m) => m.id));
                        }
                      }}
                      className="text-[11px] font-black text-brand hover:underline px-2.5 py-1 rounded-lg bg-brand/10 hover:bg-brand/20 transition-colors cursor-pointer"
                    >
                      {selectedMatchIds.length > 0 &&
                      selectedMatchIds.length ===
                        filteredAvailableMatches.filter(
                          (m) => !predictionMatches.some((pm) => pm.matchId === m.id)
                        ).length
                        ? 'إلغاء تحديد الكل'
                        : 'تحديد جميع مباريات القائمة'}
                    </button>
                  )}

                  {/* Points selector */}
                  <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
                    <span className="text-xs font-black text-purple-700 dark:text-purple-300">النقاط لكل مباراة:</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={selectedMatchPoints}
                      onChange={(e) => setSelectedMatchPoints(parseInt(e.target.value, 10) || 2)}
                      className="w-14 text-center py-0.5 rounded-lg border border-purple-300 dark:border-purple-700 font-black text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                </div>

                <button
                  type="button"
                  disabled={selectedMatchIds.length === 0 || isActionLoading}
                  onClick={handleAddSelectedMatches}
                  className="px-5 py-2.5 rounded-xl bg-brand text-white font-black text-xs hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors shrink-0"
                >
                  {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {selectedMatchIds.length > 1
                      ? `إضافة (${selectedMatchIds.length}) مباريات محددة (${selectedMatchPoints} نقاط لكل منها)`
                      : selectedMatchIds.length === 1
                      ? `إضافة المباراة المحددة (${selectedMatchPoints} نقاط)`
                      : 'حدد مباريات للإضافة'}
                  </span>
                </button>
              </div>

              {filteredAvailableMatches.length === 0 ? (
                <div className="text-center py-14 text-gray-400 font-bold text-xs">
                  لا توجد مباريات قادمة متاحة لتاريخ {addDayTab === 'today' ? 'اليوم' : 'الغد'}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredAvailableMatches.map((m) => {
                    const isSelected = selectedMatchIds.includes(m.id);
                    const isAlreadyAdded = predictionMatches.some((pm) => pm.matchId === m.id);
                    const mDate = new Date(m.matchDate);

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            setSelectedMatchIds((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            );
                          }
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
                          <div className="flex items-center gap-2 min-w-0">
                            {!isAlreadyAdded && (
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                  isSelected
                                    ? 'bg-brand border-brand text-white shadow-xs'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            )}
                            <span className="truncate max-w-[130px] text-gray-700 dark:text-gray-300 font-black">
                              {m.leagueName}
                            </span>
                          </div>
                          <span className="shrink-0 font-mono">
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
                            تم التحديد (ستضاف بـ {selectedMatchPoints} نقاط)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 text-center">
                            انقر للتحديد
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

      {/* 4. SUB-TAB 3: PARTICIPANTS MANAGEMENT & STATISTICS */}
      {subTab === 'participants' && (
        <div className="space-y-6">
          {/* Header & Main Recalculate Trigger */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand" />
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  المتسابقون وإحصائيات التوقعات ({participants.length})
                </h2>
              </div>
              <p className="text-xs text-gray-400 font-bold mt-1">
                تدقيق شامل لكافة المتسابقين وفرز التوقعات الصحيحة والخاطئة والذهبية ونسب الدقة لمنع أي احتيال واحتساب النقاط بدقة متناهية.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              {canManagePoints && (
                <button
                  type="button"
                  onClick={handleRecalculateAllPoints}
                  disabled={isRecalculatingAll}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  title="إعادة احتساب وتدقيق كافة التوقعات في المسابقة والتأكد من مطابقة النقاط"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRecalculatingAll ? 'animate-spin' : ''}`} />
                  <span>{isRecalculatingAll ? 'جاري التدقيق واحتساب النقاط...' : 'تدقيق وإعادة احتساب نقاط المسابقة'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400">إجمالي المشتركين</span>
              <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{participants.length}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">المعتمدون</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {participants.filter((p) => p.status === 'approved').length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">قيد المراجعة</span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {pendingParticipantsCount}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400">المحظورون</span>
              <div className="text-xl font-black text-red-600 dark:text-red-400 mt-0.5">
                {participants.filter((p) => p.status === 'blocked').length}
              </div>
            </div>
          </div>

          {/* Controls Bar: Filter, Sorting, Direction, and Search */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto bg-gray-50 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold scrollbar-hide">
              <button
                type="button"
                onClick={() => setParticipantFilter('all')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  participantFilter === 'all' ? 'bg-brand text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                الكل ({participants.length})
              </button>
              <button
                type="button"
                onClick={() => setParticipantFilter('approved')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  participantFilter === 'approved' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                المعتمدون
              </button>
              <button
                type="button"
                onClick={() => setParticipantFilter('pending')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  participantFilter === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                قيد المراجعة ({pendingParticipantsCount})
              </button>
              <button
                type="button"
                onClick={() => setParticipantFilter('blocked')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  participantFilter === 'blocked' ? 'bg-red-600 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                المحظورون
              </button>
            </div>

            {/* Sorting & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <ListOrdered className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] font-bold text-gray-500 hidden sm:inline">فرز حسب:</span>
                <select
                  value={participantSortBy}
                  onChange={(e) => setParticipantSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-black text-gray-800 dark:text-gray-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="points">الأعلى نقاطاً (الترتيب)</option>
                  <option value="correct">الأكثر توقعات صحيحة</option>
                  <option value="incorrect">الأكثر توقعات خاطئة</option>
                  <option value="golden">الأكثر توقعات ذهبية</option>
                  <option value="accuracy">نسبة الدقة (%)</option>
                  <option value="total">إجمالي التوقعات</option>
                  <option value="date">تاريخ الانضمام</option>
                  <option value="name">الاسم أبجدياً</option>
                </select>
              </div>

              {/* Sort Direction Toggle */}
              <button
                type="button"
                onClick={() => setParticipantSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition-colors cursor-pointer"
                title={participantSortDir === 'desc' ? 'تنازلي (من الأعلى للأقل)' : 'تصاعدي (من الأقل للأعلى)'}
              >
                {participantSortDir === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              </button>

              {/* Search */}
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو البريد..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Participants Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            {sortedParticipants.length === 0 ? (
              <div className="text-center py-14 px-4 text-gray-400 font-bold text-xs">
                لا يوجد متسابقون يطابقون خيارات البحث والفرز الحالية.
              </div>
            ) : (
              <div>
                {/* Desktop Detailed Table */}
                <div className="hidden xl:block overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 text-[11px]">
                        <th className="p-3.5 font-black text-center w-12">#</th>
                        <th className="p-3.5 font-black">المتسابق</th>
                        <th className="p-3.5 font-black">البريد</th>
                        <th className="p-3.5 font-black text-center">الحالة</th>
                        <th className="p-3.5 font-black text-center">إجمالي التوقعات</th>
                        <th className="p-3.5 font-black text-center text-emerald-600 dark:text-emerald-400">صحيحة</th>
                        <th className="p-3.5 font-black text-center text-red-600 dark:text-red-400">خاطئة</th>
                        <th className="p-3.5 font-black text-center text-amber-500">ذهبية</th>
                        <th className="p-3.5 font-black text-center">نسبة الدقة</th>
                        <th className="p-3.5 font-black text-center text-brand">إجمالي النقاط</th>
                        <th className="p-3.5 font-black text-center">سجل التوقعات</th>
                        <th className="p-3.5 font-black text-center">إجراءات الحساب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {sortedParticipants.map((part, idx) => {
                        const u = part.user;
                        const status = part.status;
                        const stats = part.stats || {
                          totalPredictions: 0,
                          correctPredictions: 0,
                          incorrectPredictions: 0,
                          goldenPredictions: 0,
                          pendingPredictions: 0,
                          accuracy: 0,
                          totalPoints: u?.totalPoints ?? 0,
                        };

                        return (
                          <tr key={part.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="p-3.5 text-center font-mono font-black text-gray-400 text-xs">
                              {idx + 1}
                            </td>

                            <td className="p-3.5 font-bold">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0 border border-brand/20">
                                  {u?.avatar ? (
                                    <img loading="lazy" src={u.avatar} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (u?.name || 'U').charAt(0)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-gray-900 dark:text-white font-black block truncate">{u?.name || 'مستخدم'}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">ID: #{u?.id || part.userId}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono text-[11px] text-gray-500 max-w-[150px] truncate">
                              {u?.email || '-'}
                            </td>

                            <td className="p-3.5 text-center">
                              {status === 'approved' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  معتمد
                                </span>
                              ) : status === 'pending' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                                  قيد المراجعة
                                </span>
                              ) : status === 'rejected' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  مرفوض
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                                  محظور
                                </span>
                              )}
                            </td>

                            {/* Total Predictions */}
                            <td className="p-3.5 text-center font-mono font-bold text-gray-700 dark:text-gray-300">
                              <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs">
                                {stats.totalPredictions}
                              </span>
                            </td>

                            {/* Correct Predictions */}
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                {stats.correctPredictions}
                              </span>
                            </td>

                            {/* Incorrect Predictions */}
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-mono font-black text-xs">
                                <XCircle className="w-3 h-3 text-red-500" />
                                {stats.incorrectPredictions}
                              </span>
                            </td>

                            {/* Golden Predictions */}
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono font-black text-xs">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                {stats.goldenPredictions}
                              </span>
                            </td>

                            {/* Accuracy */}
                            <td className="p-3.5 text-center">
                              <span className={`font-mono font-black text-xs ${stats.accuracy >= 50 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                {stats.accuracy}%
                              </span>
                            </td>

                            {/* Total Points */}
                            <td className="p-3.5 text-center font-mono font-black text-sm text-brand">
                              <span className="px-2.5 py-1 rounded-xl bg-brand/10 border border-brand/20">
                                {stats.totalPoints} نقطة
                              </span>
                            </td>

                            {/* Inspect History Trigger */}
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleInspectUserHistory(part.userId || u?.id, u?.name || 'المتسابق', u?.email, u?.avatar)}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="عرض وفحص سجل جميع توقعات المتسابق"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>سجل التوقعات</span>
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-center">
                              {canManageParticipants ? (
                                <div className="flex items-center justify-center gap-1">
                                  {status !== 'approved' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                      title="اعتماد المشاركة"
                                    >
                                      <UserCheck className="w-3 h-3" />
                                      <span>اعتماد</span>
                                    </button>
                                  )}

                                  {status !== 'rejected' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateParticipantStatus(part.id, 'rejected')}
                                      className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-200 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                      title="رفض الطلب"
                                    >
                                      <UserX className="w-3 h-3" />
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
                                      <Ban className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                      className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[11px] cursor-pointer"
                                      title="إلغاء الحظر"
                                    >
                                      إلغاء الحظر
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteParticipant(part.id, u?.name || 'مستخدم')}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                    title="حذف المشارك نهائياً"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Medium Screens & Mobile Responsive Cards View */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:hidden gap-4 p-4">
                  {sortedParticipants.map((part, idx) => {
                    const u = part.user;
                    const status = part.status;
                    const stats = part.stats || {
                      totalPredictions: 0,
                      correctPredictions: 0,
                      incorrectPredictions: 0,
                      goldenPredictions: 0,
                      pendingPredictions: 0,
                      accuracy: 0,
                      totalPoints: u?.totalPoints ?? 0,
                    };

                    return (
                      <div
                        key={part.id}
                        className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 flex flex-col justify-between gap-3 shadow-2xs"
                      >
                        {/* Header: User Info & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 font-mono font-black text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0 border border-brand/20">
                              {u?.avatar ? (
                                <img loading="lazy" src={u.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (u?.name || 'U').charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-gray-900 dark:text-white font-black text-sm truncate">{u?.name || 'مستخدم'}</div>
                              <div className="font-mono text-[10px] text-gray-400 truncate">{u?.email || 'بدون بريد'}</div>
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

                        {/* Stats Metrics Bento */}
                        <div className="grid grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block">إجمالي</span>
                            <span className="font-mono font-black text-xs text-gray-800 dark:text-gray-200">{stats.totalPredictions}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 block">صحيح</span>
                            <span className="font-mono font-black text-xs text-emerald-600">{stats.correctPredictions}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-red-500 block">خاطئ</span>
                            <span className="font-mono font-black text-xs text-red-500">{stats.incorrectPredictions}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-amber-500 block">ذهبي</span>
                            <span className="font-mono font-black text-xs text-amber-500">{stats.goldenPredictions}</span>
                          </div>
                        </div>

                        {/* Points & Accuracy Summary */}
                        <div className="flex items-center justify-between px-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-bold text-[11px]">نسبة الدقة:</span>
                            <span className="font-mono font-black text-gray-800 dark:text-gray-200">{stats.accuracy}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-bold text-[11px]">إجمالي النقاط:</span>
                            <span className="font-mono font-black text-brand text-sm">{stats.totalPoints} نقطة</span>
                          </div>
                        </div>

                        {/* Buttons & Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700/60">
                          <button
                            type="button"
                            onClick={() => handleInspectUserHistory(part.userId || u?.id, u?.name || 'المتسابق', u?.email, u?.avatar)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-xs inline-flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>فحص السجل</span>
                          </button>

                          {canManageParticipants && (
                            <div className="flex items-center gap-1">
                              {status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" /> اعتماد
                                </button>
                              )}
                              {status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateParticipantStatus(part.id, 'rejected')}
                                  className="px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <UserX className="w-3.5 h-3.5" /> رفض
                                </button>
                              )}
                              {status !== 'blocked' ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateParticipantStatus(part.id, 'blocked')}
                                  className="p-1.5 rounded-lg text-red-600 bg-red-100 dark:bg-red-950/60 cursor-pointer"
                                  title="حظر"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateParticipantStatus(part.id, 'approved')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs cursor-pointer"
                                >
                                  إلغاء الحظر
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteParticipant(part.id, u?.name || 'مستخدم')}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 bg-gray-100 dark:bg-gray-800 cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
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

            {canManageContest && (
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
            )}
          </form>

          {/* End Active Contest Section within Contest Settings */}
          {canEndContest && activeContest && activeContest.status === 'active' && (
            <div className="mt-6 pt-5 border-t border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  إنهاء المسابقة الحالية
                </h4>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                  عند إنهاء المسابقة الحالية، سيتوقف استقبال أي توقعات جديدة وسيتم نقل المسابقة ومخرجاتها إلى أرشيف المسابقات المنتهية.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCompleteContest}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Ban className="w-4 h-4" />
                <span>إنهاء المسابقة الآن</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. SUB-TAB 5: COMPLETED CONTESTS & ARCHIVE */}
      {subTab === 'completed_contests' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  أرشيف وسجل المسابقات المنتهية ({allContests.filter((c) => c.status === 'completed').length})
                </h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">
                  استعراض المسابقات السابقة ونتائجها وإمكانية إدارتها أو حذفها.
                </p>
              </div>
            </div>

            <a
              href="/predictions"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span>معاينة واجهة المتسابقين</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {allContests.filter((c) => c.status === 'completed').length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <Archive className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">
                لا توجد مسابقات منتهية مؤرشفة حتى الآن
              </h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                عند إنهاء المسابقة الحالية ستظهر كافة بياناتها وسجل نتائجها هنا وفي واجهة الأرشيف العامة.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allContests
                .filter((c) => c.status === 'completed')
                .map((contest) => (
                  <div
                    key={contest.id}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          <span>مسابقة منتهية</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono font-bold">
                          المعرف: #{contest.id}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        {contest.name}
                      </h4>

                      {contest.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {contest.description}
                        </p>
                      )}

                      <div className="pt-2 text-[11px] font-bold text-gray-400 flex items-center gap-3">
                        {contest.createdAt && (
                          <span>تاريخ الإنشاء: {new Date(contest.createdAt).toLocaleDateString('ar-EG')}</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectContestToBrowse(contest.id)}
                          className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تصفح بيانات ومباريات المسابقة باللوحة</span>
                        </button>

                        <a
                          href={`/predictions?contestId=${contest.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="معاينة الواجهة العامة للمتسابقين"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">معاينة المتسابقين</span>
                        </a>
                      </div>

                      {canDeleteContest && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContest(contest.id, contest.name)}
                          className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="حذف المسابقة من قاعدة البيانات"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
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

                <div className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">حالة المباراة:</span>
                  <select
                    value={confirmingMatchStatus}
                    onChange={(e) => setConfirmingMatchStatus(e.target.value)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-500 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <option value="FINISHED">منتهية (FINISHED) - اعتماد النتيجة واحتساب النقاط</option>
                    <option value="LIVE">مباشرة الآن (LIVE)</option>
                    <option value="SCHEDULED">قادمة / مجدولة (SCHEDULED)</option>
                  </select>
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
                      <span>جاري الحفظ واحتساب النقاط...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {confirmingMatch.isCalculated || confirmingMatch.isConfirmedByAdmin
                          ? `حفظ النتيجة وتحديث النقاط (${manualHomeScore}-${manualAwayScore})`
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
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold overflow-x-auto">
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

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="بحث باسم المتسابق أو البريد..."
                    value={predictionModalSearch}
                    onChange={(e) => setPredictionModalSearch(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-none"
                  />
                </div>
                {canManageParticipants && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewPredUserId('');
                      setNewPredHomeScore('');
                      setNewPredAwayScore('');
                      setIsAddUserPredModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-brand hover:bg-emerald-600 text-white text-xs font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                    title="إضافة توقع يدوي لمشارك"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إضافة توقع</span>
                  </button>
                )}
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

                        {/* Admin Edit & Delete Actions for Individual Prediction */}
                        {canManageParticipants && (
                          <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
                            <button
                              type="button"
                              title="تعديل توقع المشارك"
                              onClick={() => {
                                setEditingUserPred(p);
                                setEditPredHomeScore(String(p.homeScore));
                                setEditPredAwayScore(String(p.awayScore));
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="حذف توقع المشارك"
                              onClick={() => handleAdminDeleteUserPrediction(p.id, p.userName)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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

      {/* 10. MODAL: Edit Prediction Match & Details (Full Admin Control) */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    تعديل توقع المباراة
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    تعديل الفريقين، التوقيت، البطولة، النتيجة، النقاط، وحالة المباراة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatchEdit} className="space-y-4">
              {/* League / Tournament */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-gray-300">
                  <Globe className="w-4 h-4 text-brand" />
                  <span>البطولة / الدوري</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      اسم البطولة أو الدوري *
                    </label>
                    <input
                      type="text"
                      required
                      list="existing-leagues-list"
                      value={editingMatchForm.leagueName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchLeague = existingData.leagues.find(
                          (l) => l.name.toLowerCase() === val.trim().toLowerCase()
                        );
                        setEditingMatchForm({
                          ...editingMatchForm,
                          leagueName: val,
                          leagueLogo: matchLeague?.logo || editingMatchForm.leagueLogo,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                      placeholder="اختر أو اكتب اسم البطولة..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      رابط شعار البطولة (اختياري)
                    </label>
                    <input
                      type="url"
                      value={editingMatchForm.leagueLogo}
                      onChange={(e) => setEditingMatchForm({ ...editingMatchForm, leagueLogo: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              {/* Teams Section */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-gray-300">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  <span>الفريقان المتباريان</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Home Team */}
                  <div className="space-y-2 border-b sm:border-b-0 sm:border-l border-gray-200 dark:border-gray-700 pb-3 sm:pb-0 sm:pl-3">
                    <span className="text-[11px] font-black text-brand">الفريق الأول (صاحب الأرض) *</span>
                    <div>
                      <input
                        type="text"
                        required
                        list="existing-teams-list"
                        value={editingMatchForm.homeTeamName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const catalogMatch = matchTeamFromCatalog(val, editingMatchForm.leagueName);
                          const matchTeam = existingData.teams.find(
                            (t) =>
                              t.name.toLowerCase() === val.trim().toLowerCase() ||
                              normalizeSportsName(t.name) === normalizeSportsName(val)
                          );
                          const resolvedLogo = catalogMatch?.logo || matchTeam?.logo || editingMatchForm.homeTeamLogo;
                          setEditingMatchForm({
                            ...editingMatchForm,
                            homeTeamName: val,
                            homeTeamLogo: resolvedLogo,
                          });
                        }}
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                        placeholder="اسم الفريق الأول..."
                      />
                    </div>

                    {/* Interactive suggestions chips for edit home */}
                    {editingMatchForm.homeTeamName.trim().length >= 2 && (
                      (() => {
                        const suggs = searchTeamsFromCatalog(editingMatchForm.homeTeamName, editingMatchForm.leagueName, 3);
                        if (suggs.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] text-gray-400 font-bold">تأكيد:</span>
                            {suggs.map((t) => (
                              <button
                                key={`edit_h_sug_${t.id}`}
                                type="button"
                                onClick={() => {
                                  setEditingMatchForm((prev) => ({
                                    ...prev,
                                    homeTeamName: t.name,
                                    homeTeamLogo: t.logo,
                                  }));
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[10px] font-bold text-purple-900 dark:text-purple-200 hover:bg-purple-100 cursor-pointer"
                              >
                                <img src={t.logo} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                <span>{t.name}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()
                    )}

                    <div className="relative">
                      <input
                        type="url"
                        value={editingMatchForm.homeTeamLogo}
                        onChange={(e) => setEditingMatchForm({ ...editingMatchForm, homeTeamLogo: e.target.value })}
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'edit_home',
                            title: 'تعديل شعار الفريق المضيف (صاحب الأرض)',
                            currentLogo: editingMatchForm.homeTeamLogo,
                            currentTeamName: editingMatchForm.homeTeamName,
                            leagueName: editingMatchForm.leagueName,
                          })
                        }
                        className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-purple-200 dark:border-purple-800/70 bg-white dark:bg-gray-800 text-[11px] font-bold text-gray-900 dark:text-white cursor-pointer"
                        placeholder="اضغط لاختيار الشعار بالصور أو رابط..."
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'edit_home',
                            title: 'تعديل شعار الفريق المضيف (صاحب الأرض)',
                            currentLogo: editingMatchForm.homeTeamLogo,
                            currentTeamName: editingMatchForm.homeTeamName,
                            leagueName: editingMatchForm.leagueName,
                          })
                        }
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors cursor-pointer"
                        title="فتح معرض صور الشعارات"
                      >
                        <Layers className="w-3 h-3" />
                      </button>
                    </div>

                    {editingMatchForm.homeTeamLogo && (
                      <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img
                            src={editingMatchForm.homeTeamLogo}
                            alt="Home Logo"
                            className="w-4 h-4 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="truncate">شعار معتمد</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingMatchForm({ ...editingMatchForm, homeTeamLogo: '' })}
                          className="text-[9px] text-red-500 hover:underline shrink-0 cursor-pointer"
                        >
                          مسح
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-black text-indigo-500">الفريق الثاني (الضيف) *</span>
                    <div>
                      <input
                        type="text"
                        required
                        list="existing-teams-list"
                        value={editingMatchForm.awayTeamName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const catalogMatch = matchTeamFromCatalog(val, editingMatchForm.leagueName);
                          const matchTeam = existingData.teams.find(
                            (t) =>
                              t.name.toLowerCase() === val.trim().toLowerCase() ||
                              normalizeSportsName(t.name) === normalizeSportsName(val)
                          );
                          const resolvedLogo = catalogMatch?.logo || matchTeam?.logo || editingMatchForm.awayTeamLogo;
                          setEditingMatchForm({
                            ...editingMatchForm,
                            awayTeamName: val,
                            awayTeamLogo: resolvedLogo,
                          });
                        }}
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                        placeholder="اسم الفريق الثاني..."
                      />
                    </div>

                    {/* Interactive suggestions chips for edit away */}
                    {editingMatchForm.awayTeamName.trim().length >= 2 && (
                      (() => {
                        const suggs = searchTeamsFromCatalog(editingMatchForm.awayTeamName, editingMatchForm.leagueName, 3);
                        if (suggs.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] text-gray-400 font-bold">تأكيد:</span>
                            {suggs.map((t) => (
                              <button
                                key={`edit_a_sug_${t.id}`}
                                type="button"
                                onClick={() => {
                                  setEditingMatchForm((prev) => ({
                                    ...prev,
                                    awayTeamName: t.name,
                                    awayTeamLogo: t.logo,
                                  }));
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[10px] font-bold text-purple-900 dark:text-purple-200 hover:bg-purple-100 cursor-pointer"
                              >
                                <img src={t.logo} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                <span>{t.name}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()
                    )}

                    <div className="relative">
                      <input
                        type="url"
                        value={editingMatchForm.awayTeamLogo}
                        onChange={(e) => setEditingMatchForm({ ...editingMatchForm, awayTeamLogo: e.target.value })}
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'edit_away',
                            title: 'تعديل شعار الفريق الثاني (الضيف)',
                            currentLogo: editingMatchForm.awayTeamLogo,
                            currentTeamName: editingMatchForm.awayTeamName,
                            leagueName: editingMatchForm.leagueName,
                          })
                        }
                        className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-purple-200 dark:border-purple-800/70 bg-white dark:bg-gray-800 text-[11px] font-bold text-gray-900 dark:text-white cursor-pointer"
                        placeholder="اضغط لاختيار الشعار بالصور أو رابط..."
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLogoPickerModal({
                            isOpen: true,
                            target: 'edit_away',
                            title: 'تعديل شعار الفريق الثاني (الضيف)',
                            currentLogo: editingMatchForm.awayTeamLogo,
                            currentTeamName: editingMatchForm.awayTeamName,
                            leagueName: editingMatchForm.leagueName,
                          })
                        }
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors cursor-pointer"
                        title="فتح معرض صور الشعارات"
                      >
                        <Layers className="w-3 h-3" />
                      </button>
                    </div>

                    {editingMatchForm.awayTeamLogo && (
                      <div className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img
                            src={editingMatchForm.awayTeamLogo}
                            alt="Away Logo"
                            className="w-4 h-4 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="truncate">شعار معتمد</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingMatchForm({ ...editingMatchForm, awayTeamLogo: '' })}
                          className="text-[9px] text-red-500 hover:underline shrink-0 cursor-pointer"
                        >
                          مسح
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Date, Time & Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl space-y-1">
                  <label className="block text-[11px] font-black text-gray-700 dark:text-gray-300">
                    موعد وتاريخ انطلاق المباراة *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editingMatchForm.matchDate}
                    onChange={(e) => setEditingMatchForm({ ...editingMatchForm, matchDate: e.target.value })}
                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl space-y-1">
                  <label className="block text-[11px] font-black text-gray-700 dark:text-gray-300">
                    نقاط التوقع الصحيح للمباراة *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      required
                      value={editingMatchForm.pointsPerMatch}
                      onChange={(e) => setEditingMatchForm({ ...editingMatchForm, pointsPerMatch: parseInt(e.target.value, 10) || 2 })}
                      className="w-16 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-black text-center text-gray-900 dark:text-white"
                    />
                    <div className="flex items-center gap-1">
                      {[2, 3, 5, 10].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setEditingMatchForm({ ...editingMatchForm, pointsPerMatch: pts })}
                          className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            editingMatchForm.pointsPerMatch === pts
                              ? 'bg-purple-600 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          +{pts}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Status & Scores */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300">
                    حالة المباراة والنتيجة:
                  </label>
                  <select
                    value={editingMatchForm.status}
                    onChange={(e) => setEditingMatchForm({ ...editingMatchForm, status: e.target.value })}
                    className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <option value="SCHEDULED">قادمة / مجدولة (SCHEDULED)</option>
                    <option value="LIVE">جارية الآن (LIVE)</option>
                    <option value="FINISHED">منتهية (FINISHED) - اعتماد النتيجة واحتساب النقاط</option>
                    <option value="CANCELLED">ملغاة (CANCELLED)</option>
                  </select>
                </div>

                <div className="flex items-center justify-center gap-4 dir-ltr pt-1">
                  <div className="text-center">
                    <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 max-w-[90px] truncate">
                      {editingMatchForm.homeTeamName || 'الفريق الأول'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      placeholder="-"
                      value={editingMatchForm.homeScore}
                      onChange={(e) => setEditingMatchForm({ ...editingMatchForm, homeScore: e.target.value })}
                      className="w-16 h-11 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <span className="text-xl font-black text-gray-400 self-end pb-2">:</span>
                  <div className="text-center">
                    <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 max-w-[90px] truncate">
                      {editingMatchForm.awayTeamName || 'الفريق الثاني'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      placeholder="-"
                      value={editingMatchForm.awayScore}
                      onChange={(e) => setEditingMatchForm({ ...editingMatchForm, awayScore: e.target.value })}
                      className="w-16 h-11 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {editingMatchForm.status === 'FINISHED' && (
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl text-right">
                    ⚡ عند الحفظ، ستتم إعادة احتساب نقاط جميع المتسابقين تلقائياً وبشكل آمن وفوري دون أي تكرار.
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60">
                <div>
                  <span className="block text-xs font-black text-gray-900 dark:text-white">
                    فتح إمكانية التوقع للجمهور
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold">
                    {editingMatchForm.isActive ? 'المباراة متاحة حالياً للتوقع' : 'التوقع مغلق لهذه المباراة'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMatchForm({ ...editingMatchForm, isActive: !editingMatchForm.isActive })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    editingMatchForm.isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {editingMatchForm.isActive ? 'مفتوح للتوقع' : 'مغلق'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingMatchEdit}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isSavingMatchEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ التعديلات...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ التعديلات في قاعدة البيانات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL: Quick Create League */}
      {isCreateLeagueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    إضافة بطولة أو دوري جديد
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    حفظ الدوري في قاعدة البيانات لسهولة اختياره دائماً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateLeagueModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeague} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  اسم البطولة / الدوري <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: دوري روشن السعودي"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  رابط شعار البطولة (Logo URL)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newLeagueLogo}
                  onChange={(e) => setNewLeagueLogo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white dir-ltr text-right"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateLeagueModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLeague}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isCreatingLeague ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ البطولة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. MODAL: Quick Create Team / National Team */}
      {isCreateTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    إضافة فريق أو منتخب وطني
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    حفظ الفريق في قاعدة البيانات مع دعم المنتخبات
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTeamModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  اسم الفريق أو المنتخب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: منتخب السعودية، الهلال، النصر"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  رابط الشعار أو العلم (Logo URL)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newTeamLogo}
                  onChange={(e) => setNewTeamLogo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white dir-ltr text-right"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeam}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isCreatingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ الفريق</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. MODAL: Add Manual Prediction for User */}
      {isAddUserPredModalOpen && viewingPredictionsForMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    إضافة توقع يدوي لمستخدم
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    تسجيل توقع نيابة عن مستخدم بواسطة الأدمن
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserPredModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Match info banner */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
              <span className="truncate max-w-[120px]">{viewingPredictionsForMatch.match?.homeTeam?.name}</span>
              <span className="text-gray-400 font-mono text-[11px]">vs</span>
              <span className="truncate max-w-[120px] text-left">{viewingPredictionsForMatch.match?.awayTeam?.name}</span>
            </div>

            <form onSubmit={handleAdminSaveUserPrediction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  المتسابق أو المستخدم <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newPredUserId}
                  onChange={(e) => setNewPredUserId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                >
                  <option value="">-- اختر المتسابق من القائمة --</option>
                  {participants.map((p) => (
                    <option key={p.id || p.userId} value={p.userId}>
                      {p.userName || p.name || `مستخدم #${p.userId}`} ({p.userEmail || p.email || ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Home & Away Scores */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl">
                <label className="block text-xs font-black text-gray-700 dark:text-gray-300 text-center mb-2">
                  توقع النتيجة (أهداف الفريقين)
                </label>
                <div className="flex items-center justify-center gap-4 dir-ltr">
                  <div className="text-center">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1 max-w-[90px] truncate">
                      {viewingPredictionsForMatch.match?.homeTeam?.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      required
                      value={newPredHomeScore}
                      onChange={(e) => setNewPredHomeScore(e.target.value)}
                      className="w-16 h-11 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <span className="text-xl font-black text-gray-400 self-end pb-2">:</span>
                  <div className="text-center">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1 max-w-[90px] truncate">
                      {viewingPredictionsForMatch.match?.awayTeam?.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      required
                      value={newPredAwayScore}
                      onChange={(e) => setNewPredAwayScore(e.target.value)}
                      className="w-16 h-11 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserPredModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserPred}
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brand/90 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSavingUserPred ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ التوقع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. MODAL: Edit Specific User Prediction */}
      {editingUserPred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    تعديل توقع المستخدم
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    تعديل أهداف التوقع للمتسابق
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUserPred(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User display */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-xs shrink-0">
                {editingUserPred.userAvatar ? (
                  <img src={editingUserPred.userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  editingUserPred.userName?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <div className="text-xs font-black text-gray-900 dark:text-white">
                  {editingUserPred.userName || 'مستخدم'}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {editingUserPred.userEmail || 'لا يوجد بريد'}
                </div>
              </div>
            </div>

            <form onSubmit={handleAdminUpdateUserPrediction} className="space-y-4">
              {/* Home & Away Scores */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl">
                <label className="block text-xs font-black text-gray-700 dark:text-gray-300 text-center mb-2">
                  تعديل أهداف التوقع
                </label>
                <div className="flex items-center justify-center gap-4 dir-ltr">
                  <div className="text-center">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1 max-w-[90px] truncate">
                      {viewingPredictionsForMatch?.match?.homeTeam?.name || 'الفريق الأول'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      required
                      value={editPredHomeScore}
                      onChange={(e) => setEditPredHomeScore(e.target.value)}
                      className="w-16 h-11 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <span className="text-xl font-black text-gray-400 self-end pb-2">:</span>
                  <div className="text-center">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1 max-w-[90px] truncate">
                      {viewingPredictionsForMatch?.match?.awayTeam?.name || 'الفريق الثاني'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      required
                      value={editPredAwayScore}
                      onChange={(e) => setEditPredAwayScore(e.target.value)}
                      className="w-16 h-11 text-center text-xl font-black rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingUserPred(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUserPred}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isUpdatingUserPred ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ التعديل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. MODAL: Create New Contest */}
      {isCreateContestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">إنشاء مسابقة جديدة</h3>
                  <p className="text-[11px] text-gray-400 font-bold">تبدأ المسابقة فور إنشائها ويتم إنهاؤها يدوياً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateContestModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContest} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 dark:text-gray-300 mb-1.5">
                  اسم المسابقة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مسابقة توقعات دوري روشن 2026"
                  value={newContestName}
                  onChange={(e) => setNewContestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  وصف المسابقة اختياري
                </label>
                <textarea
                  rows={3}
                  placeholder="اكتب وصفاً أو شروطاً خاصة بالمسابقة للمشاركين..."
                  value={newContestDescription}
                  onChange={(e) => setNewContestDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:border-brand resize-none"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateContestModalOpen(false)}
                  disabled={isCreatingContest}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingContest || !newContestName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingContest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إنشاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 15. MODAL: Participant Prediction History & Anti-Fraud Audit */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-black shrink-0 border border-brand/20">
                  {inspectingUser.avatar ? (
                    <img loading="lazy" src={inspectingUser.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    inspectingUser.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                      سجل تدقيق توقعات: {inspectingUser.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      ID: #{inspectingUser.id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {inspectingUser.email || 'بدون بريد'} &bull; تدقيق وتتبع كل مباراة تم التوقع عليها ومطابقة النقاط المكتسبة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInspectingUser(null);
                  setInspectingUserPredictions([]);
                }}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingUserHistory ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-7 h-7 text-brand animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-400">جاري جلب وتدقيق سجل توقعات المتسابق...</p>
                </div>
              ) : inspectingUserPredictions.length === 0 ? (
                <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                  <div className="text-sm font-black text-gray-700 dark:text-gray-300">لا توجد توقعات مسجلة</div>
                  <p className="text-xs text-gray-400 mt-1">لم يقم هذا المتسابق بإدخال أي توقعات للمباريات حتى الآن.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inspectingUserPredictions.map((pred, pIdx) => {
                    const m = pred.match;
                    const isFinished = m?.status === 'finished';
                    const hasActualScores = m && m.homeScore !== undefined && m.homeScore !== null && m.awayScore !== undefined && m.awayScore !== null;
                    
                    // Verification correctness
                    let isCorrect = false;
                    let isExact = false;
                    if (hasActualScores) {
                      const actualDiff = m.homeScore - m.awayScore;
                      const predDiff = pred.homeScore - pred.awayScore;
                      isExact = m.homeScore === pred.homeScore && m.awayScore === pred.awayScore;
                      isCorrect = isExact || (actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0);
                    }

                    return (
                      <div
                        key={pred.id || `pred-${pIdx}`}
                        className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs"
                      >
                        {/* Match & Teams */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-1">
                            <span>{m?.league?.name || 'الدوري'}</span>
                            {m?.round && <span>&bull; الجولة {m.round}</span>}
                            <span>&bull; {m?.date ? new Date(m.date).toLocaleDateString('ar-EG') : ''}</span>
                            {m?.status === 'finished' ? (
                              <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[9px] font-black">
                                منتهية
                              </span>
                            ) : m?.status === 'live' ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-black animate-pulse">
                                جارية الآن
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-black">
                                مجدولة
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                              {m?.homeTeam?.name || 'الفريق المضيف'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">ضد</span>
                            <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                              {m?.awayTeam?.name || 'الفريق الضيف'}
                            </span>
                          </div>

                          {/* Actual Result if finished */}
                          {hasActualScores && (
                            <div className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1.5">
                              <span>النتيجة الفعلية:</span>
                              <span className="font-mono font-black text-gray-900 dark:text-white dir-ltr">
                                {m.homeScore} - {m.awayScore}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* User Prediction */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-200 dark:border-gray-700/60">
                          {/* Predicted Score Box */}
                          <div className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                            <span className="text-[9px] font-bold text-gray-400 block">توقع المتسابق</span>
                            <span className="font-mono font-black text-sm text-gray-900 dark:text-white dir-ltr">
                              {pred.homeScore} - {pred.awayScore}
                            </span>
                          </div>

                          {/* Golden Prediction Badge */}
                          {pred.isGolden && (
                            <span className="px-2 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 text-[10px] font-black flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              ذهبي
                            </span>
                          )}

                          {/* Correctness & Calculation Status */}
                          <div className="text-center min-w-[85px]">
                            {pred.isCalculated ? (
                              <div>
                                {isExact ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 block mb-0.5">
                                    تطابق تام
                                  </span>
                                ) : isCorrect ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 block mb-0.5">
                                    صحيح (فارق/فائز)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 block mb-0.5">
                                    خاطئ
                                  </span>
                                )}
                                <span className="font-mono font-black text-xs text-brand">
                                  +{pred.pointsEarned || 0} نقطة
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500">
                                بانتظار المباراة
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="text-xs font-bold text-gray-500">
                إجمالي التوقعات: <span className="font-mono font-black text-gray-900 dark:text-white">{inspectingUserPredictions.length}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingUser(null);
                  setInspectingUserPredictions([]);
                }}
                className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-black transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16. CONFIRM MODAL (Unified confirmation for sensitive/destructive actions) */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        cancelText={confirmModalConfig.cancelText}
        variant={confirmModalConfig.variant}
        isLoading={confirmModalConfig.isLoading}
        onConfirm={confirmModalConfig.onConfirm}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 17. VISUAL TEAM LOGO PICKER MODAL */}
      <TeamLogoPickerModal
        isOpen={logoPickerModal.isOpen}
        onClose={() => setLogoPickerModal((prev) => ({ ...prev, isOpen: false }))}
        title={logoPickerModal.title}
        currentLogo={logoPickerModal.currentLogo}
        currentTeamName={logoPickerModal.currentTeamName}
        leagueName={logoPickerModal.leagueName}
        existingTeams={existingData.teams}
        onSelectLogo={handleSelectLogoFromModal}
      />
      <datalist id="existing-leagues-list">
        {Array.from(
          new Map(
            [...existingData.leagues, ...ALL_KNOWN_LEAGUES].map((l) => [l.name, l])
          ).values()
        ).map((l) => (
          <option key={l.id} value={l.name} />
        ))}
      </datalist>
      <datalist id="existing-teams-list">
        {Array.from(
          new Map(
            [...existingData.teams, ...ALL_KNOWN_TEAMS].map((t) => [t.name, t])
          ).values()
        ).map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
    </div>
  );
}

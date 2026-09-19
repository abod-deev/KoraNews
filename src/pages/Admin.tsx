import React, { useState, useMemo, useCallback } from 'react';
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { PERMISSIONS } from '../constants/permissions';
import {
  FileText,
  Users,
  Activity,
  X,
  CheckCircle,
  XCircle,
  Menu,
  ExternalLink,
  Trophy,
  Target,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  Shield,
  Crown,
  Zap,
  ChevronLeft,
  AlertTriangle,
  Archive
} from 'lucide-react';
import AdminNews from '../components/admin/sections/AdminNews';
import AdminUsers from '../components/admin/sections/AdminUsers';
import AdminLogs from '../components/admin/sections/AdminLogs';
import AdminErrorLogs from '../components/admin/sections/AdminErrorLogs';
import AdminPredictionsManager from '../components/admin/AdminPredictionsManager';
import { AdminTeamsLogos } from '../components/admin/sections/AdminTeamsLogos';

type AdminTab = 'news' | 'predictions_matches' | 'predictions_participants' | 'predictions_contests' | 'predictions_archive' | 'teams_logos' | 'users' | 'logs' | 'error_logs';

const VALID_TABS: readonly AdminTab[] = [
  'news',
  'predictions_matches',
  'predictions_participants',
  'predictions_contests',
  'predictions_archive',
  'teams_logos',
  'users',
  'logs',
  'error_logs',
] as const;

export default function Admin() {
  useSEO('لوحة التحكم', 'إدارة الموقع والمحتوى الرياضي لمنصة KoraNews');
  const { user, token, loading: authLoading, isOwner, isManager, isAdmin, hasPermission, hasAnyPermission, roleBadge } = useAuth();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManageNews = isOwner || isManager || hasAnyPermission(
    PERMISSIONS.NEWS_VIEW,
    PERMISSIONS.NEWS_ADD,
    PERMISSIONS.NEWS_EDIT,
    PERMISSIONS.NEWS_DELETE,
    PERMISSIONS.NEWS_PUBLISH,
    PERMISSIONS.NEWS_UNPUBLISH,
    PERMISSIONS.NEWS_FEATURE,
    PERMISSIONS.NEWS_BREAKING,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.CATEGORIES_ADD,
    PERMISSIONS.CATEGORIES_EDIT,
    PERMISSIONS.CATEGORIES_DELETE
  );

  const canViewContestsTab = isOwner || isManager || hasAnyPermission(
    PERMISSIONS.PREDICTIONS_VIEW,
    PERMISSIONS.PREDICTIONS_MANAGE,
    PERMISSIONS.PREDICTIONS_CONTEST_CREATE,
    PERMISSIONS.PREDICTIONS_CONTEST_END,
    PERMISSIONS.PREDICTIONS_CONTEST_DELETE
  );

  const canViewMatchesTab = isOwner || isManager || hasAnyPermission(
    PERMISSIONS.PREDICTIONS_VIEW,
    PERMISSIONS.PREDICTIONS_MANAGE,
    PERMISSIONS.PREDICTIONS_MATCH_ADD,
    PERMISSIONS.PREDICTIONS_MATCH_EDIT,
    PERMISSIONS.PREDICTIONS_MATCH_DELETE,
    PERMISSIONS.PREDICTIONS_RESULTS_MANAGE,
    PERMISSIONS.PREDICTIONS_POINTS_MANAGE,
    PERMISSIONS.MATCHES_VIEW,
    PERMISSIONS.MATCHES_MANAGE
  );

  const canViewParticipantsTab = isOwner || isManager || hasAnyPermission(
    PERMISSIONS.PREDICTIONS_VIEW,
    PERMISSIONS.PREDICTIONS_MANAGE,
    PERMISSIONS.PREDICTIONS_PARTICIPANTS_MANAGE
  );

  const canManagePredictions = canViewContestsTab || canViewMatchesTab || canViewParticipantsTab;

  const canManageUsers = isOwner || isManager || hasAnyPermission(
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_ACTIVATE,
    PERMISSIONS.USERS_DEACTIVATE,
    PERMISSIONS.ADMINS_VIEW,
    PERMISSIONS.ADMINS_ADD,
    PERMISSIONS.ADMINS_EDIT,
    PERMISSIONS.ADMINS_REMOVE,
    PERMISSIONS.ADMINS_PERMISSIONS_MANAGE
  );

  const canViewLogs = isOwner || isManager || hasPermission(PERMISSIONS.ACTIVITY_LOGS_VIEW);
  const canViewErrorLogs = isOwner || isManager || hasPermission(PERMISSIONS.ERROR_LOGS_VIEW);

  // Compute default fallback tab according to permissions
  const defaultTab = useMemo<AdminTab>(() => {
    if (canManageNews) return 'news';
    if (canViewMatchesTab) return 'predictions_matches';
    if (canViewParticipantsTab) return 'predictions_participants';
    if (canViewContestsTab) return 'predictions_contests';
    if (canManageUsers) return 'users';
    if (canViewLogs) return 'logs';
    if (canViewErrorLogs) return 'error_logs';
    return 'news';
  }, [canManageNews, canViewMatchesTab, canViewParticipantsTab, canViewContestsTab, canManageUsers, canViewLogs, canViewErrorLogs]);

  // Derive active tab from URL query param (?tab=...) with permission validation
  const activeTab = useMemo<AdminTab>(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam || !VALID_TABS.includes(tabParam as AdminTab)) {
      return defaultTab;
    }

    const candidate = tabParam as AdminTab;

    // Verify permission for the requested tab
    switch (candidate) {
      case 'news':
        return canManageNews ? 'news' : defaultTab;
      case 'predictions_matches':
        return canViewMatchesTab ? 'predictions_matches' : defaultTab;
      case 'predictions_participants':
        return canViewParticipantsTab ? 'predictions_participants' : defaultTab;
      case 'predictions_contests':
        return canViewContestsTab ? 'predictions_contests' : defaultTab;
      case 'predictions_archive':
        return canViewContestsTab ? 'predictions_archive' : defaultTab;
      case 'teams_logos':
        return canViewMatchesTab || isOwner || isManager ? 'teams_logos' : defaultTab;
      case 'users':
        return canManageUsers ? 'users' : defaultTab;
      case 'logs':
        return canViewLogs ? 'logs' : defaultTab;
      case 'error_logs':
        return canViewErrorLogs ? 'error_logs' : defaultTab;
      default:
        return defaultTab;
    }
  }, [searchParams, defaultTab, canManageNews, canViewContestsTab, canViewMatchesTab, canViewParticipantsTab, canManageUsers, canViewLogs, canViewErrorLogs]);

  // Navigate to tab with standard browser history push (creates a new history entry)
  const navigateToTab = useCallback((newTab: AdminTab) => {
    setIsSidebarOpen(false);

    // If already on the requested tab, avoid duplicate history entries
    if (activeTab === newTab) {
      return;
    }

    navigate(`/admin?tab=${newTab}`);
  }, [activeTab, navigate]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const tabDetails: Record<AdminTab, { title: string; subtitle: string; icon: React.ElementType }> = {
    news: { title: 'الأخبار والتصنيفات', subtitle: 'إدارة المحتوى والمقالات الرياضية', icon: FileText },
    predictions_matches: { title: 'مباريات التوقع', subtitle: 'جدولة المباريات واحتساب النتائج', icon: Target },
    predictions_participants: { title: 'المشاركون بالمسابقة', subtitle: 'قائمة المتسابقين وإحصائيات التوقعات', icon: Users },
    predictions_contests: { title: 'المسابقات والإعدادات', subtitle: 'إعدادات المسابقات ونظام النقاط', icon: Trophy },
    predictions_archive: { title: 'أرشيف المسابقات المنتهية', subtitle: 'استعراض وإدارة وتصفح بيانات المسابقات السابقة', icon: Archive },
    teams_logos: { title: 'إدارة الأندية والشعارات', subtitle: 'تعديل وتصحيح أسماء وشعارات الأندية في قاعدة البيانات', icon: Shield },
    users: { title: 'إدارة المستخدمين', subtitle: 'التحكم بالصلاحيات وحسابات المشرفين', icon: ShieldCheck },
    logs: { title: 'سجل العمليات', subtitle: 'سجل التغييرات وأحداث النظام الإدارية', icon: Activity },
    error_logs: { title: 'سجل الأخطاء', subtitle: 'متابعة ورصد استثناءات النظام وتصدير التقارير', icon: AlertTriangle },
  };

  if (authLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-500">جاري التحقق من الصلاحيات الإدارية...</span>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const currentTabInfo = tabDetails[activeTab] || tabDetails[defaultTab];
  const CurrentIcon = currentTabInfo.icon;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 font-sans text-right" dir="rtl">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsSidebarOpen(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity cursor-pointer animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Admin Sidebar Navigation */}
      <aside
        role="dialog"
        aria-label="القائمة الجانبية للوحة التحكم"
        className={`fixed lg:sticky top-0 lg:top-16 right-0 h-full lg:h-[calc(100vh-4rem)] w-[86vw] sm:w-72 max-w-xs bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 z-50 lg:z-30 transform transition-transform duration-300 ease-out shadow-2xl lg:shadow-none flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => navigateToTab(defaultTab)}
            className="flex items-center gap-2.5 min-w-0 text-right cursor-pointer"
            title="الانتقال إلى الرئيسية"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              {isOwner ? <Crown className="w-5 h-5 text-amber-300" /> : isManager ? <Zap className="w-5 h-5 text-purple-200" /> : <Shield className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white tracking-tight text-base">KoraNews</span>
                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${roleBadge.badgeClass}`}>
                  {roleBadge.label}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">لوحة الإدارة الموحدة</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <div className="p-3 sm:p-3.5 flex-1 overflow-y-auto space-y-5">
          
          {/* Group 1: المحتوى الرياضي */}
          {canManageNews && (
            <div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
                المحتوى الرياضي
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => navigateToTab('news')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                    activeTab === 'news'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'news' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                  <span>الأخبار والتصنيفات</span>
                </button>
              </div>
            </div>
          )}

          {/* Group 2: مسابقة التوقعات */}
          {canManagePredictions && (
            <div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
                مسابقة التوقعات
              </div>
              <div className="space-y-1">
                {canViewMatchesTab && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('predictions_matches')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'predictions_matches'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <Target className={`w-4 h-4 shrink-0 ${activeTab === 'predictions_matches' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>مباريات التوقع</span>
                  </button>
                )}
                {canViewParticipantsTab && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('predictions_participants')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'predictions_participants'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <Users className={`w-4 h-4 shrink-0 ${activeTab === 'predictions_participants' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>المشاركون بالمسابقة</span>
                  </button>
                )}
                {canViewContestsTab && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('predictions_contests')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'predictions_contests'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <Trophy className={`w-4 h-4 shrink-0 ${activeTab === 'predictions_contests' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>المسابقات والإعدادات</span>
                  </button>
                )}
                {canViewContestsTab && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('predictions_archive')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'predictions_archive'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <Archive className={`w-4 h-4 shrink-0 ${activeTab === 'predictions_archive' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>المسابقات المنتهية والأرشيف</span>
                  </button>
                )}
                {(canViewMatchesTab || isOwner || isManager) && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('teams_logos')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'teams_logos'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <Shield className={`w-4 h-4 shrink-0 ${activeTab === 'teams_logos' ? 'text-amber-400 dark:text-amber-500' : 'text-amber-500/80'}`} />
                    <span>إدارة الأندية والشعارات</span>
                  </button>
                )}
                <Link
                  to="/predictions/leaderboard"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>المتصدرون (الواجهة)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {/* Group 3: الإدارة والأمان */}
          {(canManageUsers || canViewLogs || canViewErrorLogs) && (
            <div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
                الإدارة والأمان
              </div>
              <div className="space-y-1">
                {canManageUsers && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('users')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'users'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'users' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>إدارة المستخدمين</span>
                  </button>
                )}
                {canViewLogs && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('logs')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'logs'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'logs' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>سجل العمليات</span>
                  </button>
                )}
                {canViewErrorLogs && (
                  <button
                    type="button"
                    onClick={() => navigateToTab('error_logs')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer ${
                      activeTab === 'error_logs'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-bold'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${activeTab === 'error_logs' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                    <span>سجل الأخطاء</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                {user?.name || 'مدير النظام'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                {roleBadge.label}
              </div>
            </div>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full lg:w-[calc(100%-18rem)] overflow-x-clip min-h-[calc(100vh-4rem)] flex flex-col">
        
        {/* Top Header Bar for Desktop & Mobile */}
        <header className="sticky top-12 sm:top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 py-2 flex items-center justify-between shadow-2xs h-14">
          
          {/* Breadcrumb & Section Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              title="فتح القائمة"
              aria-label="فتح القائمة الإدارية"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0 truncate">
              <span className="font-bold text-slate-400 hidden sm:inline shrink-0">
                لوحة التحكم
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline shrink-0">/</span>
              <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white truncate">
                <CurrentIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{currentTabInfo.title}</span>
              </div>
            </div>
          </div>

          {/* Right Action Icons & Profile Chip */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* System Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>النظام متصل</span>
            </div>

            {/* View Public Site Link */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-colors shadow-2xs"
              title="معاينة الموقع للجمهور"
            >
              <span className="hidden sm:inline">معاينة الموقع</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </Link>

            {/* Mini User Avatar Chip */}
            <div className="flex items-center gap-2 ps-1.5 sm:ps-2 border-s border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden lg:inline truncate max-w-[120px]">
                {user?.name}
              </span>
            </div>

          </div>
        </header>

        {/* Content Container */}
        <div className="p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full flex-1">
          
          {/* Toast / Notification Banner (Fixed Top of Screen) */}
          {message && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] pointer-events-auto">
              <div
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-black shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 ${
                  message.type === 'success'
                    ? 'bg-emerald-50/95 text-emerald-900 border-emerald-300 dark:bg-emerald-950/95 dark:text-emerald-200 dark:border-emerald-700/80'
                    : 'bg-rose-50/95 text-rose-900 border-rose-300 dark:bg-rose-950/95 dark:text-rose-200 dark:border-rose-700/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span className="truncate">{message.text}</span>
                </div>
                <button
                  onClick={() => setMessage(null)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer text-slate-500 dark:text-slate-400"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Active Tab View Rendering */}
          {activeTab === 'news' && canManageNews && (
            <AdminNews token={token} showMsg={showMsg} />
          )}

          {activeTab === 'predictions_matches' && canViewMatchesTab && (
            <AdminPredictionsManager
              token={token}
              onShowMessage={showMsg}
              activeSubTab="matches"
            />
          )}

          {activeTab === 'predictions_participants' && canViewParticipantsTab && (
            <AdminPredictionsManager
              token={token}
              onShowMessage={showMsg}
              activeSubTab="participants"
            />
          )}

          {activeTab === 'predictions_contests' && canViewContestsTab && (
            <AdminPredictionsManager
              token={token}
              onShowMessage={showMsg}
              activeSubTab="settings"
            />
          )}

          {activeTab === 'predictions_archive' && canViewContestsTab && (
            <AdminPredictionsManager
              token={token}
              onShowMessage={showMsg}
              activeSubTab="completed_contests"
            />
          )}

          {activeTab === 'teams_logos' && (canViewMatchesTab || isOwner || isManager) && (
            <AdminTeamsLogos />
          )}

          {activeTab === 'users' && canManageUsers && (
            <AdminUsers token={token} showMsg={showMsg} />
          )}

          {activeTab === 'logs' && canViewLogs && (
            <AdminLogs token={token} />
          )}

          {activeTab === 'error_logs' && canViewErrorLogs && (
            <AdminErrorLogs token={token} />
          )}

        </div>
      </main>

    </div>
  );
}


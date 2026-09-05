import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import {
  LayoutDashboard,
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
  ChevronLeft
} from 'lucide-react';
import AdminOverview from '../components/admin/sections/AdminOverview';
import AdminNews from '../components/admin/sections/AdminNews';
import AdminUsers from '../components/admin/sections/AdminUsers';
import AdminLogs from '../components/admin/sections/AdminLogs';
import AdminPredictionsManager from '../components/admin/AdminPredictionsManager';

type AdminTab = 'overview' | 'news' | 'predictions_contests' | 'predictions_matches' | 'predictions_participants' | 'users' | 'logs';

export default function Admin() {
  useSEO('لوحة التحكم', 'إدارة الموقع والمحتوى الرياضي لمنصة KoraNews');
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin'));
  const isSuperAdmin = !!(user && user.role === 'superadmin');

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const tabDetails: Record<AdminTab, { title: string; subtitle: string; icon: React.ElementType }> = {
    overview: { title: 'نظرة عامة', subtitle: 'المؤشرات الحيوية وملخص النظام', icon: LayoutDashboard },
    news: { title: 'الأخبار والتصنيفات', subtitle: 'إدارة المحتوى والمقالات الرياضية', icon: FileText },
    predictions_contests: { title: 'المسابقات والإعدادات', subtitle: 'إعدادات المسابقات ونظام النقاط', icon: Trophy },
    predictions_matches: { title: 'مباريات التوقع', subtitle: 'جدولة المباريات واحتساب النتائج', icon: Target },
    predictions_participants: { title: 'المشاركون بالمسابقة', subtitle: 'قائمة المتسابقين وطلبات الانضمام', icon: Users },
    users: { title: 'إدارة المستخدمين', subtitle: 'التحكم بالصلاحيات وحسابات المشرفين', icon: ShieldCheck },
    logs: { title: 'سجل العمليات', subtitle: 'سجل التغييرات وأحداث النظام الإدارية', icon: Activity },
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

  const currentTabInfo = tabDetails[activeTab] || tabDetails.overview;
  const CurrentIcon = currentTabInfo.icon;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 font-sans text-right" dir="rtl">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Admin Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 right-0 h-full lg:h-[calc(100vh-4rem)] w-72 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 z-50 transform transition-transform duration-300 shadow-xl lg:shadow-none flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white tracking-tight text-base">KoraNews</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  ADMIN
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">لوحة الإدارة الموحدة</div>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          
          {/* Group 1: الرئيسية */}
          <div>
            <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
              الرئيسية
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span>لوحة التحكم (نظرة عامة)</span>
              </button>
            </div>
          </div>

          {/* Group 2: المحتوى */}
          <div>
            <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
              المحتوى الإخباري
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveTab('news'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'news'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <FileText className={`w-4 h-4 ${activeTab === 'news' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span>الأخبار والتصنيفات</span>
              </button>
            </div>
          </div>

          {/* Group 3: التوقعات والمسابقات */}
          <div>
            <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
              التوقعات والمسابقات
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveTab('predictions_contests'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'predictions_contests'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Trophy className={`w-4 h-4 ${activeTab === 'predictions_contests' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                <span>المسابقات والإعدادات</span>
              </button>
              <button
                onClick={() => { setActiveTab('predictions_matches'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'predictions_matches'
                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Target className={`w-4 h-4 ${activeTab === 'predictions_matches' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                <span>مباريات التوقع</span>
              </button>
              <button
                onClick={() => { setActiveTab('predictions_participants'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'predictions_participants'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Users className={`w-4 h-4 ${activeTab === 'predictions_participants' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                <span>المشاركون بالمسابقة</span>
              </button>
              <Link
                to="/predictions/leaderboard"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>المتصدرون (الواجهة)</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Group 4: النظام والمستخدمون */}
          <div>
            <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
              النظام والصلاحيات
            </div>
            <div className="space-y-1">
              {isSuperAdmin && (
                <button
                  onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'users'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${activeTab === 'users' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>إدارة المستخدمين</span>
                </button>
              )}
              <button
                onClick={() => { setActiveTab('logs'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'logs'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Activity className={`w-4 h-4 ${activeTab === 'logs' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span>سجل العمليات</span>
              </button>
            </div>
          </div>

        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-sm shrink-0 border border-emerald-200/80 dark:border-emerald-800/60">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                {user?.name || 'مدير النظام'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {isSuperAdmin ? 'المالك العام (Superadmin)' : 'مشرف إداري'}
              </div>
            </div>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full lg:w-[calc(100%-18rem)] overflow-x-hidden min-h-[calc(100vh-4rem)] flex flex-col">
        
        {/* Top Header Bar for Desktop & Mobile */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          
          {/* Breadcrumb & Section Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-bold text-slate-400 hidden sm:inline">لوحة التحكم</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white">
                <CurrentIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{currentTabInfo.title}</span>
              </div>
            </div>
          </div>

          {/* Right Action Icons & Profile Chip */}
          <div className="flex items-center gap-3">
            
            {/* System Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>النظام متصل</span>
            </div>

            {/* View Public Site Link */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
              title="معاينة الموقع للجمهور"
            >
              <span className="hidden sm:inline">معاينة الموقع</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </Link>

            {/* Mini User Avatar Chip */}
            <div className="flex items-center gap-2 pl-1 border-r border-slate-200 dark:border-slate-800 pr-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden md:inline truncate max-w-[120px]">
                {user?.name}
              </span>
            </div>

          </div>
        </header>

        {/* Content Container */}
        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex-1">
          
          {/* Toast / Notification Banner */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold shadow-xs animate-in fade-in slide-in-from-top-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  : 'bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Active Tab View Rendering */}
          {activeTab === 'overview' && (
            <AdminOverview
              token={token}
              onNavigateTab={(tab) => setActiveTab(tab)}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          {activeTab === 'news' && (
            <AdminNews token={token} showMsg={showMsg} />
          )}

          {activeTab === 'predictions_contests' && (
            <AdminPredictionsManager
              token={token}
              onShowMessage={showMsg}
              activeSubTab="settings"
              hideTabs
            />
          )}

          {activeTab === 'predictions_matches' && (
            <AdminPredictionsManager
              token={token}
              onShowMessage={showMsg}
              activeSubTab="matches"
              hideTabs
            />
          )}

          {activeTab === 'predictions_participants' && (
            <AdminPredictionsManager
              token={token}
              onShowMessage={showMsg}
              activeSubTab="participants"
              hideTabs
            />
          )}

          {activeTab === 'users' && isSuperAdmin && (
            <AdminUsers token={token} showMsg={showMsg} />
          )}

          {activeTab === 'logs' && (
            <AdminLogs token={token} />
          )}

        </div>
      </main>

    </div>
  );
}


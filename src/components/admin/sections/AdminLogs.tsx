import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Activity, Search, RefreshCw, Loader2, Clock, 
  Terminal, CheckCircle, AlertCircle, FileText, Trophy, Users, Shield,
  Download, Trash2, X, Eye, Copy, Filter, ChevronLeft, ChevronRight,
  ExternalLink, Calendar
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface AdminLogsProps {
  token: string | null;
}

interface LogRecord {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
  timestamp?: string;
  user: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userRole?: string;
}

type CategoryType = 'ALL' | 'CONTESTS' | 'USERS' | 'NEWS' | 'SYSTEM';

export default function AdminLogs({ token }: AdminLogsProps) {
  const { isOwner } = useAuth();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  
  // Modals & Action States
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeDays, setPurgeDays] = useState<number>(30);
  const [isPurging, setIsPurging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/admin/logs?limit=200', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const logsList = Array.isArray(data) ? data : (data.logs || []);
        setLogs(logsList);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification('error', errData.error || 'تعذر جلب سجل العمليات');
      }
    } catch (e) {
      showNotification('error', 'حدث خطأ في الاتصال بالخادم أثناء جلب السجل');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLogs();
    }
  }, [token]);

  // Purge handler (Only for System Owner)
  const handlePurgeLogs = async () => {
    if (!token || !isOwner) return;
    setIsPurging(true);
    try {
      const url = purgeDays === -1 
        ? '/api/admin/logs' 
        : `/api/admin/logs?daysOld=${purgeDays}`;
        
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        showNotification('success', `تم تنظيف السجل بنجاح (تم حذف ${data.deletedCount || 0} عملية)`);
        setIsPurgeModalOpen(false);
        fetchLogs(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification('error', errData.error || 'فشل مسح سجل العمليات');
      }
    } catch (e) {
      showNotification('error', 'خطأ في الاتصال بالخادم أثناء مسح السجل');
    } finally {
      setIsPurging(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showNotification('error', 'لا توجد بيانات لتصديرها');
      return;
    }

    try {
      const headers = ['المعرف', 'العملية', 'نوع الكيان', 'معرف الكيان', 'المشرف', 'البريد', 'التفاصيل', 'التاريخ والوقت'];
      const rows = filteredLogs.map(l => [
        l.id,
        `"${l.action}"`,
        `"${l.entityType}"`,
        `"${l.entityId}"`,
        `"${(l.userName || l.user || '').replace(/"/g, '""')}"`,
        `"${(l.userEmail || '').replace(/"/g, '""')}"`,
        `"${formatLogDetails(l.details).replace(/"/g, '""')}"`,
        `"${new Date(l.createdAt || l.timestamp || '').toLocaleString('ar-SA')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('success', 'تم تصدير سجل العمليات بصيغة CSV بنجاح');
    } catch (e) {
      showNotification('error', 'فشل تصدير ملف السجل');
    }
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) {
      showNotification('error', 'لا توجد بيانات لتصديرها');
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `activity-logs-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('success', 'تم تصدير سجل العمليات بصيغة JSON بنجاح');
    } catch (e) {
      showNotification('error', 'فشل تصدير ملف JSON');
    }
  };

  // Copy JSON payload
  const handleCopyPayload = (obj: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch {
      // fallback
    }
  };

  // Category Matching Helper
  const matchCategory = (entityType: string, category: CategoryType): boolean => {
    if (category === 'ALL') return true;
    const type = (entityType || '').toUpperCase();
    if (category === 'CONTESTS') {
      return ['CONTEST_SETTINGS', 'PREDICTION_MATCH', 'PREDICTION', 'PREDICTIONS', 'CONTEST_PARTICIPANT', 'LEAGUE', 'TEAM'].includes(type);
    }
    if (category === 'USERS') {
      return ['USER', 'AUTH', 'ROLE', 'USER_ROLE'].includes(type);
    }
    if (category === 'NEWS') {
      return ['NEWS', 'CATEGORY', 'CATEGORIES', 'COMMENT', 'COMMENTS'].includes(type);
    }
    if (category === 'SYSTEM') {
      return ['SYSTEM', 'ACTIVITY_LOGS', 'CONFIG'].includes(type);
    }
    return true;
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      ALL: logs.length,
      CONTESTS: 0,
      USERS: 0,
      NEWS: 0,
      SYSTEM: 0,
    };
    for (const l of logs) {
      if (matchCategory(l.entityType, 'CONTESTS')) counts.CONTESTS++;
      if (matchCategory(l.entityType, 'USERS')) counts.USERS++;
      if (matchCategory(l.entityType, 'NEWS')) counts.NEWS++;
      if (matchCategory(l.entityType, 'SYSTEM')) counts.SYSTEM++;
    }
    return counts;
  }, [logs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      // 1. Category Filter
      if (!matchCategory(l.entityType, categoryFilter)) return false;

      // 2. Action Filter
      if (actionFilter !== 'ALL') {
        const act = (l.action || '').toUpperCase();
        if (actionFilter === 'CREATE' && !act.includes('CREATE')) return false;
        if (actionFilter === 'UPDATE' && !act.includes('UPDATE')) return false;
        if (actionFilter === 'DELETE' && !act.includes('DELETE')) return false;
        if (actionFilter === 'RESULTS' && !['CONFIRM_RESULT', 'UPDATE_RESULT', 'COMPLETE', 'RECALCULATE'].includes(act)) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const actionStr = (l.action || '').toLowerCase();
        const userStr = (l.userName || l.user || '').toLowerCase();
        const emailStr = (l.userEmail || '').toLowerCase();
        const entityStr = (l.entityType || '').toLowerCase();
        const idStr = String(l.entityId || '');
        const detailsStr = typeof l.details === 'object' ? JSON.stringify(l.details).toLowerCase() : String(l.details || '').toLowerCase();

        return (
          actionStr.includes(q) ||
          userStr.includes(q) ||
          emailStr.includes(q) ||
          entityStr.includes(q) ||
          idStr.includes(q) ||
          detailsStr.includes(q)
        );
      }

      return true;
    });
  }, [logs, categoryFilter, actionFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, actionFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification (Fixed Top of Screen) */}
      {message && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] pointer-events-auto">
          <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 border shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 ${
            message.type === 'success' 
              ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200' 
              : 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span className="text-xs sm:text-sm font-bold truncate">{message.text}</span>
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>سجل عمليات وأحداث النظام (Audit Logs)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            متابعة فورية ومسجلة لجميع الإجراءات الإدارية، التعديلات على المسابقات، وحركات الحسابات
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => fetchLogs(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs transition-colors shadow-xs"
            title="تحديث السجل"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>تحديث</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
            title="تصدير كملف CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>تصدير CSV</span>
          </button>

          {/* Export JSON Button */}
          <button
            onClick={handleExportJSON}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
            title="تصدير كملف JSON"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>تصدير JSON</span>
          </button>

          {/* Purge Button (Only for System Owner) */}
          {isOwner && (
            <button
              onClick={() => setIsPurgeModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl font-bold text-xs transition-colors shadow-xs"
              title="تنظيف السجلات القديمة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تنظيف السجل</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Category Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* All */}
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`p-3.5 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
            categoryFilter === 'ALL'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/80 shadow-xs ring-1 ring-emerald-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            categoryFilter === 'ALL'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">كافة العمليات</div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">{categoryCounts.ALL} حدث مسجل</div>
          </div>
        </button>

        {/* Contests */}
        <button
          onClick={() => setCategoryFilter('CONTESTS')}
          className={`p-3.5 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
            categoryFilter === 'CONTESTS'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500/80 shadow-xs ring-1 ring-amber-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            categoryFilter === 'CONTESTS'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
          }`}>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">المسابقات والتوقعات</div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">{categoryCounts.CONTESTS} حدث</div>
          </div>
        </button>

        {/* Users */}
        <button
          onClick={() => setCategoryFilter('USERS')}
          className={`p-3.5 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
            categoryFilter === 'USERS'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500/80 shadow-xs ring-1 ring-blue-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            categoryFilter === 'USERS'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
          }`}>
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">المستخدمين والأدوار</div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">{categoryCounts.USERS} حدث</div>
          </div>
        </button>

        {/* News */}
        <button
          onClick={() => setCategoryFilter('NEWS')}
          className={`p-3.5 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
            categoryFilter === 'NEWS'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500/80 shadow-xs ring-1 ring-purple-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            categoryFilter === 'NEWS'
              ? 'bg-purple-600 text-white'
              : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
          }`}>
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">الأخبار والمحتوى</div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">{categoryCounts.NEWS} حدث</div>
          </div>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        
        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="ابحث بالعملية، اسم المشرف، البريد، أو المعرف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-10 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Type Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>نوع الإجراء:</span>
            </span>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">كافة الإجراءات</option>
              <option value="CREATE">إنشاء وإضافة (Create)</option>
              <option value="UPDATE">تعديل وتحديث (Update)</option>
              <option value="RESULTS">اعتماد واحتساب النتائج (Results)</option>
              <option value="DELETE">حذف وإلغاء (Delete)</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
            <span className="text-xs font-bold text-slate-400">جاري تحميل وفحص سجل العمليات...</span>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-black uppercase text-slate-400">
                    <th className="py-3.5 px-4">نوع العملية</th>
                    <th className="py-3.5 px-4">المشرف / المنفّذ</th>
                    <th className="py-3.5 px-4">العنصر المستهدف</th>
                    <th className="py-3.5 px-4">ملخص التغيير</th>
                    <th className="py-3.5 px-4">التوقيت</th>
                    <th className="py-3.5 px-4 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedLogs.map((log) => {
                    const badge = getActionBadge(log.action);
                    const entityInfo = getEntityLabel(log.entityType, log.entityId);
                    const EntityIcon = entityInfo.icon;
                    const dateObj = new Date(log.createdAt || log.timestamp || '');
                    const timeAgo = formatTimeAgo(dateObj);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        
                        {/* Action Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${badge.bg} ${badge.textCol} ${badge.borderCol}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>{badge.text}</span>
                          </span>
                        </td>

                        {/* Admin / User */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {log.userAvatar ? (
                              <img src={log.userAvatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0">
                                {(log.userName || log.user || 'م')[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {log.userName || log.user || 'مدير النظام'}
                              </div>
                              {log.userEmail && (
                                <div className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">
                                  {log.userEmail}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Entity */}
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <EntityIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{entityInfo.label}</span>
                          </div>
                        </td>

                        {/* Summary */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-slate-600 dark:text-slate-300 max-w-xs block truncate font-medium" title={formatLogDetails(log.details)}>
                            {formatLogDetails(log.details)}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                            {timeAgo}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                            {!isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </td>

                        {/* Action Details Button */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                            title="فحص التفاصيل الكاملة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, filteredLogs.length)} من أصل {filteredLogs.length} عملية
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300">
                  صفحة {currentPage} من {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* Empty / No Matches State */
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {searchQuery || categoryFilter !== 'ALL' || actionFilter !== 'ALL'
                  ? 'لا توجد نتائج تطابق معايير البحث'
                  : 'سجل العمليات فارغ حالياً'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery || categoryFilter !== 'ALL' || actionFilter !== 'ALL'
                  ? 'جرّب تعديل كلمات البحث أو اختيار تبويب تصنيف آخر لعرض العمليات المسجلة'
                  : 'سيتم رصد وتوثيق أي عمليات إدارية أو تغييرات على المحتوى والمسابقات فور تنفيذها'}
              </p>
            </div>

            {(searchQuery || categoryFilter !== 'ALL' || actionFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setActionFilter('ALL');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                إعادة ضبط كافة الفلاتر
              </button>
            )}
          </div>
        )}

      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    تفاصيل العملية الإدارية #{selectedLog.id}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {new Date(selectedLog.createdAt || selectedLog.timestamp || '').toLocaleString('ar-SA')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Meta Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5 font-bold">نوع الإجراء:</span>
                  <span className="font-black text-slate-800 dark:text-slate-100">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-bold">المشرف المسؤول:</span>
                  <span className="font-black text-slate-800 dark:text-slate-100">
                    {selectedLog.userName || selectedLog.user || 'مدير النظام'}
                    {selectedLog.userEmail ? ` (${selectedLog.userEmail})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-bold">نوع الكيان المستهدف:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{selectedLog.entityType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-bold">معرف الكيان (Entity ID):</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{selectedLog.entityId || '—'}</span>
                </div>
              </div>

              {/* Payload Data View */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    حمولة البيانات المرفقة (Payload):
                  </span>
                  <button
                    onClick={() => handleCopyPayload(selectedLog.details)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPayload ? 'تم النسخ!' : 'نسخ JSON'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-64 border border-slate-800" dir="ltr">
                  {selectedLog.details 
                    ? JSON.stringify(selectedLog.details, null, 2)
                    : '// لا توجد بيانات مرفقة إضافية'}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Purge Modal */}
      {isPurgeModalOpen && isOwner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تنظيف سجل العمليات
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف السجلات القديمة؟ هذه العملية نهائية وتساعد في تقليل حجم قاعدة البيانات.
              </p>

              <div className="text-right space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  حدد النطاق الزمني للحذف:
                </label>
                <select
                  value={purgeDays}
                  onChange={e => setPurgeDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value={30}>حذف العمليات الأقدم من 30 يوماً (مستحسن)</option>
                  <option value={60}>حذف العمليات الأقدم من 60 يوماً</option>
                  <option value={90}>حذف العمليات الأقدم من 90 يوماً</option>
                  <option value={-1}>حذف كافة السجلات القديمة بالكامل</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurging}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handlePurgeLogs}
                disabled={isPurging}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                {isPurging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد الحذف</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Helpers
function formatLogDetails(details: any): string {
  if (!details) return '—';
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return formatLogDetails(parsed);
    } catch {
      return details;
    }
  }
  if (typeof details === 'object') {
    const parts: string[] = [];
    if (details.title) parts.push(`العنوان: ${details.title}`);
    if (details.name) parts.push(`الاسم: ${details.name}`);
    if (details.email) parts.push(`البريد: ${details.email}`);
    if (details.role) parts.push(`الرتبة: ${details.role}`);
    if (details.pointsPerMatch !== undefined) parts.push(`النقاط: ${details.pointsPerMatch}`);
    if (details.homeScore !== undefined && details.awayScore !== undefined) {
      parts.push(`النتيجة: ${details.homeScore} - ${details.awayScore}`);
    }
    if (details.status) parts.push(`الحالة: ${details.status}`);
    if (details.contestId) parts.push(`المسابقة: #${details.contestId}`);
    if (details.processedCount !== undefined) parts.push(`المعالجة: ${details.processedCount}`);
    if (details.daysOld !== undefined) parts.push(`الأيام: ${details.daysOld}`);
    if (details.deletedCount !== undefined) parts.push(`المحذوف: ${details.deletedCount}`);
    if (details.notes) parts.push(`ملاحظات: ${details.notes}`);
    if (parts.length > 0) return parts.join(' | ');
    return JSON.stringify(details);
  }
  return String(details);
}

function getEntityLabel(entityType: string, entityId?: string): { label: string; icon: any } {
  switch (entityType?.toUpperCase()) {
    case 'CONTEST_SETTINGS':
      return { label: `مسابقة #${entityId || ''}`, icon: Trophy };
    case 'CONTEST_PARTICIPANT':
      return { label: `مشارك #${entityId || ''}`, icon: Users };
    case 'PREDICTION_MATCH':
      return { label: `مباراة #${entityId || ''}`, icon: Trophy };
    case 'PREDICTION':
    case 'PREDICTIONS':
      return { label: `توقعات #${entityId || ''}`, icon: Activity };
    case 'USER':
      return { label: `مستخدم #${entityId || ''}`, icon: Users };
    case 'NEWS':
      return { label: `خبر #${entityId || ''}`, icon: FileText };
    case 'CATEGORY':
    case 'CATEGORIES':
      return { label: `قسم #${entityId || ''}`, icon: FileText };
    case 'LEAGUE':
      return { label: `دوري #${entityId || ''}`, icon: Trophy };
    case 'TEAM':
      return { label: `فريق #${entityId || ''}`, icon: Shield };
    case 'ACTIVITY_LOGS':
      return { label: 'سجل العمليات', icon: Activity };
    default:
      return { label: `${entityType || 'عنصر'} #${entityId || ''}`, icon: Terminal };
  }
}

function getActionBadge(action: string): { text: string; bg: string; textCol: string; borderCol: string } {
  switch (action?.toUpperCase()) {
    case 'CREATE':
    case 'CREATE_CUSTOM':
    case 'CREATE_BATCH':
      return { 
        text: 'إنشاء وإضافة', 
        bg: 'bg-emerald-50 dark:bg-emerald-950/50', 
        textCol: 'text-emerald-700 dark:text-emerald-400', 
        borderCol: 'border-emerald-200/80 dark:border-emerald-800/60' 
      };
    case 'UPDATE':
    case 'UPDATE_POINTS':
    case 'UPDATE_MATCH_DETAILS':
    case 'ADMIN_UPDATE':
      return { 
        text: 'تعديل وتحديث', 
        bg: 'bg-blue-50 dark:bg-blue-950/50', 
        textCol: 'text-blue-700 dark:text-blue-400', 
        borderCol: 'border-blue-200/80 dark:border-blue-800/60' 
      };
    case 'UPDATE_STATUS':
      return { 
        text: 'تحديث حالة', 
        bg: 'bg-amber-50 dark:bg-amber-950/50', 
        textCol: 'text-amber-700 dark:text-amber-400', 
        borderCol: 'border-amber-200/80 dark:border-amber-800/60' 
      };
    case 'DELETE':
    case 'ADMIN_DELETE':
      return { 
        text: 'حذف', 
        bg: 'bg-rose-50 dark:bg-rose-950/50', 
        textCol: 'text-rose-700 dark:text-rose-400', 
        borderCol: 'border-rose-200/80 dark:border-rose-800/60' 
      };
    case 'CONFIRM_RESULT':
      return { 
        text: 'اعتماد نتيجة', 
        bg: 'bg-teal-50 dark:bg-teal-950/50', 
        textCol: 'text-teal-700 dark:text-teal-400', 
        borderCol: 'border-teal-200/80 dark:border-teal-800/60' 
      };
    case 'UPDATE_RESULT':
      return { 
        text: 'تعديل نتيجة', 
        bg: 'bg-orange-50 dark:bg-orange-950/50', 
        textCol: 'text-orange-700 dark:text-orange-400', 
        borderCol: 'border-orange-200/80 dark:border-orange-800/60' 
      };
    case 'COMPLETE':
      return { 
        text: 'إنهاء مسابقة', 
        bg: 'bg-indigo-50 dark:bg-indigo-950/50', 
        textCol: 'text-indigo-700 dark:text-indigo-400', 
        borderCol: 'border-indigo-200/80 dark:border-indigo-800/60' 
      };
    case 'RECALCULATE':
      return { 
        text: 'إعادة احتساب', 
        bg: 'bg-purple-50 dark:bg-purple-950/50', 
        textCol: 'text-purple-700 dark:text-purple-400', 
        borderCol: 'border-purple-200/80 dark:border-purple-800/60' 
      };
    case 'APPLY':
      return { 
        text: 'طلب مشاركة', 
        bg: 'bg-cyan-50 dark:bg-cyan-950/50', 
        textCol: 'text-cyan-700 dark:text-cyan-400', 
        borderCol: 'border-cyan-200/80 dark:border-cyan-800/60' 
      };
    case 'PURGE':
      return { 
        text: 'تنظيف سجلات', 
        bg: 'bg-red-50 dark:bg-red-950/50', 
        textCol: 'text-red-700 dark:text-red-400', 
        borderCol: 'border-red-200/80 dark:border-red-800/60' 
      };
    default:
      return { 
        text: action || 'إجراء', 
        bg: 'bg-slate-100 dark:bg-slate-800', 
        textCol: 'text-slate-700 dark:text-slate-300', 
        borderCol: 'border-slate-200 dark:border-slate-700' 
      };
  }
}

function formatTimeAgo(date: Date): string {
  if (isNaN(date.getTime())) return '—';
  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSecs < 60) return 'منذ لحظات';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString('ar-SA');
}

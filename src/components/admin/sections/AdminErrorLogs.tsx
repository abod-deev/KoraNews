import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, AlertCircle, CheckCircle2, Clock, 
  Search, RefreshCw, Loader2, Download, Trash2, X, Eye, 
  Copy, Filter, ChevronLeft, ChevronRight, Check,
  FileText, ShieldAlert, Bug, Server, Laptop, Database, Globe
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { ErrorLogRecord } from '../../../types';

interface AdminErrorLogsProps {
  token: string | null;
}

type SeverityFilter = 'ALL' | 'fatal' | 'error' | 'warning' | 'info';
type SourceFilter = 'ALL' | 'server' | 'client' | 'api' | 'auth' | 'database';
type ResolvedFilter = 'ALL' | 'false' | 'true';

export default function AdminErrorLogs({ token }: AdminErrorLogsProps) {
  const { isOwner, isManager } = useAuth();
  const [errors, setErrors] = useState<ErrorLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Summary stats
  const [stats, setStats] = useState({
    total: 0,
    fatal: 0,
    error: 0,
    warning: 0,
    unresolved: 0,
    today: 0,
  });

  // Modals & Details
  const [selectedError, setSelectedError] = useState<ErrorLogRecord | null>(null);
  const [copiedStack, setCopiedStack] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeDays, setPurgeDays] = useState<number>(30);
  const [purgeOnlyResolved, setPurgeOnlyResolved] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isExporting, setIsExporting] = useState<'csv' | 'txt' | null>(null);
  const [isResolvingId, setIsResolvingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchErrors = async (silent = false) => {
    if (!token) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });

      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (sourceFilter !== 'ALL') params.append('source', sourceFilter);
      if (resolvedFilter !== 'ALL') params.append('resolved', resolvedFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/errors?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification('error', errData.error || 'تعذر جلب سجل الأخطاء');
      }
    } catch (e) {
      showNotification('error', 'حدث خطأ في الاتصال بالخادم أثناء جلب سجل الأخطاء');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [token, currentPage, severityFilter, sourceFilter, resolvedFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchErrors();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toggle Resolved status
  const handleToggleResolve = async (record: ErrorLogRecord) => {
    if (!token) return;
    setIsResolvingId(record.id);
    try {
      const newStatus = !record.resolved;
      const res = await fetch(`/api/admin/errors/${record.id}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolved: newStatus }),
      });

      if (res.ok) {
        setErrors(prev =>
          prev.map(e => (e.id === record.id ? { ...e, resolved: newStatus } : e))
        );
        if (selectedError && selectedError.id === record.id) {
          setSelectedError(prev => (prev ? { ...prev, resolved: newStatus } : null));
        }
        showNotification('success', newStatus ? 'تم تحديد الخطأ كمعالج بنجاح' : 'تمت إعادة فتح الخطأ');
        fetchErrors(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'فشل تحديث حالة الخطأ');
      }
    } catch (e) {
      showNotification('error', 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsResolvingId(null);
    }
  };

  // Delete Single Error
  const handleDeleteError = async (id: number) => {
    if (!token || (!isManager && !isOwner)) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل من قاعدة البيانات؟')) return;

    try {
      const res = await fetch(`/api/admin/errors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showNotification('success', 'تم حذف السجل بنجاح');
        if (selectedError?.id === id) setSelectedError(null);
        fetchErrors(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'فشل في حذف السجل');
      }
    } catch (e) {
      showNotification('error', 'خطأ في الاتصال بالخادم');
    }
  };

  // Export File (CSV / TXT)
  const handleExport = async (format: 'csv' | 'txt') => {
    if (!token) return;
    setIsExporting(format);

    try {
      const params = new URLSearchParams({ format });
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (sourceFilter !== 'ALL') params.append('source', sourceFilter);
      if (resolvedFilter !== 'ALL') params.append('resolved', resolvedFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/errors/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('فشل تصدير الملف من الخادم');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `kora-errors-${timestamp}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification('success', `تم تحميل سجل الأخطاء بصيغة (${format.toUpperCase()}) بنجاح`);
    } catch (e) {
      showNotification('error', 'تعذر تصدير سجل الأخطاء، يرجى المحاولة لاحقاً');
    } finally {
      setIsExporting(null);
    }
  };

  // Purge Logs (Owner Only)
  const handlePurge = async () => {
    if (!token || !isOwner) return;
    setIsPurging(true);

    try {
      const params = new URLSearchParams();
      if (purgeDays > 0) params.append('daysOld', String(purgeDays));
      if (purgeOnlyResolved) params.append('onlyResolved', 'true');

      const res = await fetch(`/api/admin/errors?${params.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        showNotification('success', `تم تفريغ السجل بنجاح (تم حذف ${data.deletedCount || 0} خطأ)`);
        setIsPurgeModalOpen(false);
        fetchErrors();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'فشل في تفريغ سجل الأخطاء');
      }
    } catch (e) {
      showNotification('error', 'خطأ في الاتصال بالخادم أثناء تفريغ السجل');
    } finally {
      setIsPurging(false);
    }
  };

  // Copy Stack Trace
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStack(true);
    setTimeout(() => setCopiedStack(false), 2000);
  };

  // Helper badge color
  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'fatal':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'server':
      case 'api':
        return <Server className="w-3.5 h-3.5 text-indigo-500" />;
      case 'client':
        return <Laptop className="w-3.5 h-3.5 text-emerald-500" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  if (!isOwner && !isManager) {
    return (
      <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-black text-slate-900 dark:text-white">غير مصرح بالوصول</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          سجل الأخطاء متاح حصراً لمالك ومدير النظام فقط. لا تملك الصلاحيات الكافية للوصول لهذه الصفحة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Toast Notification (Fixed Top of Screen) */}
      {message && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] pointer-events-auto">
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 ${
              message.type === 'success'
                ? 'bg-emerald-50/95 text-emerald-900 border-emerald-300 dark:bg-emerald-950/95 dark:text-emerald-200 dark:border-emerald-700'
                : 'bg-rose-50/95 text-rose-900 border-rose-300 dark:bg-rose-950/95 dark:text-rose-200 dark:border-rose-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
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

      {/* Header & Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي الأخطاء</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.total.toLocaleString('ar-SA')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">حرجة / قاتلة (Fatal)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.fatal.toLocaleString('ar-SA')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">قيد الانتظار (لم تحل)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.unresolved.toLocaleString('ar-SA')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">أخطاء اليوم</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {stats.today.toLocaleString('ar-SA')}
          </div>
        </div>

      </div>

      {/* Main Filter & Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في رسائل الخطأ، المسار (Endpoint)، البريد، أو التتبع..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons: Export CSV, Export TXT, Refresh, Purge */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Export as CSV */}
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={isExporting !== null}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              title="تصدير السجل كملف Excel / CSV متوافق مع الحروف العربية"
            >
              {isExporting === 'csv' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>تصدير CSV</span>
            </button>

            {/* Export as TXT */}
            <button
              type="button"
              onClick={() => handleExport('txt')}
              disabled={isExporting !== null}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              title="تصدير السجل كتقرير نصي منسق TXT"
            >
              {isExporting === 'txt' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span>تصدير TXT</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchErrors(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Purge (System Owner Only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(true)}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>تفريغ السجل</span>
              </button>
            )}

          </div>

        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          
          <div className="flex items-center gap-1.5 text-slate-400 font-bold me-1">
            <Filter className="w-3.5 h-3.5" />
            <span>التصفية:</span>
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value as SeverityFilter); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">جميع المستويات</option>
            <option value="fatal">حرجة (Fatal)</option>
            <option value="error">أخطاء (Error)</option>
            <option value="warning">تحذيرات (Warning)</option>
            <option value="info">معلومات (Info)</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value as SourceFilter); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">جميع المصادر</option>
            <option value="server">الخادم (Server)</option>
            <option value="client">الواجهة (Client)</option>
            <option value="api">واجهة البرمجة (API)</option>
            <option value="database">قاعدة البيانات</option>
            <option value="auth">المصادقة (Auth)</option>
          </select>

          {/* Resolved Filter */}
          <select
            value={resolvedFilter}
            onChange={(e) => { setResolvedFilter(e.target.value as ResolvedFilter); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="false">قيد الانتظار (لم تحل)</option>
            <option value="true">تم حلها (Resolved)</option>
          </select>

          <span className="text-[11px] text-slate-400 font-medium ms-auto">
            عرض {errors.length} من أصل {totalCount} سجل
          </span>

        </div>

      </div>

      {/* Logs Table / Card List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold text-slate-400">جاري تحميل سجل الأخطاء...</span>
          </div>
        ) : errors.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              لا توجد أخطاء مسجلة!
            </div>
            <div className="text-xs text-slate-400 max-w-sm">
              لم يتم رصد أي أخطاء تطابق معايير التصفية المحددة. النظام يعمل بصورة مستقرة.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800 text-slate-400 font-black">
                <tr>
                  <th className="py-3.5 px-4">المستوى / المصدر</th>
                  <th className="py-3.5 px-4">المسار / رمز الحالة</th>
                  <th className="py-3.5 px-4">رسالة الخطأ</th>
                  <th className="py-3.5 px-4">المستخدم / IP</th>
                  <th className="py-3.5 px-4">التوقيت</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {errors.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    
                    {/* Severity & Source */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${getSeverityBadge(log.severity)}`}>
                          {log.severity}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {getSourceIcon(log.source)}
                          <span>{log.source}</span>
                        </span>
                      </div>
                    </td>

                    {/* Endpoint & Status */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate" title={log.endpoint || ''}>
                        {log.endpoint || '—'}
                      </div>
                      {log.statusCode && (
                        <span className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          log.statusCode >= 500 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          HTTP {log.statusCode}
                        </span>
                      )}
                    </td>

                    {/* Message */}
                    <td className="py-3 px-4 max-w-[320px]">
                      <div className="font-bold text-slate-900 dark:text-white truncate" title={log.message}>
                        {log.message}
                      </div>
                      {log.stack && (
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {log.stack.split('\n')[0]}
                        </div>
                      )}
                    </td>

                    {/* User & IP */}
                    <td className="py-3 px-4">
                      <div className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {log.userEmail || (
                          <span className="text-slate-400 text-[11px]">زائر غير مسجل</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.ipAddress || '—'}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('ar-SA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '—'}
                    </td>

                    {/* Resolved Switch */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleResolve(log)}
                        disabled={isResolvingId === log.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          log.resolved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                        }`}
                        title={log.resolved ? 'تم حل الخطأ، انقر لإعادة فتحه' : 'انقر لتحديد الخطأ كمعالج'}
                      >
                        {isResolvingId === log.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : log.resolved ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{log.resolved ? 'تم الحل' : 'قيد الانتظار'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedError(log)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="عرض تفاصيل الخطأ وتتبع المكدس"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(isManager || isOwner) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteError(log.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="حذف هذا السجل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              الصفحة {currentPage} من {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${getSeverityBadge(selectedError.severity)}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    تفاصيل الخطأ #{selectedError.id}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    المصدر: {selectedError.source} | التوقيت: {selectedError.createdAt ? new Date(selectedError.createdAt).toLocaleString('ar-SA') : 'N/A'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Message */}
              <div>
                <div className="text-slate-400 font-bold mb-1.5">رسالة الخطأ:</div>
                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-rose-900 dark:text-rose-200 font-bold text-sm leading-relaxed">
                  {selectedError.message}
                </div>
              </div>

              {/* Endpoint & HTTP status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-slate-400 font-bold mb-1">المسار (Endpoint):</div>
                  <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
                    {selectedError.endpoint || 'غير محدد'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-slate-400 font-bold mb-1">رمز الحالة:</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedError.statusCode ? `HTTP ${selectedError.statusCode}` : 'غير محدد'}
                  </div>
                </div>
              </div>

              {/* User & Request Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-slate-400 font-bold mb-1">المستخدم:</div>
                  <div className="text-slate-800 dark:text-slate-200 truncate">
                    {selectedError.userEmail ? `${selectedError.userEmail} (ID: ${selectedError.userId})` : 'زائر (Guest)'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-slate-400 font-bold mb-1">عنوان IP:</div>
                  <div className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedError.ipAddress || 'غير معروف'}
                  </div>
                </div>
              </div>

              {/* User Agent */}
              {selectedError.userAgent && (
                <div>
                  <div className="text-slate-400 font-bold mb-1">بيانات المتصفح (User Agent):</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                    {selectedError.userAgent}
                  </div>
                </div>
              )}

              {/* Stack Trace */}
              {selectedError.stack && (
                <div>
                  <div className="flex items-center justify-between text-slate-400 font-bold mb-1.5">
                    <span>تتبع الخطأ (Stack Trace):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedError.stack!)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      {copiedStack ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStack ? 'تم النسخ' : 'نسخ التتبع'}</span>
                    </button>
                  </div>
                  <pre 
                    dir="ltr" 
                    className="p-3.5 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed max-h-52"
                  >
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedError.metadata && (
                <div>
                  <div className="text-slate-400 font-bold mb-1.5">بيانات إضافية (Metadata):</div>
                  <pre 
                    dir="ltr" 
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-200 dark:border-slate-700 max-h-40"
                  >
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => handleToggleResolve(selectedError)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  selectedError.resolved
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {selectedError.resolved ? 'إعادة فتح كغير معالج' : 'تحديد كـ "تم الحل"'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Purge Modal (Owner Only) */}
      {isPurgeModalOpen && isOwner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              تفريغ وتنظيف سجل الأخطاء
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              اختر المعايير المراد تطبيقها لحذف السجلات القديمة لتوفير المساحة وتنظيم السجلات.
            </p>

            <div className="space-y-4 text-xs font-bold mb-6">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                  حذف السجلات الأقدم من:
                </label>
                <select
                  value={purgeDays}
                  onChange={(e) => setPurgeDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value={7}>أقدم من أسبوع (7 أيام)</option>
                  <option value={30}>أقدم من شهر (30 يوم)</option>
                  <option value={90}>أقدم من 3 أشهر (90 يوم)</option>
                  <option value={0}>جميع السجلات (تفريغ كامل)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={purgeOnlyResolved}
                  onChange={(e) => setPurgeOnlyResolved(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>حذف السجلات التي تم حلها فقط (Resolved Only)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurging}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handlePurge}
                disabled={isPurging}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
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

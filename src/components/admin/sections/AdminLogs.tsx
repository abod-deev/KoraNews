import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Activity, Search, RefreshCw, Loader2, Clock, 
  Terminal, CheckCircle, AlertCircle, FileText, Trophy, Users, Shield
} from 'lucide-react';

interface AdminLogsProps {
  token: string | null;
}

export default function AdminLogs({ token }: AdminLogsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setLogs([]);
      }
    } catch (e) {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.user && l.user.toLowerCase().includes(q)) ||
      (l.details && l.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>سجل عمليات وأحداث النظام (Audit Logs)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            سجل مراجعة أمني متقدم لجميع العمليات الإدارية، التغييرات على المسابقات، وحركات الحسابات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            title="تحديث السجل"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        
        {/* Table / Timeline */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold text-slate-400">جاري فحص سجل العمليات...</span>
          </div>
        ) : logs.length > 0 ? (
          <div>
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث في سجل العمليات..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-black uppercase text-slate-400">
                    <th className="py-3.5 px-4">العملية</th>
                    <th className="py-3.5 px-4">المشرف</th>
                    <th className="py-3.5 px-4">التفاصيل</th>
                    <th className="py-3.5 px-4">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {log.action || 'إجراء نظام'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {log.user || 'مدير النظام'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {log.details || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-mono" dir="ltr">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('ar-EG') : 'الآن'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty / Auditing Ready State */
          <div className="p-8 sm:p-12">
            <div className="max-w-xl mx-auto text-center space-y-6">
              
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  نظام التدقيق والمراقبة نشط
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  يتم رصد وحفظ كافة العمليات الحساسة في خوادم المنصة المشفرة لضمان الأمان والنزاهة الكاملة لنظام المسابقات.
                </p>
              </div>

              {/* Monitored Services Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">تعديلات المسابقات</div>
                    <div className="text-[11px] text-slate-400">تحديث النقاط والقواعد والشروط</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">صلاحيات المستخدمين</div>
                    <div className="text-[11px] text-slate-400">ترقية الأدوار والتعطيل والتفعيل</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">النشر والتحرير الإخباري</div>
                    <div className="text-[11px] text-slate-400">إضافة وتعديل وحذف المقالات</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">تسجيل الدخول الإداري</div>
                    <div className="text-[11px] text-slate-400">جلسات المشرفين والتوثيق الأمني</div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>سجل التدقيق الداخلي نشط ومتصل</span>
                </span>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}

import React from 'react';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';

interface AdminAccessDeniedProps {
  title?: string;
  sectionTitle?: string;
  message?: string;
  onBack?: () => void;
}

export default function AdminAccessDenied({
  title = 'غير مصرح لك بالوصول',
  sectionTitle,
  message,
  onBack,
}: AdminAccessDeniedProps) {
  return (
    <div className="min-h-[380px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-xs space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100/70 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
            <Lock className="w-3 h-3" />
            <span>صلاحية غير متوفرة</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {sectionTitle ? `غير مصرح بالوصول إلى ${sectionTitle}` : title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {message ||
              'حسابك الحالي لا يمتلك الصلاحيات الإدارية المطلوبة لعرض أو تنفيذ عمليات داخل هذا القسم. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مالك أو مدير النظام.'}
          </p>
        </div>

        {onBack && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى لوحة التحكم</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

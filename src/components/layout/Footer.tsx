import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs text-[11px] text-slate-500 dark:text-slate-400 mt-auto select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Compact Brand & Copyright */}
        <div className="flex items-center gap-2 text-center sm:text-right">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            أخبار كرة القدم العالمية
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>&copy; {currentYear} جميع الحقوق محفوظة</span>
        </div>

        {/* Compact Inline Legal Links */}
        <div className="flex items-center gap-3 sm:gap-4 font-normal">
          <Link
            to="/terms"
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            سياسة الاستخدام
          </Link>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <Link
            to="/privacy"
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            الخصوصية والأمان
          </Link>
        </div>
      </div>
    </footer>
  );
}

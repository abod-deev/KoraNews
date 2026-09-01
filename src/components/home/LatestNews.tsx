import { useState, useEffect } from 'react';
import { ChevronLeft, Newspaper, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../services/api';
import NewsCard from '../news/NewsCard';

export default function LatestNews() {
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadData = () => {
    setIsLoading(true);
    setHasError(false);
    fetchNews()
      .then((data) => {
        if (Array.isArray(data)) {
          setLatestNews(data.slice(0, 6));
        } else {
          setLatestNews([]);
        }
      })
      .catch((err) => {
        console.error('[LatestNews] error:', err);
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100 border-r-4 border-sky-600 pr-3">
          <Newspaper className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>أحدث الأخبار الرياضية</span>
        </h2>
        
        <Link
          to="/news"
          className="text-xs sm:text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 font-extrabold flex items-center gap-1 group transition-colors"
        >
          <span>المزيد من الأخبار</span>
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : hasError ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 text-center text-rose-600 dark:text-rose-400 text-xs font-extrabold">
          <p className="mb-2">تعذر تحميل الأخبار حالياً.</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : latestNews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 text-center text-slate-500 font-bold text-xs sm:text-sm shadow-xs">
          لا توجد أخبار منشورة حالياً. يمكنك متابعة التحديثات القادمة قريبًا!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {latestNews.map((news) => (
            <NewsCard key={news.id} article={news} />
          ))}
        </div>
      )}
    </div>
  );
}


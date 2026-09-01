import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Eye, Flame, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../services/api';

export default function HeroSection() {
  const [featuredNews, setFeaturedNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    fetchNews()
      .then((data) => {
        if (Array.isArray(data)) {
          const featured = data.filter((n: any) => n.isFeatured);
          setFeaturedNews(featured.length > 0 ? featured : data.slice(0, 3));
        } else {
          setFeaturedNews([]);
        }
      })
      .catch((err) => {
        console.error('[HeroSection] error fetching news:', err);
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Skeleton Loader State
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 select-none">
        <div className="lg:col-span-2 h-[220px] sm:h-[360px] lg:h-[420px] rounded-2xl sm:rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse p-4 sm:p-6 flex flex-col justify-end gap-3">
          <div className="w-24 h-5 bg-slate-300 dark:bg-slate-700 rounded-md" />
          <div className="w-3/4 h-8 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          <div className="w-1/2 h-4 bg-slate-300 dark:bg-slate-700 rounded-md" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
          <div className="h-[120px] sm:h-[170px] lg:h-[200px] rounded-2xl sm:rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-[120px] sm:h-[170px] lg:h-[200px] rounded-2xl sm:rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error State or Empty State Fallback Hero
  if (hasError || featuredNews.length === 0) {
    return (
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[340px] bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 flex items-center p-4 sm:p-10 text-white border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-sky-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg mb-3 inline-flex items-center gap-1.5 shadow-xs">
            <Flame className="w-3.5 h-3.5" />
            <span>KoraNews • كورة نيوز</span>
          </span>
          <h1 className="text-lg sm:text-3xl lg:text-4xl font-extrabold mb-2 leading-snug sm:leading-tight">
            تغطية رياضية شاطحة ومباشرة لأبرز الأحداث العالمية
          </h1>
          <p className="text-slate-300 text-xs sm:text-base font-medium mb-4 line-clamp-2 sm:line-clamp-none">
            تابع نتائج المباريات لحظة بلحظة، جدول الترتيب، وأحدث الأخبار الحصرية بأسلوب احترافي.
          </p>
          <div className="flex items-center gap-2.5">
            <Link
              to="/matches"
              className="bg-sky-600 hover:bg-sky-700 text-white font-black text-xs sm:text-sm px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition-all shadow-xs"
            >
              جدول المباريات اليوم
            </Link>
            <Link
              to="/news"
              className="bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs sm:text-sm px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition-all border border-white/15"
            >
              الأخبار الرياضية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mainArticle = featuredNews[0];
  const sideArticles = featuredNews.slice(1, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 select-none">
      {/* Main Hero Article */}
      <Link to={`/news/${mainArticle.id}`} className="lg:col-span-2 block h-full group">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden h-[200px] sm:h-[370px] lg:h-[430px] cursor-pointer shadow-md hover:shadow-xl transition-all duration-500 border border-slate-200/50 dark:border-slate-800/80"
        >
          <img
            loading="lazy"
            src={mainArticle.image || 'https://images.unsplash.com/photo-1518605368461-1ee7c511a9eb?auto=format&fit=crop&q=80&w=1200'}
            alt={mainArticle.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1518605368461-1ee7c511a9eb?auto=format&fit=crop&q=80&w=1200';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-95"></div>
          
          <div className="absolute bottom-0 p-3 sm:p-7 w-full flex flex-col items-start justify-end">
            <span className="bg-sky-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg mb-2 inline-flex items-center gap-1 shadow-xs">
              <Flame className="w-3 h-3 text-amber-300" />
              <span>أبرز الأخبار</span>
            </span>
            <h2 className="text-base sm:text-2xl lg:text-3xl font-extrabold text-white mb-2 leading-snug sm:leading-tight group-hover:text-sky-400 transition-colors drop-shadow-md line-clamp-2">
              {mainArticle.title}
            </h2>
            <div className="flex items-center gap-3 text-slate-300 text-[11px] sm:text-xs font-bold">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{new Date(mainArticle.createdAt || Date.now()).toLocaleDateString('ar-EG')}</span>
              </span>
              {mainArticle.views !== undefined && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{mainArticle.views} مشاهدة</span>
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Side Articles */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
        {sideArticles.map((article, index) => (
          <Link to={`/news/${article.id}`} key={article.id} className="block group h-[125px] sm:h-[180px] lg:h-[calc(50%-0.5rem)]">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden h-full cursor-pointer shadow-xs hover:shadow-lg transition-all duration-500 border border-slate-200/50 dark:border-slate-800/80"
            >
              <img
                loading="lazy"
                src={article.image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600'}
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-95"></div>
              
              <div className="absolute bottom-0 p-3 sm:p-4 w-full flex flex-col items-start justify-end">
                <span className="text-[9px] sm:text-[10px] font-black text-sky-400 mb-1 flex items-center gap-1">
                  <Newspaper className="w-3 h-3" />
                  <span>خبر هام</span>
                </span>
                <h3 className="text-xs sm:text-sm lg:text-base font-extrabold text-white leading-snug group-hover:text-sky-300 transition-colors line-clamp-2 drop-shadow-sm">
                  {article.title}
                </h3>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}


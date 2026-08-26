import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import NewsCard from '../components/news/NewsCard';
import BreakingNews from '../components/home/BreakingNews';
import { fetchNews } from '../services/api';
import { useSEO } from '../hooks/useSEO';

export default function News() {
  useSEO('الأخبار', 'أحدث أخبار كرة القدم العالمية والمحلية');
  
  const [allNews, setAllNews] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(9);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsInitialLoading(true);
        const newsData = await fetchNews();
        setAllNews(newsData || []);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء جلب الأخبار');
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadData();
  }, []);

  const featuredNews = allNews.filter((n) => n.isFeatured);
  const standardNews = allNews.filter((n) => !n.isFeatured);

  const loadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 6);
      setIsLoading(false);
    }, 400);
  };

  if (isInitialLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center text-red-500 py-10 bg-red-50 dark:bg-red-900/10 rounded-2xl">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-6 sm:space-y-8">
      <BreakingNews />

      {/* Featured News Section */}
      {featuredNews.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-extrabold border-r-4 border-brand pr-2.5 sm:pr-3 text-gray-900 dark:text-white">
              الأخبار المميزة
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {featuredNews.map((article, idx) => (
              <motion.div 
                key={article.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: idx * 0.08 }}
              >
                <NewsCard article={article} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* All News Section */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-2xl font-extrabold border-r-4 border-brand pr-2.5 sm:pr-3 text-gray-900 dark:text-white">
            جميع الأخبار والمستجدات
          </h2>
          <span className="text-xs font-bold text-gray-500">
            {allNews.length} خبر متاح
          </span>
        </div>

        {allNews.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
            <p className="text-gray-500 dark:text-gray-400 font-bold">
              لا توجد أخبار متاحة حالياً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {(standardNews.length > 0 ? standardNews : allNews).slice(0, visibleCount).map((article, idx) => (
              <motion.div 
                key={article.id} 
                initial={{ opacity: 0, scale: 0.96 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: (idx % 6) * 0.05 }}
              >
                <NewsCard article={article} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination / Load More */}
        {visibleCount < (standardNews.length > 0 ? standardNews.length : allNews.length) && (
          <div className="mt-6 sm:mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-brand dark:hover:border-brand text-gray-700 dark:text-gray-300 hover:text-brand font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 mx-auto shadow-xs cursor-pointer text-xs sm:text-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />}
              {isLoading ? 'جاري التحميل...' : 'عرض المزيد من الأخبار'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

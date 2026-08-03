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
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        setIsInitialLoading(true);
        const data = await fetchNews();
        setAllNews(data);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء جلب الأخبار');
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadNews();
  }, []);

  const featuredNews = allNews.filter(n => n.isFeatured);
  const standardNews = allNews.filter(n => !n.isFeatured);

  const loadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 6);
      setIsLoading(false);
    }, 800);
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
    <div className="w-full animate-in fade-in duration-500 space-y-10">
      <BreakingNews />

      {/* Featured News Section */}
      <section>
        <h2 className="text-2xl font-extrabold mb-6 border-r-4 border-brand pr-3 text-gray-900 dark:text-white">
          الأخبار المميزة
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {featuredNews.map((article, idx) => (
            <motion.div 
              key={article.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.1 }}
            >
              <NewsCard article={article} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* All News Section */}
      <section>
        <h2 className="text-2xl font-extrabold mb-6 border-r-4 border-brand pr-3 text-gray-900 dark:text-white">
          جميع الأخبار
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {standardNews.slice(0, visibleCount).map((article, idx) => (
            <motion.div 
              key={article.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: (idx % 6) * 0.1 }}
            >
              <NewsCard article={article} />
            </motion.div>
          ))}
        </div>

        {/* Pagination / Load More */}
        {visibleCount < standardNews.length && (
          <div className="mt-10 text-center">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-brand dark:hover:border-brand text-gray-700 dark:text-gray-300 hover:text-brand font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 mx-auto shadow-sm"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLoading ? 'جاري التحميل...' : 'عرض المزيد'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

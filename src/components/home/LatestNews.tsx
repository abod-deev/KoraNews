import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../services/api';

export default function LatestNews() {
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNews().then(data => {
      setLatestNews(data.slice(0, 4));
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-extrabold border-r-4 border-brand pr-3 text-gray-900 dark:text-white">
          أحدث الأخبار
        </h2>
        <Link to="/news" className="text-xs sm:text-sm text-gray-500 hover:text-brand font-semibold transition-colors">
          المزيد من الأخبار
        </Link>
      </div>
      
      {latestNews.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 text-center text-gray-500 font-medium text-xs sm:text-sm">
          لا توجد أخبار منشورة حالياً. يمكنك إضافة أول خبر من لوحة التحكم (Admin).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {latestNews.map((news, i) => (
            <Link to={`/news/${news.id}`} key={news.id} className="block h-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 group cursor-pointer bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-gray-100 dark:border-gray-800/60 shadow-sm hover:shadow-xl transition-all duration-300 h-full"
              >
                <div className="w-full sm:w-2/5 h-44 sm:h-full min-h-[120px] shrink-0 rounded-2xl overflow-hidden relative">
                  <img loading="lazy" 
                    src={news.image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600'} 
                    alt={news.title} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
                <div className="flex flex-col justify-center py-0.5 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug group-hover:text-brand transition-colors mb-2 line-clamp-3">
                    {news.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 mt-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(news.createdAt || Date.now()).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

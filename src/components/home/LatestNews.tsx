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
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold border-r-4 border-brand pr-3 text-gray-900 dark:text-white">
          أحدث الأخبار
        </h2>
        <Link to="/news" className="text-sm text-gray-500 hover:text-brand font-semibold transition-colors">
          المزيد من الأخبار
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {latestNews.map((news, i) => (
          <Link to={`/news/${news.id}`} key={news.id}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col sm:flex-row gap-4 group cursor-pointer bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow h-full"
            >
              <div className="w-full sm:w-2/5 h-40 sm:h-full min-h-[140px] shrink-0 rounded-lg overflow-hidden relative">
                <img loading="lazy" 
                  src={news.image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600'} 
                  alt={news.title} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
              <div className="flex flex-col justify-center py-1 flex-1">
                <span className="text-xs font-bold text-brand mb-2 bg-brand/10 w-fit px-2 py-0.5 rounded text-brand">
                  {news.category?.name || 'أخبار'}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight group-hover:text-brand transition-colors mb-2">
                  {news.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                  {news.excerpt}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mt-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(news.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../services/api';

export default function HeroSection() {
  const [featuredNews, setFeaturedNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNews().then(data => {
      const featured = data.filter((n: any) => n.isFeatured);
      setFeaturedNews(featured.length > 0 ? featured : data.slice(0, 3));
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[450px] flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-8 border border-gray-100 dark:border-gray-800">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (featuredNews.length === 0) return null;

  const mainArticle = featuredNews[0];
  const sideArticles = featuredNews.slice(1, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      {/* Main Feature */}
      <Link to={`/news/${mainArticle.id}`} className="lg:col-span-2 block h-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden group h-[300px] sm:h-[400px] lg:h-[450px] cursor-pointer shadow-sm"
        >
          <img 
            src={mainArticle.image || 'https://images.unsplash.com/photo-1518605368461-1ee7c511a9eb?auto=format&fit=crop&q=80&w=1200'} 
            alt={mainArticle.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent opacity-90"></div>
          <div className="absolute bottom-0 p-6 sm:p-8 w-full flex flex-col items-start justify-end">
            <span className="bg-brand text-white text-xs font-bold px-3 py-1 rounded-md mb-4 shadow-lg">
              {mainArticle.category?.name || 'أخبار'}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 leading-tight group-hover:text-brand transition-colors drop-shadow-md">
              {mainArticle.title}
            </h2>
            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>{new Date(mainArticle.createdAt).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Side Features */}
      <div className="flex flex-col gap-4">
        {sideArticles.map((article, index) => (
          <Link to={`/news/${article.id}`} key={article.id} className="block h-[200px] lg:h-[calc(50%-0.5rem)]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className="relative rounded-2xl overflow-hidden group h-full cursor-pointer shadow-sm"
            >
              <img 
                src={article.image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600'} 
                alt={article.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent opacity-90"></div>
              <div className="absolute bottom-0 p-5 w-full flex flex-col items-start justify-end">
                <span className="bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md mb-2 shadow-lg">
                  {article.category?.name || 'أخبار'}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white leading-tight group-hover:text-blue-400 transition-colors drop-shadow-md">
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

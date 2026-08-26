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
      <div className="w-full h-[190px] sm:h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800/60 shadow-inner">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (featuredNews.length === 0) {
    return (
      <div className="relative rounded-3xl overflow-hidden h-[170px] sm:h-[320px] bg-gradient-to-br from-emerald-900 via-gray-900 to-gray-950 flex items-center p-3.5 sm:p-12 text-white border border-gray-800 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-brand text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md mb-2 inline-block">
            موقع كرة القدم الرياضي
          </span>
          <h1 className="text-base sm:text-3xl lg:text-4xl font-extrabold mb-1.5 leading-snug">
            مرحباً بك في المنصة الرياضية المتكاملة
          </h1>
          <p className="text-gray-300 text-[11px] sm:text-base font-medium mb-3 line-clamp-2 sm:line-clamp-none">
            تغطية شاملة لأحدث نتائج المباريات والدوريات العالمية والأخبار الرياضية اليومية.
          </p>
          <div className="flex gap-2">
            <Link to="/matches" className="bg-brand hover:bg-emerald-600 text-white font-bold text-[11px] sm:text-sm px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl transition-colors">
              جدول المباريات
            </Link>
            <Link to="/news" className="bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] sm:text-sm px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl transition-colors border border-white/20">
              تصفح الأخبار
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mainArticle = featuredNews[0];
  const sideArticles = featuredNews.slice(1, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4">
      {/* Main Feature */}
      <Link to={`/news/${mainArticle.id}`} className="lg:col-span-2 block h-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden group h-[200px] sm:h-[360px] lg:h-[430px] cursor-pointer shadow-md hover:shadow-xl transition-all duration-500"
        >
          <img 
            src={mainArticle.image || 'https://images.unsplash.com/photo-1518605368461-1ee7c511a9eb?auto=format&fit=crop&q=80&w=1200'} 
            alt={mainArticle.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/50 to-transparent opacity-90"></div>
          <div className="absolute bottom-0 p-3.5 sm:p-7 w-full flex flex-col items-start justify-end">
            <span className="bg-brand text-white text-[9px] sm:text-xs font-black px-2 py-0.5 rounded-md mb-1.5 inline-block">
              أبرز الأخبار
            </span>
            <h2 className="text-sm sm:text-2xl lg:text-3xl font-extrabold text-white mb-1 sm:mb-2 leading-snug sm:leading-tight group-hover:text-brand transition-colors drop-shadow-md line-clamp-2">
              {mainArticle.title}
            </h2>
            <div className="flex items-center gap-1.5 text-gray-300 text-[10px] sm:text-xs font-medium">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{new Date(mainArticle.createdAt || Date.now()).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Side Features */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-4">
        {sideArticles.map((article, index) => (
          <Link to={`/news/${article.id}`} key={article.id} className="block h-[110px] sm:h-[170px] lg:h-[calc(50%-0.5rem)]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden group h-full cursor-pointer shadow-sm hover:shadow-lg transition-all duration-500"
            >
              <img 
                src={article.image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600'} 
                alt={article.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent opacity-90"></div>
              <div className="absolute bottom-0 p-2.5 sm:p-4 w-full flex flex-col items-start justify-end">
                <h3 className="text-[11px] sm:text-sm lg:text-base font-bold text-white leading-tight group-hover:text-brand transition-colors drop-shadow-md line-clamp-2">
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

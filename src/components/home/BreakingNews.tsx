import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../services/api';

export default function BreakingNews() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breakingNews, setBreakingNews] = useState<any[]>([]);

  useEffect(() => {
    fetchNews().then((data) => {
      const breaking = data.filter((n: any) => n.isBreaking);
      setBreakingNews(breaking.length > 0 ? breaking : data.slice(0, 5));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (breakingNews.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % breakingNews.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [breakingNews.length]);

  if (breakingNews.length === 0) return null;

  const currentItem = breakingNews[currentIndex];

  return (
    <div className="flex items-center bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden mb-6 h-12 shadow-xs">
      <div className="bg-red-600 text-white px-4 h-full flex items-center gap-2 font-black text-sm whitespace-nowrap z-10 shrink-0">
        <Zap className="w-4 h-4 fill-current animate-pulse" />
        عاجل
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center h-full px-4">
        <AnimatePresence mode="wait">
          {currentItem && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full truncate"
            >
              <Link 
                to={`/news/${currentItem.id}`} 
                className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 hover:text-red-600 transition-colors block truncate"
              >
                {currentItem.title}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
      if (Array.isArray(data)) {
        const breaking = data.filter((n: any) => n.isBreaking);
        setBreakingNews(breaking.length > 0 ? breaking : data.slice(0, 5));
      }
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
    <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-2xs h-11 sm:h-12 select-none">
      <div className="bg-rose-600 text-white px-3 sm:px-4 h-full flex items-center gap-1.5 font-black text-xs sm:text-sm whitespace-nowrap z-10 shrink-0 shadow-xs">
        <Zap className="w-3.5 h-3.5 fill-current animate-pulse text-amber-300" />
        <span>عاجل</span>
      </div>
      
      <div className="flex-1 overflow-hidden relative flex items-center h-full px-3 sm:px-4">
        <AnimatePresence mode="wait">
          {currentItem && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full truncate"
            >
              <Link 
                to={`/news/${currentItem.id}`} 
                className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 hover:text-rose-600 dark:hover:text-rose-400 transition-colors block truncate"
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


import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';
import { fetchNews } from '../../services/api';

export default function BreakingNews() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breakingNews, setBreakingNews] = useState<any[]>([]);

  useEffect(() => {
    fetchNews().then((data) => {
      setBreakingNews(data.slice(0, 5));
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

  return (
    <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-6 h-12 shadow-sm">
      <div className="bg-red-600 text-white px-4 h-full flex items-center gap-2 font-bold whitespace-nowrap z-10 shrink-0">
        <Zap className="w-5 h-5 fill-current" />
        عاجل
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center h-full px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 absolute w-full truncate pr-4"
          >
            {breakingNews[currentIndex]?.title}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

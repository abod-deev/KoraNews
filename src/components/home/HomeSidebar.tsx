import { useState, useEffect } from 'react';
import StandingsWidget from './StandingsWidget';
import { TrendingUp, Folder, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { fetchNews, fetchCategories } from '../../services/api';

export default function HomeSidebar() {
  const [mostViewed, setMostViewed] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchNews().then(data => {
      // Sort by views descending and take top 5
      const sorted = [...data].sort((a, b) => b.views - a.views).slice(0, 5);
      setMostViewed(sorted);
    }).catch(console.error);

    fetchCategories().then(data => {
      setCategories(data);
    }).catch(console.error);
  }, []);

  return (
    <aside className="w-full space-y-6">
      {/* Most Viewed */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-5 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 text-gray-900 dark:text-white">
          <TrendingUp className="w-5 h-5 text-red-500" />
          الأكثر قراءة
        </h2>
        <div className="space-y-4">
          {mostViewed.map((item, i) => (
            <Link to={`/news/${item.id}`} key={item.id} className="block">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 items-start group cursor-pointer"
              >
                <div className="text-3xl font-black text-gray-100 dark:text-gray-800 leading-none group-hover:text-brand/20 transition-colors mt-1">
                  0{i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 leading-snug group-hover:text-brand transition-colors text-sm sm:text-base">
                    {item.title}
                  </h3>
                  <span className="text-xs font-semibold text-gray-500 mt-2 block">
                    {item.views} قراءة
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Standings Widget */}
      <StandingsWidget />

      {/* Categories */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 text-gray-900 dark:text-white">
          <Folder className="w-5 h-5 text-blue-500" />
          التصنيفات
        </h2>
        <div className="space-y-2">
          {categories.map((cat, i) => (
            <Link 
              to="/news" 
              key={cat.id || i} 
              className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl group transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
            >
              <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-brand">
                {cat.name}
              </span>
              <div className="flex items-center gap-3">
                <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-brand transition-colors transform group-hover:-translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Ad Banner */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 h-[250px] flex items-center justify-center relative overflow-hidden group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-blue-500/5 group-hover:scale-105 transition-transform duration-500"></div>
        <div className="relative z-10 text-center">
          <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">إعلان</span>
          <p className="font-bold text-gray-500 dark:text-gray-400">مساحة إعلانية (300x250)</p>
        </div>
      </div>
    </aside>
  );
}

import { useState, useEffect } from 'react';
import StandingsWidget from './StandingsWidget';
import { TrendingUp, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../services/api';

export default function HomeSidebar() {
  const [mostViewed, setMostViewed] = useState<any[]>([]);

  useEffect(() => {
    fetchNews()
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
          setMostViewed(sorted);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <aside className="w-full space-y-4 sm:space-y-6 select-none">
      {/* Most Viewed Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-3 sm:p-5 shadow-xs">
        <h2 className="text-xs sm:text-base font-extrabold mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-slate-900 dark:text-slate-100">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" />
          <span>الأكثر قراءة هذا الأسبوع</span>
        </h2>

        <div className="space-y-3.5">
          {mostViewed.map((item, i) => (
            <Link to={`/news/${item.id}`} key={item.id} className="block group">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 items-start cursor-pointer"
              >
                <div className="text-xl sm:text-2xl font-black text-slate-300 dark:text-slate-700 leading-none group-hover:text-sky-600 transition-colors shrink-0 w-6">
                  0{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors text-xs sm:text-sm line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-400 mt-1">
                    <Eye className="w-3 h-3 text-sky-500" />
                    <span>{item.views || 0} قراءة</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Standings Widget */}
      <StandingsWidget />
    </aside>
  );
}


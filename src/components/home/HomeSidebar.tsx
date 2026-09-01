import { useState, useEffect } from 'react';
import StandingsWidget from './StandingsWidget';
import { TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../services/api';

export default function HomeSidebar() {
  const [mostViewed, setMostViewed] = useState<any[]>([]);

  useEffect(() => {
    fetchNews().then(data => {
      // Sort by views descending and take top 5
      const sorted = [...data].sort((a, b) => b.views - a.views).slice(0, 5);
      setMostViewed(sorted);
    }).catch(console.error);
  }, []);

  return (
    <aside className="w-full space-y-6">
      {/* Most Viewed */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl border border-gray-100 dark:border-gray-800/60 p-6 shadow-lg">
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
                    {item.views || 0} قراءة
                  </span>
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

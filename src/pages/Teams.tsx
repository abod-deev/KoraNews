import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeams, Team } from '../services/sportsApi';
import { useSEO } from '../hooks/useSEO';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Search, Trophy } from 'lucide-react';

export default function Teams() {
  useSEO('الفرق والأندية', 'استعرض جميع الفرق والأندية المحلية والعالمية، وتعرف على تشكيلتها وأخبارها.');

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getTeams()
      .then(setTeams)
      .finally(() => setLoading(false));
  }, []);

  const filteredTeams = teams.filter(team => team.name.includes(search));

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2">
            الفرق والأندية
          </h1>
          <p className="text-gray-500 font-medium">استكشف جميع الأندية، وإحصائياتها وأخبارها</p>
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="ابحث عن فريق..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all shadow-sm"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand" />
        </div>
      ) : filteredTeams.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <AnimatePresence>
            {filteredTeams.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link to={`/teams/${team.id}`} className="block group h-full">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-4 h-full group-hover:border-brand/50">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center p-3 border border-gray-100 dark:border-gray-700 shadow-sm group-hover:scale-105 transition-transform">
                      <img loading="lazy" src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand transition-colors text-lg">
                        {team.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{team.description || 'فريق كرة قدم'}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لم يتم العثور على أي فرق</h3>
          <p className="text-gray-500">جرب البحث بكلمات أخرى</p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlayers, Player } from '../services/sportsApi';
import { useSEO } from '../hooks/useSEO';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Search, Users } from 'lucide-react';

export default function Players() {
  useSEO('اللاعبون', 'تصفح قائمة اللاعبين، وإحصائياتهم، وأخبارهم، وانتقالاتهم.');

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  const filteredPlayers = players.filter(player => player.name.includes(search));

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2">
            اللاعبون
          </h1>
          <p className="text-gray-500 font-medium">استكشف نجوم كرة القدم وإحصائياتهم</p>
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="ابحث عن لاعب..."
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
      ) : filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <AnimatePresence>
            {filteredPlayers.map((player, idx) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link to={`/players/${player.id}`} className="block group h-full">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all group-hover:border-brand/50 h-full flex flex-col">
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                      <img loading="lazy" src={player.image} alt={player.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 bg-brand text-white font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                        {player.number}
                      </div>
                    </div>
                    <div className="p-4 text-center flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand transition-colors text-lg mb-1 line-clamp-1">{player.name}</h3>
                      <p className="text-sm font-semibold text-gray-500">{player.position}</p>
                      <p className="text-xs text-gray-400 mt-2">{player.nationality}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لم يتم العثور على أي لاعبين</h3>
          <p className="text-gray-500">جرب البحث بكلمات أخرى</p>
        </div>
      )}
    </div>
  );
}

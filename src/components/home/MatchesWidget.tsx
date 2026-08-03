import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getMatches, Match } from '../../services/sportsApi';
import { Calendar, ChevronLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MatchesWidget() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get live matches, or top matches for today
    getMatches(new Date().toISOString().split('T')[0])
      .then(data => setMatches(data.slice(0, 3)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 mb-8 shadow-sm min-h-[250px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 mb-8 shadow-sm text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-gray-900 dark:text-white">
            <Calendar className="w-6 h-6 text-brand" />
            مباريات اليوم
          </h2>
          <Link to="/matches" className="text-sm text-brand font-semibold hover:underline flex items-center">
            عرض كل المباريات
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-gray-500 font-medium py-4 text-sm">لا توجد مباريات جارية أو مجدولة لهذا اليوم.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold flex items-center gap-2 text-gray-900 dark:text-white">
          <Calendar className="w-6 h-6 text-brand" />
          أهم المباريات
        </h2>
        <Link to="/matches" className="text-sm text-brand font-semibold hover:underline flex items-center">
          عرض الكل
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {matches.map((match, i) => (
          <motion.div 
            key={match.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 relative transition-colors cursor-pointer group"
          >
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 absolute top-3">
              {match.leagueName}
            </span>
            
            <div className="flex items-center justify-between w-full mt-6">
              {/* Team A */}
              <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center font-black p-2 group-hover:scale-110 transition-transform">
                  <img loading="lazy" src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-bold text-center text-gray-800 dark:text-gray-200 leading-tight">
                  {match.homeTeam.name}
                </span>
              </div>
              
              {/* Score / Time */}
              <div className="w-1/3 flex flex-col items-center justify-center">
                {match.status === 'SCHEDULED' ? (
                  <div className="text-xl font-bold bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg shadow-sm text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600">
                    {new Date(match.matchDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white tracking-wider">
                    <span>{match.homeScore ?? 0}</span>
                    <span className="text-gray-400">-</span>
                    <span>{match.awayScore ?? 0}</span>
                  </div>
                )}
                <span className={`text-[10px] sm:text-xs font-bold mt-2 px-2.5 py-1 rounded-full ${
                  match.status === 'LIVE' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  match.status === 'FINISHED' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {match.status === 'LIVE' ? 'مباشر' : match.status === 'FINISHED' ? 'انتهت' : 'اليوم'}
                </span>
              </div>

              {/* Team B */}
              <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center font-black p-2 group-hover:scale-110 transition-transform">
                  <img loading="lazy" src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-bold text-center text-gray-800 dark:text-gray-200 leading-tight">
                  {match.awayTeam.name}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

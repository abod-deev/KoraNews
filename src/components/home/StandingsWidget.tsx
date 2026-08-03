import { useState, useEffect } from 'react';
import { getStandings, Standing } from '../../services/sportsApi';
import { Trophy, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StandingsWidget() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show La Liga as default in sidebar
    getStandings('l1')
      .then(setStandings)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6 shadow-sm min-h-[250px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6 shadow-sm">
      <h2 className="text-lg font-extrabold mb-5 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 text-gray-900 dark:text-white">
        <Trophy className="w-5 h-5 text-yellow-500" />
        ترتيب الدوري الإسباني
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <tr>
              <th className="px-3 py-2.5 rounded-r-lg font-bold">#</th>
              <th className="px-3 py-2.5 font-bold">الفريق</th>
              <th className="px-3 py-2.5 text-center font-bold">لعب</th>
              <th className="px-3 py-2.5 text-center rounded-l-lg font-bold">نقاط</th>
            </tr>
          </thead>
          <tbody>
            {standings.slice(0, 4).map((team) => (
              <tr 
                key={team.id} 
                className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-3 py-3 font-bold text-gray-500 dark:text-gray-400">
                  <span className={`w-6 h-6 rounded flex items-center justify-center ${
                    team.rank <= 4 ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : ''
                  }`}>
                    {team.rank}
                  </span>
                </td>
                <td className="px-3 py-3 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-5 h-5 object-contain" />
                  <span className="truncate max-w-[90px]">{team.team.name}</span>
                </td>
                <td className="px-3 py-3 text-center font-medium text-gray-500">
                  {team.played}
                </td>
                <td className="px-3 py-3 text-center font-black text-brand">
                  {team.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link 
        to="/matches" 
        className="block text-center w-full mt-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg transition-colors"
      >
        عرض مركز المباريات
      </Link>
    </div>
  );
}

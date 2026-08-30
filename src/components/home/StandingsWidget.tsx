import { useState, useEffect } from 'react';
import { getStandings, Standing } from '../../services/sportsApi';
import { Trophy, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getArabicTeamName } from '../../utils/teamTranslations';

const TOP_LEAGUES = [
  { id: 'PL', name: 'الإنجليزي', fullName: 'الدوري الإنجليزي الممتاز', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'PD', name: 'الإسباني', fullName: 'الدوري الإسباني', flag: '🇪🇸' },
  { id: 'BL1', name: 'الألماني', fullName: 'الدوري الألماني', flag: '🇩🇪' },
  { id: 'SA', name: 'الإيطالي', fullName: 'الدوري الإيطالي', flag: '🇮🇹' },
  { id: 'FL1', name: 'الفرنسي', fullName: 'الدوري الفرنسي', flag: '🇫🇷' },
];

export default function StandingsWidget() {
  const [selectedLeague, setSelectedLeague] = useState('PL');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStandings(selectedLeague, '2026')
      .then(data => setStandings(data || []))
      .catch(err => console.warn('Error fetching standings widget:', err))
      .finally(() => setLoading(false));
  }, [selectedLeague]);

  const currentLeagueObj = TOP_LEAGUES.find(l => l.id === selectedLeague) || TOP_LEAGUES[0];

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800/60 p-3.5 sm:p-6 mb-4 sm:mb-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2.5 border-b border-gray-100 dark:border-gray-800 pb-2.5">
        <h2 className="text-xs sm:text-base font-extrabold flex items-center gap-1.5 text-gray-900 dark:text-white">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
          <span>ترتيب {currentLeagueObj.fullName}</span>
        </h2>
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200/60 dark:border-gray-700/60">
          2026 / 2027
        </span>
      </div>

      {/* League Selection Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2.5 no-scrollbar border-b border-gray-100 dark:border-gray-800/60 -mx-1 px-1 sm:mx-0 sm:px-0">
        {TOP_LEAGUES.map((league) => {
          const isActive = league.id === selectedLeague;
          return (
            <button
              key={league.id}
              onClick={() => setSelectedLeague(league.id)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{league.flag}</span>
              <span>{league.name}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="min-h-[180px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-brand" />
        </div>
      ) : standings.length === 0 ? (
        <div className="text-center py-6 px-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 my-2">
          <Trophy className="w-6 h-6 text-amber-500/80 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">
            لم تبدأ منافسات {currentLeagueObj.name} لموسم 2026/2027 بعد
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            سيتم عرض وتحديث جدول الترتيب تلقائياً فور انطلاق مباريات الجولة الأولى.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <table className="w-full text-[11px] sm:text-xs text-right">
            <thead className="text-[10px] sm:text-[11px] font-extrabold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
              <tr>
                <th className="px-1.5 py-1.5 text-center font-bold">#</th>
                <th className="px-1.5 py-1.5 font-bold">الفريق</th>
                <th className="px-1 py-1.5 text-center font-bold" title="المباريات الملعوبة">ل</th>
                <th className="px-1 py-1.5 text-center font-bold text-emerald-600 dark:text-emerald-400" title="فوز">ف</th>
                <th className="px-1 py-1.5 text-center font-bold text-amber-600 dark:text-amber-400" title="تعادل">ت</th>
                <th className="px-1 py-1.5 text-center font-bold text-rose-600 dark:text-rose-400" title="خسارة">خ</th>
                <th className="px-1 py-1.5 text-center font-bold" title="فارق الأهداف">ف.أ</th>
                <th className="px-1.5 py-1.5 text-center font-black text-brand">نقاط</th>
              </tr>
            </thead>
            <tbody>
              {standings.slice(0, 6).map((team, idx) => (
                <tr 
                  key={`${team.id || team.team?.id || idx}-${idx}`} 
                  className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-1.5 py-2 text-center font-bold text-gray-500 dark:text-gray-400">
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] ${
                      team.rank <= 4 ? 'bg-brand/10 text-brand font-black' : ''
                    }`}>
                      {team.rank}
                    </span>
                  </td>
                  <td className="px-1.5 py-2 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-3.5 h-3.5 object-contain shrink-0" />
                    <span className="truncate max-w-[65px] sm:max-w-[70px]">{getArabicTeamName(team.team.name) || team.team.name}</span>
                  </td>
                  <td className="px-1 py-2 text-center font-medium text-gray-500">
                    {team.played}
                  </td>
                  <td className="px-1 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {team.won}
                  </td>
                  <td className="px-1 py-2 text-center font-bold text-amber-600 dark:text-amber-400">
                    {team.drawn}
                  </td>
                  <td className="px-1 py-2 text-center font-bold text-rose-600 dark:text-rose-400">
                    {team.lost}
                  </td>
                  <td className="px-1 py-2 text-center font-medium text-gray-500" dir="ltr">
                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                  </td>
                  <td className="px-1.5 py-2 text-center font-black text-brand">
                    {team.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link 
        to="/matches" 
        className="block text-center w-full mt-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors"
      >
        عرض مركز المباريات والترتيب الكامل
      </Link>
    </div>
  );
}

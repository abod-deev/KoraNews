import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMatches, getStandings, getLeagues, League, Match, Standing } from '../services/sportsApi';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import TeamStatsChart from '../components/league/TeamStatsChart';
import MatchCard from '../components/common/MatchCard';
import { getArabicTeamName } from '../utils/teamTranslations';

export default function LeagueDetails() {
  const { id } = useParams<{ id: string }>();
  
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const upperId = id.toUpperCase();
    const defaultLeagueNames: Record<string, string> = {
      'PL': 'الدوري الإنجليزي الممتاز',
      'PD': 'الدوري الإسباني',
      'SA': 'الدوري الإيطالي',
      'BL1': 'الدوري الألماني',
      'FL1': 'الدوري الفرنسي',
      'CL': 'دوري أبطال أوروبا',
      'ELC': 'دوري البطولة الإنجليزية',
      'DED': 'الدوري الهولندي',
      'PPL': 'الدوري البرتغالي',
      'BSA': 'الدوري البرازيلي',
      'CLI': 'كأس ليبرتادوريس',
      'EC': 'بطولة أمم أوروبا',
      'WC': 'كأس العالم',
    };

    Promise.all([
      getLeagues().then(ls => ls.find(l => l.id.toUpperCase() === upperId) || null).catch(() => null),
      getStandings(upperId).catch(() => []),
      getMatches(undefined, undefined, upperId).catch(() => [])
    ]).then(([l, s, m]) => {
      const fallbackLeague: League = l || {
        id: upperId,
        name: defaultLeagueNames[upperId] || upperId,
        logo: `https://crests.football-data.org/${upperId}.png`,
        flag: '🏆'
      };
      setLeague(fallbackLeague);
      setStandings(s || []);
      setMatches(m || []);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">لم يتم العثور على البطولة</h2>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-6 sm:space-y-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-white dark:bg-gray-900 p-4 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-700 shrink-0">
          <img loading="lazy" src={league.logo} alt={league.name} className="w-full h-full object-contain" />
        </div>
        <div className="text-center sm:text-right">
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{league.name}</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">الأخبار، الترتيب والمباريات</p>
        </div>
      </div>

      {/* Visual Analytics Section with Recharts */}
      {standings.length > 0 && (
        <TeamStatsChart standings={standings} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Standings */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-2.5">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            <h2 className="font-extrabold text-lg sm:text-xl text-gray-900 dark:text-white">جدول الترتيب</h2>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs sm:text-sm text-right">
              <thead className="text-[11px] sm:text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/60 font-extrabold uppercase">
                <tr>
                  <th className="px-2.5 sm:px-5 py-3 text-center">المركز</th>
                  <th className="px-2 sm:px-4 py-3">الفريق</th>
                  <th className="px-2 sm:px-3 py-3 text-center">لعب</th>
                  <th className="px-2 sm:px-3 py-3 text-center text-emerald-600 dark:text-emerald-400">فاز</th>
                  <th className="px-2 sm:px-3 py-3 text-center text-amber-600 dark:text-amber-400">تعادل</th>
                  <th className="px-2 sm:px-3 py-3 text-center text-rose-600 dark:text-rose-400">خسر</th>
                  <th className="px-2 sm:px-3 py-3 text-center">ف.أ</th>
                  <th className="px-2.5 sm:px-5 py-3 text-center font-black text-brand">النقاط</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, idx) => (
                  <tr key={`${team.id || team.team?.id || idx}-${idx}`} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-2.5 sm:px-5 py-3 font-bold text-gray-900 dark:text-white text-center">
                      <span className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full inline-flex items-center justify-center font-bold text-[10px] sm:text-xs ${team.rank <= 4 ? 'bg-brand text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        {team.rank}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-3 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-5 h-5 sm:w-7 sm:h-7 object-contain shrink-0" />
                      <span className="truncate max-w-[90px] sm:max-w-none">{getArabicTeamName(team.team.name)}</span>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-center font-medium text-gray-500 text-xs">{team.played}</td>
                    <td className="px-2 sm:px-3 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs">{team.won}</td>
                    <td className="px-2 sm:px-3 py-3 text-center font-bold text-amber-600 dark:text-amber-400 text-xs">{team.drawn}</td>
                    <td className="px-2 sm:px-3 py-3 text-center font-bold text-rose-600 dark:text-rose-400 text-xs">{team.lost}</td>
                    <td className="px-2 sm:px-3 py-3 text-center font-medium text-gray-600 dark:text-gray-400 text-xs" dir="ltr">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                    <td className="px-2.5 sm:px-5 py-3 text-center font-black text-brand text-xs sm:text-base">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {standings.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-xs sm:text-sm">لا يتوفر ترتيب لهذه البطولة</div>
            )}
          </div>
        </div>

        {/* Sidebar - Recent/Upcoming Matches */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-gray-900 dark:text-white">مباريات البطولة</h3>
            </div>
            <div className="p-4 space-y-4">
              {matches.length > 0 ? matches.map((match, idx) => (
                <MatchCard key={match.id} match={match} index={idx} />
              )) : (
                <div className="text-center text-gray-500 py-6 text-sm">لا توجد مباريات متاحة حالياً</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMatches, getStandings, getLeagues, League, Match, Standing } from '../services/sportsApi';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

export default function LeagueDetails() {
  const { id } = useParams<{ id: string }>();
  
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      getLeagues().then(ls => ls.find(l => l.id === id) || null),
      getStandings(id),
      getMatches(undefined, undefined, id)
    ]).then(([l, s, m]) => {
      setLeague(l);
      setStandings(s);
      setMatches(m);
      setLoading(false);
    }).catch(console.error);
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
    <div className="w-full animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <img loading="lazy" src={league.logo} alt={league.name} className="w-full h-full object-contain" />
        </div>
        <div className="text-center md:text-right">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{league.name}</h1>
          <p className="text-gray-500 font-medium">الأخبار، الترتيب والمباريات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Standings */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="font-extrabold text-xl text-gray-900 dark:text-white">جدول الترتيب</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase">
                <tr>
                  <th className="px-6 py-4">المركز</th>
                  <th className="px-4 py-4">الفريق</th>
                  <th className="px-4 py-4 text-center">لعب</th>
                  <th className="px-4 py-4 text-center">فاز</th>
                  <th className="px-4 py-4 text-center">تعادل</th>
                  <th className="px-4 py-4 text-center">خسر</th>
                  <th className="px-4 py-4 text-center">ف.أ</th>
                  <th className="px-6 py-4 text-center">النقاط</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, idx) => (
                  <tr key={team.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${team.rank <= 4 ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        {team.rank}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                      <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-8 h-8 object-contain" />
                      {team.team.name}
                    </td>
                    <td className="px-4 py-4 text-center text-gray-500">{team.played}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{team.won}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{team.drawn}</td>
                    <td className="px-4 py-4 text-center text-gray-500">{team.lost}</td>
                    <td className="px-4 py-4 text-center text-gray-500" dir="ltr">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                    <td className="px-6 py-4 text-center font-black text-brand text-lg">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {standings.length === 0 && (
              <div className="p-10 text-center text-gray-500">لا يتوفر ترتيب لهذه البطولة</div>
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
              {matches.length > 0 ? matches.map(match => (
                <div key={match.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500">
                      {new Date(match.matchDate).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      match.status === 'LIVE' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                      match.status === 'FINISHED' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {match.status === 'LIVE' ? 'مباشر' : match.status === 'FINISHED' ? 'انتهت' : 'قادمة'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1 w-1/3">
                      <img loading="lazy" src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-8 h-8 object-contain" />
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate w-full text-center">{match.homeTeam.name}</span>
                    </div>
                    
                    <div className="w-1/3 flex justify-center">
                      {match.status === 'SCHEDULED' ? (
                        <span className="font-black text-gray-800 dark:text-white bg-white dark:bg-gray-700 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-gray-600">{match.matchTime}</span>
                      ) : (
                        <span className="text-xl font-black text-gray-900 dark:text-white">{match.homeScore} - {match.awayScore}</span>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1 w-1/3">
                      <img loading="lazy" src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-8 h-8 object-contain" />
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate w-full text-center">{match.awayTeam.name}</span>
                    </div>
                  </div>
                </div>
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

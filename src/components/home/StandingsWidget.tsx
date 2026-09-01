import { useState, useEffect } from 'react';
import { getStandings, Standing } from '../../services/sportsApi';
import { Trophy, Loader2, ChevronLeft, ShieldAlert } from 'lucide-react';
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
      .then((data) => setStandings(data || []))
      .catch((err) => console.warn('Error fetching standings widget:', err))
      .finally(() => setLoading(false));
  }, [selectedLeague]);

  const currentLeagueObj = TOP_LEAGUES.find((l) => l.id === selectedLeague) || TOP_LEAGUES[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs select-none">
      {/* Title Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Trophy className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 leading-none">
              ترتيب {currentLeagueObj.fullName}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">موسم 2026 / 2027</p>
          </div>
        </div>

        <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-full border border-sky-200/50 dark:border-sky-800/50">
          2026/2027
        </span>
      </div>

      {/* League Selection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 no-scrollbar border-b border-slate-100 dark:border-slate-800/80 -mx-1 px-1 sm:mx-0 sm:px-0">
        {TOP_LEAGUES.map((league) => {
          const isActive = league.id === selectedLeague;
          return (
            <button
              key={league.id}
              onClick={() => setSelectedLeague(league.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{league.flag}</span>
              <span>{league.name}</span>
            </button>
          );
        })}
      </div>

      {/* Standings Table Content */}
      {loading ? (
        <div className="min-h-[180px] flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-[11px] font-bold text-slate-400">جاري تحميل جدول الترتيب...</span>
        </div>
      ) : standings.length === 0 ? (
        <div className="text-center py-6 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 my-2 space-y-1.5">
          <ShieldAlert className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
            لم تبدأ منافسات {currentLeagueObj.name} بعد
          </p>
          <p className="text-[10px] font-bold text-slate-400 max-w-xs mx-auto">
            سيتم تحديث جدول الترتيب فور انطلاق مباريات الجولة الأولى.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar -mx-1 sm:mx-0">
          <table className="w-full text-[11px] sm:text-xs text-right whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <tr>
                <th className="px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">الفريق</th>
                <th className="px-1.5 py-2 text-center" title="المباريات الملعوبة">ل لعب</th>
                <th className="px-1.5 py-2 text-center text-emerald-600 dark:text-emerald-400" title="فوز">ف</th>
                <th className="px-1.5 py-2 text-center text-amber-600 dark:text-amber-400" title="تعادل">ت</th>
                <th className="px-1.5 py-2 text-center text-rose-600 dark:text-rose-400" title="خسارة">خ</th>
                <th className="px-1.5 py-2 text-center" title="فارق الأهداف">ف.أ</th>
                <th className="px-2 py-2 text-center font-black text-sky-600 dark:text-sky-400">نقاط</th>
              </tr>
            </thead>
            <tbody>
              {standings.slice(0, 6).map((team, idx) => {
                const teamName = getArabicTeamName(team.team.name) || team.team.name;
                return (
                  <tr
                    key={`${team.id || team.team?.id || idx}-${idx}`}
                    className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-2 py-2.5 text-center font-black text-slate-500 dark:text-slate-400">
                      <span className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] ${
                        team.rank <= 4 ? 'bg-sky-600 text-white font-black shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {team.rank}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        <img
                          loading="lazy"
                          src={team.team.logo}
                          alt={team.team.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="truncate max-w-[95px] sm:max-w-[110px]">
                        {teamName}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-center font-bold text-slate-500">
                      {team.played}
                    </td>
                    <td className="px-1.5 py-2.5 text-center font-black text-emerald-600 dark:text-emerald-400">
                      {team.won}
                    </td>
                    <td className="px-1.5 py-2.5 text-center font-black text-amber-600 dark:text-amber-400">
                      {team.drawn}
                    </td>
                    <td className="px-1.5 py-2.5 text-center font-black text-rose-600 dark:text-rose-400">
                      {team.lost}
                    </td>
                    <td className="px-1.5 py-2.5 text-center font-bold text-slate-500" dir="ltr">
                      {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                    </td>
                    <td className="px-2 py-2.5 text-center font-black text-sky-600 dark:text-sky-400 text-xs sm:text-sm">
                      {team.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link
        to={`/leagues/${selectedLeague}`}
        className="mt-3.5 w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
      >
        <span>صفحة البطولة والترتيب الكامل</span>
        <ChevronLeft className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

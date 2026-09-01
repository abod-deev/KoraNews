import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatches, getStandings, getLeagues, League, Match, Standing } from '../services/sportsApi';
import { Trophy, Calendar as CalendarIcon, Loader2, ChevronRight, ShieldAlert } from 'lucide-react';
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
      getStandings(upperId, '2026').catch(() => []),
      getMatches(undefined, undefined, upperId, '2026').catch(() => [])
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-sky-600" />
        <span className="text-xs font-black text-slate-500">جاري تحميل معلومات البطولة والترتيب...</span>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-slate-900 dark:text-white">لم يتم العثور على البطولة</h2>
        <Link to="/matches" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white font-black text-xs">
          <span>العودة إلى قائمة البطولات</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 max-w-full select-none">
      
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs font-black text-slate-400">
        <Link to="/matches" className="hover:text-sky-600 transition-colors">المباريات والبطولات</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 dark:text-slate-200">{league.name}</span>
      </div>

      {/* Header Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-right">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center p-3 sm:p-4 shadow-2xs border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <img loading="lazy" src={league.logo} alt={league.name} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">{league.name}</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-bold">الأخبار، ترتيب الأندية ومواعيد المباريات</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-950/50 border border-sky-200/50 dark:border-sky-800/50 text-sky-600 dark:text-sky-400 rounded-full text-xs font-black shrink-0">
          <span>الموسم الحالي: 2026 / 2027</span>
        </div>
      </div>

      {/* Visual Analytics Section */}
      {standings.length > 0 && standings.some(s => s.played > 0) && (
        <TeamStatsChart standings={standings} />
      )}

      {/* Main Grid: Standings & Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Standings Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trophy className="w-5 h-5 shrink-0" />
              </div>
              <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">جدول الترتيب الرسمية</h2>
            </div>
            <span className="text-xs font-black text-sky-600 bg-sky-50 dark:bg-sky-950/40 px-3 py-1 rounded-full border border-sky-200/50 dark:border-sky-800/50">
              2026 / 2027
            </span>
          </div>

          {standings.length > 0 ? (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs sm:text-sm text-right whitespace-nowrap">
                <thead className="text-[11px] sm:text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 font-black uppercase">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-center">المركز</th>
                    <th className="px-3 sm:px-4 py-3">الفريق</th>
                    <th className="px-2 sm:px-3 py-3 text-center">لعب</th>
                    <th className="px-2 sm:px-3 py-3 text-center text-emerald-600 dark:text-emerald-400">فاز</th>
                    <th className="px-2 sm:px-3 py-3 text-center text-amber-600 dark:text-amber-400">تعادل</th>
                    <th className="px-2 sm:px-3 py-3 text-center text-rose-600 dark:text-rose-400">خسر</th>
                    <th className="px-2 sm:px-3 py-3 text-center">ف.أ</th>
                    <th className="px-3 sm:px-4 py-3 text-center font-black text-sky-600">النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, idx) => (
                    <tr key={`${team.id || team.team?.id || idx}-${idx}`} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-black text-slate-900 dark:text-white text-center">
                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${team.rank <= 4 ? 'bg-sky-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                          {team.rank}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-5 h-5 object-contain shrink-0" />
                        <span>{getArabicTeamName(team.team.name)}</span>
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-center font-bold text-slate-500 text-xs">{team.played}</td>
                      <td className="px-2 sm:px-3 py-3 text-center font-black text-emerald-600 dark:text-emerald-400 text-xs">{team.won}</td>
                      <td className="px-2 sm:px-3 py-3 text-center font-black text-amber-600 dark:text-amber-400 text-xs">{team.drawn}</td>
                      <td className="px-2 sm:px-3 py-3 text-center font-black text-rose-600 dark:text-rose-400 text-xs">{team.lost}</td>
                      <td className="px-2 sm:px-3 py-3 text-center font-bold text-slate-500 text-xs" dir="ltr">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                      <td className="px-3 sm:px-4 py-3 text-center font-black text-sky-600 text-xs sm:text-base">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  لم تبدأ منافسات {league.name} لموسم 2026/2027 بعد
                </h3>
                <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">
                  لم تنطلق مباريات البطولة لموسم 2026/2027 حتى الآن. سيتم نشر وتحديث جدول الترتيب والمجموعات تلقائياً فور انطلاق الجولة الأولى.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Matches */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-2.5">
              <CalendarIcon className="w-5 h-5 text-sky-600 shrink-0" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm">مباريات البطولة</h3>
            </div>
            <div className="p-4 space-y-3.5">
              {matches.length > 0 ? matches.map((match, idx) => (
                <MatchCard key={match.id} match={match} index={idx} />
              )) : (
                <div className="text-center text-slate-400 py-8 px-4 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 font-bold space-y-1">
                  <p className="font-black text-slate-700 dark:text-slate-300">لا توجد مباريات مجدولة حالياً</p>
                  <p className="text-[11px] text-slate-400">سيتم إضافة جدول المباريات ومواعيدها فور اعتماده</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

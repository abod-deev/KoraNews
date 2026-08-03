import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Trophy, Loader2, ChevronLeft, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { getMatches, getLeagues, getStandings, Match, League, Standing } from '../services/sportsApi';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';

export default function Matches() {
  useSEO('المباريات والنتائج المباشرة', 'تابع أحدث المباريات، النتائج المباشرة، وجدول الترتيب للبطولات العالمية والمحلية.');

  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'finished' | 'scheduled'>('all');
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);

  useEffect(() => {
    getLeagues().then(setLeagues);
  }, []);

  useEffect(() => {
    setIsLoadingMatches(true);
    let statusFilter: Match['status'] | undefined;
    if (activeTab !== 'all') {
      statusFilter = activeTab === 'live' ? 'LIVE' : activeTab === 'finished' ? 'FINISHED' : 'SCHEDULED';
    }
    
    getMatches(selectedDate || undefined, statusFilter, activeLeagueId || undefined)
      .then(data => {
        setMatches(data);
      })
      .finally(() => setIsLoadingMatches(false));
  }, [activeTab, activeLeagueId, selectedDate]);

  useEffect(() => {
    if (activeLeagueId) {
      setIsLoadingStandings(true);
      getStandings(activeLeagueId)
        .then(setStandings)
        .finally(() => setIsLoadingStandings(false));
    } else {
      setStandings([]);
    }
  }, [activeLeagueId]);

  const tabs = [
    { id: 'all', label: 'الكل' },
    { id: 'live', label: 'مباشر', isLive: true },
    { id: 'scheduled', label: 'قادمة' },
    { id: 'finished', label: 'منتهية' },
  ];

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2">
            مركز المباريات
          </h1>
          <p className="text-gray-500 font-medium">تابع نتائج فريقك المفضل لحظة بلحظة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content (Matches) */}
        <div className="lg:col-span-2 space-y-6">
          {/* League Filters */}
          <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar">
            <button
              onClick={() => setActiveLeagueId(null)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border ${!activeLeagueId ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-brand/50'}`}
            >
              كل البطولات
            </button>
            {leagues.map(league => (
              <button
                key={league.id}
                onClick={() => setActiveLeagueId(league.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border ${activeLeagueId === league.id ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-brand/50'}`}
              >
                <img loading="lazy" src={league.logo} alt={league.name} className={`w-5 h-5 object-contain ${activeLeagueId === league.id ? 'brightness-0 invert' : ''}`} />
                {league.name}
              </button>
            ))}
          </div>

          {/* Date Picker Bar */}
          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">فلتر حسب التاريخ:</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate('')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${!selectedDate ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                جميع التواريخ
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${selectedDate === new Date().toISOString().split('T')[0] ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                مباريات اليوم
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="bg-white dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {tab.isLive && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Matches List */}
          <div className="space-y-4">
            {isLoadingMatches ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
              </div>
            ) : matches.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {matches.map((match, idx) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                      <span className="text-xs font-bold text-gray-500">{match.leagueName}</span>
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {new Date(match.matchDate).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <div className="p-5 flex items-center justify-between">
                      {/* Home Team */}
                      <div className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center p-2.5 border border-gray-100 dark:border-gray-700">
                          <img loading="lazy" src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-center text-sm sm:text-base leading-tight">{match.homeTeam.name}</span>
                      </div>
                      
                      {/* Score/Time */}
                      <div className="flex-1 flex flex-col items-center justify-center px-4">
                        {match.status === 'SCHEDULED' ? (
                          <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-black text-xl px-4 py-2 rounded-xl">
                            {new Date(match.matchDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">{match.homeScore ?? 0}</span>
                            <span className="text-xl text-gray-400 font-bold">-</span>
                            <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">{match.awayScore ?? 0}</span>
                          </div>
                        )}
                        
                        <div className="mt-3">
                          {match.status === 'LIVE' && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-md">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                              {match.matchTime || 'مباشر'}
                            </span>
                          )}
                          {match.status === 'FINISHED' && (
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">انتهت</span>
                          )}
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center p-2.5 border border-gray-100 dark:border-gray-700">
                          <img loading="lazy" src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-center text-sm sm:text-base leading-tight">{match.awayTeam.name}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="py-20 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Trophy className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد مباريات</h3>
                <p className="text-gray-500">لم يتم العثور على مباريات تطابق الفلاتر المحددة.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Standings) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm sticky top-24">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-gray-900 dark:text-white">جدول الترتيب</h3>
            </div>
            
            {!activeLeagueId ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 font-medium text-sm">اختر بطولة لعرض جدول الترتيب الخاص بها</p>
              </div>
            ) : isLoadingStandings ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
              </div>
            ) : standings.length > 0 ? (
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase">
                      <tr>
                        <th className="px-4 py-3 rounded-tr-lg">م</th>
                        <th className="px-2 py-3">الفريق</th>
                        <th className="px-2 py-3 text-center">ل</th>
                        <th className="px-4 py-3 text-center rounded-tl-lg">ن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, idx) => (
                        <tr key={team.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{team.rank}</td>
                          <td className="px-2 py-3 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-5 h-5 object-contain" />
                            <span className="truncate max-w-[100px]">{team.team.name}</span>
                          </td>
                          <td className="px-2 py-3 text-center text-gray-500 font-medium">{team.played}</td>
                          <td className="px-4 py-3 text-center font-black text-brand">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                  <Link 
                    to={`/leagues/${activeLeagueId}`}
                    className="flex justify-center items-center w-full py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    عرض صفحة البطولة الكاملة
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500 font-medium text-sm">لا يتوفر جدول ترتيب لهذه البطولة حالياً</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


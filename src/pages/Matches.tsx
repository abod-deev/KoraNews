import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Loader2, Calendar as CalendarIcon, RefreshCw, AlertTriangle, Filter, ArrowUpDown, Flame, Clock, Play, ShieldCheck } from 'lucide-react';
import { getMatchesWithResult, getLeagues, getStandings, Match, League, Standing } from '../services/sportsApi';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import MatchCard from '../components/common/MatchCard';
import { getArabicTeamName } from '../utils/teamTranslations';
import { trackMatchFilter } from '../services/analytics';

const formatDateString = (dateObj: Date): string => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => formatDateString(new Date());

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateString(d);
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateString(d);
};

export default function Matches() {
  useSEO('جدول المباريات والنتائج المباشرة 2026/2027', 'تابع جميع مباريات الدوري الإسباني، الإنجليزي والأبطال لموسم 2026/2027، النتائج المباشرة وجدول الترتيب.');

  const [matches, setMatches] = useState<Match[]>([]);
  const [, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'finished' | 'scheduled'>('all');
  const [activeLeagueId, setActiveLeagueId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [season] = useState<string>('2026');
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'importance'>('date_asc');
  
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);
  const [standingsLeague, setStandingsLeague] = useState<string>('PD');

  useEffect(() => {
    getLeagues().then((fetched) => {
      if (fetched && fetched.length > 0) {
        setLeagues(fetched);
      }
    });
  }, []);

  const fetchMatchesData = async (silent = false) => {
    if (!silent) {
      setIsLoadingMatches(true);
    }
    setErrorMessage(null);

    let statusFilter: string | undefined;
    if (activeTab !== 'all') {
      statusFilter = activeTab === 'live' ? 'LIVE' : activeTab === 'finished' ? 'FINISHED' : 'SCHEDULED';
    }

    try {
      const result = await getMatchesWithResult(
        selectedDate || undefined, 
        statusFilter, 
        activeLeagueId, 
        season,
        sortBy
      );

      if (result.error) {
        if (!silent) {
          setErrorMessage(result.error);
          setMatches([]);
        }
      } else {
        const fetchedList = result.matches || [];
        setMatches(fetchedList);
      }
    } catch (err: any) {
      if (!silent) {
        setErrorMessage(err.message || 'حدث خطأ غير متوقع. تأكد من اتصالك بالإنترنت.');
        setMatches([]);
      }
    } finally {
      if (!silent) {
        setIsLoadingMatches(false);
      }
    }
  };

  useEffect(() => {
    fetchMatchesData(false);
    trackMatchFilter(activeLeagueId, selectedDate, activeTab);

    const interval = setInterval(() => {
      fetchMatchesData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [activeTab, activeLeagueId, selectedDate, season, sortBy]);

  useEffect(() => {
    const targetLeague = activeLeagueId !== 'all' ? activeLeagueId : standingsLeague;
    setIsLoadingStandings(true);
    getStandings(targetLeague, '2026')
      .then(setStandings)
      .finally(() => setIsLoadingStandings(false));
  }, [activeLeagueId, standingsLeague]);

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();
  const tomorrowStr = getTomorrowStr();

  const statusTabs = [
    { id: 'all', label: 'جميع الحالات', icon: CalendarIcon },
    { id: 'live', label: 'مباشر الآن', isLive: true, icon: Play },
    { id: 'scheduled', label: 'المباريات القادمة', icon: Clock },
    { id: 'finished', label: 'المباريات المنتهية', icon: ShieldCheck },
  ];

  const defaultLeagueTabs = [
    { id: 'all', name: 'الكل', flag: '🌐' },
    { id: 'PL', name: 'الإنجليزي', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 'PD', name: 'الإسباني', flag: '🇪🇸' },
    { id: 'SA', name: 'الإيطالي', flag: '🇮🇹' },
    { id: 'BL1', name: 'الألماني', flag: '🇩🇪' },
    { id: 'FL1', name: 'الفرنسي', flag: '🇫🇷' },
    { id: 'CL', name: 'دوري الأبطال', flag: '🇪🇺' },
    { id: 'ELC', name: 'تشامبيونشيب', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 'DED', name: 'الهولندي', flag: '🇳🇱' },
    { id: 'PPL', name: 'البرتغالي', flag: '🇵🇹' },
    { id: 'BSA', name: 'البرازيلي', flag: '🇧🇷' },
    { id: 'CLI', name: 'ليبرتادوريس', flag: '🌎' },
  ];

  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === 'date_asc') {
      return new Date(a.matchDate || a.utcDate || 0).getTime() - new Date(b.matchDate || b.utcDate || 0).getTime();
    } else if (sortBy === 'date_desc') {
      return new Date(b.matchDate || b.utcDate || 0).getTime() - new Date(a.matchDate || a.utcDate || 0).getTime();
    }
    return 0;
  });

  return (
    <div className="w-full space-y-5 max-w-full select-none">
      
      {/* Page Title & Season Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
            <span>جدول المباريات والبطولات</span>
          </h1>
          <p className="text-xs font-extrabold text-slate-400 mt-1">
            متابعة فورية ومباشرة لكافة المواجهات والدوريات موسم 2026 / 2027
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50 text-xs font-black px-3 py-1.5 rounded-2xl shadow-2xs">
            موسم 2026/2027
          </span>
          <button
            onClick={() => fetchMatchesData(false)}
            disabled={isLoadingMatches}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingMatches ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Matches Section & Standings Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
        
        {/* Left Section (Matches & Filters) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Leagues Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                اختر البطولة:
              </span>
            </div>
            <div className="flex overflow-x-auto gap-1.5 no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
              {defaultLeagueTabs.map(league => {
                const isActive = activeLeagueId === league.id;
                return (
                  <button
                    key={league.id}
                    onClick={() => {
                      setActiveLeagueId(league.id);
                      if (league.id !== 'all') setStandingsLeague(league.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-sm">{league.flag}</span>
                    <span>{league.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Selector & Status Tabs Bar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
            
            {/* Quick Date Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-sky-600" />
                <span>التاريخ:</span>
                {selectedDate && (
                  <span className="text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-lg text-[11px]">
                    {selectedDate === todayStr ? 'اليوم' : selectedDate === yesterdayStr ? 'الأمس' : selectedDate === tomorrowStr ? 'غداً' : selectedDate}
                  </span>
                )}
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedDate(yesterdayStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    selectedDate === yesterdayStr
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  الأمس
                </button>

                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    selectedDate === todayStr
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  اليوم
                </button>

                <button
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    selectedDate === tomorrowStr
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  غداً
                </button>

                <button
                  onClick={() => setSelectedDate('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    !selectedDate
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  جميع التواريخ
                </button>

                {/* Date Input */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-extrabold outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Status Filter Tabs (ALL, LIVE, SCHEDULED, FINISHED) */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar">
              {statusTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 min-w-[100px] flex justify-center items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                    <Icon className={`w-3.5 h-3.5 ${tab.isLive ? 'text-rose-500' : 'text-sky-600'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Sorting Bar */}
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ArrowUpDown className="w-4 h-4 text-sky-600" />
              <span>ترتيب حسب:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSortBy('date_asc')}
                className={`px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  sortBy === 'date_asc'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                الأقرب موعداً
              </button>
              <button
                onClick={() => setSortBy('date_desc')}
                className={`px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  sortBy === 'date_desc'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                الأبعد موعداً
              </button>
              <button
                onClick={() => setSortBy('importance')}
                className={`px-3 py-1 rounded-xl text-xs font-black border transition-all flex items-center gap-1 cursor-pointer ${
                  sortBy === 'importance'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>الأهمية</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingMatches && (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-9 h-9 animate-spin text-sky-600" />
              <div className="text-sm font-black text-slate-700 dark:text-slate-300">⏳ جاري تحميل بيانات المباريات...</div>
              <p className="text-xs text-slate-400 font-bold">موسم 2026 / 2027</p>
            </div>
          )}

          {/* Error Message */}
          {!isLoadingMatches && errorMessage && (
            <div className="p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-3xl text-rose-700 dark:text-rose-300 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-black text-sm mb-1">تعذر تحميل المباريات:</h4>
                <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                <button
                  onClick={() => fetchMatchesData(false)}
                  className="mt-3 text-xs font-black underline hover:text-rose-900 dark:hover:text-white cursor-pointer"
                >
                  إعادة المحاولة الآن
                </button>
              </div>
            </div>
          )}

          {/* Matches Grid */}
          {!isLoadingMatches && !errorMessage && (
            <div>
              {sortedMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  <AnimatePresence mode="popLayout">
                    {sortedMatches.map((match, idx) => (
                      <MatchCard key={`${match.id}-${idx}`} match={match} index={idx} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 shadow-xs space-y-3">
                  <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                    لا توجد مباريات مطابقة للفلتر المحدد.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setActiveLeagueId('all');
                      setActiveTab('all');
                    }}
                    className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-xs hover:bg-sky-700 cursor-pointer"
                  >
                    عرض كافة مباريات الموسم
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Section (Standings Table Sidebar) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs sticky top-24">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Trophy className="w-4 h-4 shrink-0" />
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                    جدول الترتيب 2026/2027
                  </h3>
                </div>
              </div>

              {/* League Selector */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={activeLeagueId !== 'all' ? activeLeagueId : standingsLeague}
                  onChange={(e) => {
                    setStandingsLeague(e.target.value);
                    if (activeLeagueId !== 'all') {
                      setActiveLeagueId(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-black py-2 px-3 rounded-xl outline-none border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <option value="PD">🇪🇸 الدوري الإسباني (La Liga)</option>
                  <option value="PL">🏴󠁧󠁢󠁥󠁮󠁧󠁿 الدوري الإنجليزي (Premier League)</option>
                  <option value="SA">🇮🇹 الدوري الإيطالي (Serie A)</option>
                  <option value="BL1">🇩🇪 الدوري الألماني (Bundesliga)</option>
                  <option value="FL1">🇫🇷 الدوري الفرنسي (Ligue 1)</option>
                  <option value="CL">🇪🇺 دوري أبطال أوروبا (Champions League)</option>
                </select>
              </div>
            </div>
            
            {/* Standings Table Body */}
            {isLoadingStandings ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              </div>
            ) : standings.length > 0 ? (
              <div className="flex flex-col">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-xs text-right whitespace-nowrap">
                    <thead className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800/60 uppercase">
                      <tr>
                        <th className="px-2 py-2 text-center">م</th>
                        <th className="px-2 py-2">الفريق</th>
                        <th className="px-1.5 py-2 text-center" title="المباريات الملعوبة">ل</th>
                        <th className="px-1.5 py-2 text-center text-emerald-600 dark:text-emerald-400" title="فوز">ف</th>
                        <th className="px-1.5 py-2 text-center text-amber-600 dark:text-amber-400" title="تعادل">ت</th>
                        <th className="px-1.5 py-2 text-center text-rose-600 dark:text-rose-400" title="خسارة">خ</th>
                        <th className="px-1.5 py-2 text-center" title="فارق الأهداف">ف.أ</th>
                        <th className="px-2 py-2 text-center font-black text-sky-600">ن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, sIdx) => (
                        <tr key={`${team.id || team.team?.id || sIdx}-${sIdx}`} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-2 py-2 text-center font-black text-slate-900 dark:text-slate-100 text-xs">
                            <span className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] ${team.rank <= 4 ? 'bg-sky-600 text-white font-black' : 'text-slate-500'}`}>
                              {team.rank}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                            {team.team?.logo ? (
                              <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-4 h-4 object-contain shrink-0" />
                            ) : null}
                            <span className="truncate max-w-[90px]">{getArabicTeamName(team.team?.name) || 'غير معروف'}</span>
                          </td>
                          <td className="px-1.5 py-2 text-center text-slate-500 text-xs font-bold">{team.played}</td>
                          <td className="px-1.5 py-2 text-center text-emerald-600 dark:text-emerald-400 text-xs font-black">{team.won}</td>
                          <td className="px-1.5 py-2 text-center text-amber-600 dark:text-amber-400 text-xs font-black">{team.drawn}</td>
                          <td className="px-1.5 py-2 text-center text-rose-600 dark:text-rose-400 text-xs font-black">{team.lost}</td>
                          <td className="px-1.5 py-2 text-center text-slate-500 text-xs font-bold" dir="ltr">
                            {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                          </td>
                          <td className="px-2 py-2 text-center font-black text-sky-600 dark:text-sky-400 text-xs">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                  <Link 
                    to={`/leagues/${activeLeagueId !== 'all' ? activeLeagueId : standingsLeague}`}
                    className="flex justify-center items-center w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    عرض صفحة البطولة والتحليلات
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-slate-800 dark:text-slate-200 font-black text-xs">
                  لم تبدأ منافسات هذه البطولة لموسم 2026/2027 بعد
                </p>
                <p className="text-slate-400 text-[11px] font-bold">
                  سيتم تحديث جدول الترتيب تلقائياً فور انطلاق المباريات.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

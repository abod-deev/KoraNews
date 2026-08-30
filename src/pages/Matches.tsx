import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Loader2, Calendar as CalendarIcon, RefreshCw, AlertTriangle, Filter, ArrowUpDown, Flame } from 'lucide-react';
import { getMatchesWithResult, getLeagues, getStandings, Match, League, Standing } from '../services/sportsApi';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import MatchCard from '../components/common/MatchCard';
import { getArabicTeamName } from '../utils/teamTranslations';

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
  useSEO('جدول المباريات والنتائج المباشرة 2026/2027', 'تابع جميع مباريات جميع الدوريات العالمية لموسم 2026/2027، النتائج المباشرة وجدول الترتيب.');

  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'finished' | 'scheduled'>('all');
  const [activeLeagueId, setActiveLeagueId] = useState<string>('all'); // Default to All Leagues
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [season] = useState<string>('2026'); // Season 2026/2027
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'importance'>('date_asc');
  
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);
  const [standingsLeague, setStandingsLeague] = useState<string>('PD');

  useEffect(() => {
    getLeagues().then((fetched) => {
      if (fetched && fetched.length > 0) {
        setLeagues(fetched);
      } else {
        setLeagues([
          { id: 'all', name: 'جميع الدوريات', logo: '🌐', flag: '🌐' },
          { id: 'PL', name: 'الدوري الإنجليزي الممتاز', logo: 'https://crests.football-data.org/PL.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
          { id: 'PD', name: 'الدوري الإسباني', logo: 'https://crests.football-data.org/PD.png', flag: '🇪🇸' },
          { id: 'SA', name: 'الدوري الإيطالي', logo: 'https://crests.football-data.org/SA.png', flag: '🇮🇹' },
          { id: 'BL1', name: 'الدوري الألماني', logo: 'https://crests.football-data.org/BL1.png', flag: '🇩🇪' },
          { id: 'FL1', name: 'الدوري الفرنسي', logo: 'https://crests.football-data.org/FL1.png', flag: '🇫🇷' },
          { id: 'CL', name: 'دوري أبطال أوروبا', logo: 'https://crests.football-data.org/CL.png', flag: '🇪🇺' },
          { id: 'ELC', name: 'دوري البطولة الإنجليزية', logo: 'https://crests.football-data.org/ELC.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
          { id: 'DED', name: 'الدوري الهولندي', logo: 'https://crests.football-data.org/DED.png', flag: '🇳🇱' },
          { id: 'PPL', name: 'الدوري البرتغالي', logo: 'https://crests.football-data.org/PPL.png', flag: '🇵🇹' },
          { id: 'BSA', name: 'الدوري البرازيلي', logo: 'https://crests.football-data.org/BSA.png', flag: '🇧🇷' },
          { id: 'CLI', name: 'كأس ليبرتادوريس', logo: 'https://crests.football-data.org/CLI.png', flag: '🌎' },
        ]);
      }
    });
  }, []);

  // Fetch matches dynamically from backend proxy
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

    // Auto-refresh every 20 seconds for live synchronized results
    const interval = setInterval(() => {
      fetchMatchesData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [activeTab, activeLeagueId, selectedDate, season, sortBy]);

  // Update standings when active league changes or standalone standings league changes
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
    { id: 'all', label: 'الكل' },
    { id: 'live', label: '⚡ مباشر الآن', isLive: true },
    { id: 'scheduled', label: '⏰ قادمة' },
    { id: 'finished', label: '✅ انتهت' },
  ];

  const defaultLeagueTabs = [
    { id: 'all', name: 'الكل', flag: '🌐' },
    { id: 'PL', name: 'الإنجليزي', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 'PD', name: 'الإسباني', flag: '🇪🇸' },
    { id: 'SA', name: 'الإيطالي', flag: '🇮🇹' },
    { id: 'BL1', name: 'الألماني', flag: '🇩🇪' },
    { id: 'FL1', name: 'الفرنسي', flag: '🇫🇷' },
    { id: 'CL', name: 'دوري أبطال أوروبا', flag: '🇪🇺' },
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
    <div className="w-full animate-in fade-in duration-500 space-y-4 sm:space-y-6 max-w-full">
      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        
        {/* Left Section (Matches & Filters) */}
        <div className="lg:col-span-2 space-y-3.5 sm:space-y-5">
          
          {/* Leagues Filter Bar */}
          <div className="flex overflow-x-auto pb-1.5 mb-3 gap-1 sm:gap-1.5 no-scrollbar border-b border-gray-100 dark:border-gray-800 -mx-2 px-2 sm:mx-0 sm:px-0">
            {defaultLeagueTabs.map(league => {
              const isActive = activeLeagueId === league.id;
              return (
              <button
                key={league.id}
                onClick={() => {
                  setActiveLeagueId(league.id);
                  if (league.id !== 'all') setStandingsLeague(league.id);
                }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${
                  isActive
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{league.flag}</span>
                <span>{league.name}</span>
              </button>
            )})}
          </div>

          {/* Date Selector Section */}
          <div className="bg-white dark:bg-gray-900 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand" />
                تاريخ المباريات:
              </span>
              <div className="flex items-center gap-1.5">
                {selectedDate && (
                  <span className="text-[10px] sm:text-xs font-bold text-gray-500">
                    {selectedDate === todayStr ? 'اليوم' : selectedDate === yesterdayStr ? 'الأمس' : selectedDate === tomorrowStr ? 'غداً' : selectedDate}
                  </span>
                )}
                <button
                  onClick={fetchMatchesData}
                  disabled={isLoadingMatches}
                  title="تحديث المباريات"
                  className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMatches ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all ${selectedDate === yesterdayStr ? 'bg-brand text-white border-brand shadow-xs' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand'}`}
              >
                الأمس
              </button>

              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all ${selectedDate === todayStr ? 'bg-brand text-white border-brand shadow-xs' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand'}`}
              >
                اليوم
              </button>

              <button
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all ${selectedDate === tomorrowStr ? 'bg-brand text-white border-brand shadow-xs' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand'}`}
              >
                غداً
              </button>

              <button
                onClick={() => setSelectedDate('')}
                className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all ${!selectedDate ? 'bg-brand text-white border-brand shadow-xs' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand'}`}
              >
                الكل
              </button>

              {/* Custom Date Picker Input */}
              <div className="relative flex items-center flex-1 sm:flex-initial min-w-[120px]">
                <input
                  id="matchDateInput"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto px-2 py-1 rounded-lg sm:rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-[11px] sm:text-xs font-bold outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Match Status Tabs */}
          <div className="bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center shadow-2xs overflow-x-auto no-scrollbar">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[65px] sm:min-w-[75px] flex justify-center items-center gap-1 py-1.5 sm:py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {tab.isLive && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sorting Options Bar */}
          <div className="bg-white dark:bg-gray-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5">
            <span className="text-[11px] sm:text-xs font-extrabold text-gray-900 dark:text-white flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-brand" />
              الترتيب:
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
              <button
                onClick={() => setSortBy('date_asc')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 border whitespace-nowrap ${
                  sortBy === 'date_asc'
                    ? 'bg-brand text-white border-brand shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand/50'
                }`}
              >
                الأقرب موعداً
              </button>
              <button
                onClick={() => setSortBy('date_desc')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 border whitespace-nowrap ${
                  sortBy === 'date_desc'
                    ? 'bg-brand text-white border-brand shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand/50'
                }`}
              >
                الأبعد موعداً
              </button>
              <button
                onClick={() => setSortBy('importance')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 border whitespace-nowrap ${
                  sortBy === 'importance'
                    ? 'bg-brand text-white border-brand shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand/50'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-500" />
                الأهمية
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingMatches && (
            <div id="loadingMessage" className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-brand" />
              <div className="text-lg font-bold text-gray-700 dark:text-gray-300">⏳ جاري تحميل المباريات من المصدر...</div>
              <p className="text-xs text-gray-400">موسم 2026 / 2027</p>
            </div>
          )}

          {/* Error Message Alert */}
          {!isLoadingMatches && errorMessage && (
            <div id="errorMessage" className="p-5 bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-900 rounded-2xl text-red-700 dark:text-red-300 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-extrabold text-base mb-1">تنبيه في طلب البيانات:</h4>
                <p className="text-sm font-semibold leading-relaxed">{errorMessage}</p>
                <button
                  onClick={fetchMatchesData}
                  className="mt-3 text-xs font-bold underline hover:text-red-900 dark:hover:text-white"
                >
                  إعادة المحاولة الأن
                </button>
              </div>
            </div>
          )}

          {/* Matches List */}
          {!isLoadingMatches && !errorMessage && (
            <div id="matchesContainer" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedMatches.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {sortedMatches.map((match, idx) => (
                    <MatchCard key={`${match.id}-${idx}`} match={match} index={idx} />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 shadow-sm">
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {activeLeagueId !== 'all' 
                      ? `📭 لا توجد مباريات لـ (${defaultLeagueTabs.find(l => l.id === activeLeagueId)?.name || 'هذه البطولة'}) في هذا اليوم المحدد`
                      : '📭 لا توجد مباريات جارية أو مجدولة لهذا التاريخ والفلتر المحدد'}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    {activeLeagueId !== 'all'
                      ? 'يمكنك الضغط على الزر أدناه لعرض جدول جميع مباريات البطولة لموسم 2026/2027'
                      : 'جرب اختيار تاريخ مختلف أو الضغط على "عرض جميع المباريات" لعرض الجدول الكامل للموسم'}
                  </p>
                  <button
                    onClick={() => setSelectedDate('')}
                    className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-brand-dark cursor-pointer"
                  >
                    {activeLeagueId !== 'all' ? 'عرض جميع مباريات هذه البطولة' : 'عرض جميع مباريات الموسم'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Source Info */}
          <div className="text-center pt-4 text-xs text-gray-400">
            تغطية حية لجميع البطولات والمباريات - موسم 2026/2027
          </div>
        </div>

        {/* Right Section (Standings Table Sidebar) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm sticky top-24">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand" />
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                    جدول الترتيب 2026/2027
                  </h3>
                </div>
              </div>

              {/* League Selector for Standings */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={activeLeagueId !== 'all' ? activeLeagueId : standingsLeague}
                  onChange={(e) => {
                    setStandingsLeague(e.target.value);
                    if (activeLeagueId !== 'all') {
                      setActiveLeagueId(e.target.value);
                    }
                  }}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold py-1.5 px-3 rounded-lg outline-none border border-gray-200 dark:border-gray-700 cursor-pointer"
                >
                  <option value="PD">الدوري الإسباني (La Liga)</option>
                  <option value="PL">الدوري الإنجليزي (Premier League)</option>
                  <option value="SA">الدوري الإيطالي (Serie A)</option>
                  <option value="BL1">الدوري الألماني (Bundesliga)</option>
                  <option value="FL1">الدوري الفرنسي (Ligue 1)</option>
                  <option value="CL">دوري أبطال أوروبا (Champions League)</option>
                </select>
              </div>
            </div>
            
            {isLoadingStandings ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
              </div>
            ) : standings.length > 0 ? (
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-[11px] font-extrabold text-gray-500 bg-gray-50 dark:bg-gray-800/60 uppercase">
                      <tr>
                        <th className="px-2 py-2.5 text-center">م</th>
                        <th className="px-2 py-2.5">الفريق</th>
                        <th className="px-1.5 py-2.5 text-center" title="المباريات الملعوبة">ل</th>
                        <th className="px-1.5 py-2.5 text-center text-emerald-600 dark:text-emerald-400" title="فوز">ف</th>
                        <th className="px-1.5 py-2.5 text-center text-amber-600 dark:text-amber-400" title="تعادل">ت</th>
                        <th className="px-1.5 py-2.5 text-center text-rose-600 dark:text-rose-400" title="خسارة">خ</th>
                        <th className="px-1.5 py-2.5 text-center" title="فارق الأهداف">ف.أ</th>
                        <th className="px-2 py-2.5 text-center font-black text-brand">ن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, sIdx) => (
                        <tr key={`${team.id || team.team?.id || sIdx}-${sIdx}`} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-2 py-2.5 text-center font-bold text-gray-900 dark:text-white text-xs">
                            <span className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] ${team.rank <= 4 ? 'bg-brand/10 text-brand font-black' : 'text-gray-500'}`}>
                              {team.rank}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 text-xs">
                            {team.team?.logo ? (
                              <img loading="lazy" src={team.team.logo} alt={team.team.name} className="w-4 h-4 object-contain shrink-0" />
                            ) : null}
                            <span className="truncate max-w-[85px] sm:max-w-[100px]">{getArabicTeamName(team.team?.name) || 'غير معروف'}</span>
                          </td>
                          <td className="px-1.5 py-2.5 text-center text-gray-500 text-xs font-medium">{team.played}</td>
                          <td className="px-1.5 py-2.5 text-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">{team.won}</td>
                          <td className="px-1.5 py-2.5 text-center text-amber-600 dark:text-amber-400 text-xs font-bold">{team.drawn}</td>
                          <td className="px-1.5 py-2.5 text-center text-rose-600 dark:text-rose-400 text-xs font-bold">{team.lost}</td>
                          <td className="px-1.5 py-2.5 text-center text-gray-500 text-xs font-medium" dir="ltr">
                            {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                          </td>
                          <td className="px-2 py-2.5 text-center font-black text-brand text-xs">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                  <Link 
                    to={`/leagues/${activeLeagueId !== 'all' ? activeLeagueId : standingsLeague}`}
                    className="flex justify-center items-center w-full py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    عرض صفحة البطولة الكاملة
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto mb-2 flex items-center justify-center border border-amber-200/50 dark:border-amber-900/30">
                  <Trophy className="w-5 h-5" />
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-bold text-xs mb-1">
                  لم تبدأ منافسات هذه البطولة لموسم 2026/2027 بعد
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                  سيتم تحديث جدول الترتيب تلقائياً فور انطلاق مباريات الجولة الأولى.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

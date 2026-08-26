import { useState, useEffect } from 'react';
import { getMatchesWithResult, Match } from '../../services/sportsApi';
import { Calendar, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import MatchCard from '../common/MatchCard';

const LEAGUE_TABS = [
  { id: 'all', name: 'الكل', flag: '🌐' },
  { id: 'PL', name: 'الإنجليزي', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'PD', name: 'الإسباني', flag: '🇪🇸' },
  { id: 'SA', name: 'الإيطالي', flag: '🇮🇹' },
  { id: 'BL1', name: 'الألماني', flag: '🇩🇪' },
  { id: 'FL1', name: 'الفرنسي', flag: '🇫🇷' },
  { id: 'CL', name: 'الأبطال', flag: '🇪🇺' },
  { id: 'ELC', name: 'تشامبيونشيب', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'DED', name: 'الهولندي', flag: '🇳🇱' },
  { id: 'PPL', name: 'البرتغالي', flag: '🇵🇹' },
  { id: 'BSA', name: 'البرازيلي', flag: '🇧🇷' },
  { id: 'CLI', name: 'ليبرتادوريس', flag: '🌎' },
];

export default function MatchesWidget() {
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTodayMatches, setIsTodayMatches] = useState(true);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const loadMatches = (silent = false) => {
      if (!silent) setLoading(true);
      // 1. First attempt: fetch today's matches for selected league
      getMatchesWithResult(todayStr, undefined, selectedLeague, '2026')
        .then((todayRes) => {
          if (todayRes.matches && todayRes.matches.length > 0) {
            setMatches(todayRes.matches.slice(0, 6)); // Display today's matches
            setIsTodayMatches(true);
          } else {
            // 2. Fallback: fetch general season matches if today has no scheduled matches
            return getMatchesWithResult(undefined, undefined, selectedLeague, '2026').then((genRes) => {
              setMatches((genRes.matches || []).slice(0, 6));
              setIsTodayMatches(false);
            });
          }
        })
        .catch((err) => {
          console.warn("[MatchesWidget] Error fetching matches:", err);
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    };

    loadMatches(false);

    // Auto-refresh every 20 seconds
    const interval = setInterval(() => {
      loadMatches(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [selectedLeague]);

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-gray-800/50 p-5 sm:p-6 mb-8 shadow-lg min-h-[200px] flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <span className="text-xs font-bold text-gray-500">جاري تحميل جدول المباريات...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-gray-800/50 p-5 sm:p-6 mb-8 shadow-lg text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-gray-900 dark:text-white">
            <Calendar className="w-6 h-6 text-brand" />
            مباريات اليوم
          </h2>
          <Link to="/matches" className="text-sm text-brand font-semibold hover:underline flex items-center">
            جدول المباريات الكامل
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-gray-500 font-medium py-4 text-sm">لا توجد مباريات جارية أو مجدولة لهذا اليوم.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-gray-800/50 p-3 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base sm:text-xl font-extrabold flex items-center gap-1.5 sm:gap-2 text-gray-900 dark:text-white">
            <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-brand" />
            {isTodayMatches ? 'مباريات اليوم' : 'أهم المباريات القادمة'}
          </h2>
          {isTodayMatches ? (
            <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              تغطية حية
            </span>
          ) : (
            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              أبرز المواجهات
            </span>
          )}
        </div>
        
        <Link to="/matches" className="text-xs sm:text-sm text-brand font-extrabold hover:underline flex items-center gap-0.5 self-end sm:self-auto">
          عرض الجدول الكامل
          <ChevronLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* League Selection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3.5 sm:mb-5 no-scrollbar border-b border-gray-100 dark:border-gray-800 -mx-1 px-1 sm:mx-0 sm:px-0">
        {LEAGUE_TABS.map((tab) => {
          const isActive = selectedLeague === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedLeague(tab.id)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${
                isActive
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{tab.flag}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {matches.map((match, i) => (
          <MatchCard key={`${match.id}-${i}`} match={match} index={i} />
        ))}
      </div>
    </div>
  );
}

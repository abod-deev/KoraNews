import { useState, useEffect } from 'react';
import { getMatchesWithResult, Match } from '../../services/sportsApi';
import { Calendar, ChevronLeft, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const loadMatches = (silent = false) => {
      if (!silent) setLoading(true);
      setHasError(false);
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
          setHasError(true);
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-6 shadow-xs select-none">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <Calendar className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-none">
              {isTodayMatches ? 'مباريات اليوم' : 'أهم المباريات القادمة'}
            </h2>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">موسم 2026 / 2027</p>
          </div>

          {isTodayMatches ? (
            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
              <span>تغطية حية</span>
            </span>
          ) : (
            <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full border border-sky-500/20 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3 h-3" />
              <span>أبرز المواجهات</span>
            </span>
          )}
        </div>
        
        <Link 
          to="/matches" 
          className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 font-black flex items-center gap-0.5 self-end sm:self-auto group px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span>جدول المباريات الكامل</span>
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        </Link>
      </div>

      {/* League Selection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar border-b border-slate-100 dark:border-slate-800/80 -mx-1 px-1 sm:mx-0 sm:px-0">
        {LEAGUE_TABS.map((tab) => {
          const isActive = selectedLeague === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedLeague(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs scale-105'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-sm leading-none">{tab.flag}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content States */}
      {loading ? (
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-2 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            جاري جلب تحديثات المباريات المباشرة...
          </span>
        </div>
      ) : hasError ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 text-center text-rose-600 dark:text-rose-400 text-xs font-extrabold my-2">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
          <p className="mb-2">تعذر جلب بيانات المباريات حالياً.</p>
          <button
            onClick={() => setSelectedLeague(selectedLeague)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-extrabold text-xs">
            لا توجد مباريات جارية أو مجدولة لهذا التحديد اليوم.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {matches.map((match, i) => (
            <MatchCard key={`${match.id}-${i}`} match={match} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Trophy, Target, ChevronLeft, Sparkles, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getArabicTeamName } from '../../utils/teamTranslations';

export default function PredictionsWidget() {
  const [openMatches, setOpenMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/predictions')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter open prediction matches
          const open = data.filter((pm: any) => pm.isOpenForPrediction || pm.matchState === 'open');
          setOpenMatches(open.slice(0, 3));
        }
      })
      .catch((err) => console.error('[PredictionsWidget] fetch error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-amber-500/30 shadow-md relative overflow-hidden select-none">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
              <span>مسابقة توقعات KoraNews</span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-500/40">
                مفتوحة الآن
              </span>
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              توقع نتائج المباريات واكسب النقاط وتصدر جدول الترتيب!
            </p>
          </div>
        </div>

        <Link
          to="/predictions"
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <span>جدول التوقعات والترتيب</span>
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* Content: Open Matches */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : openMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
          {openMatches.map((pm) => {
            const m = pm.match || {};
            const league = pm.leagueName || m.leagueName || 'مباراة قمة';
            const homeName = m.homeTeam?.name || pm.homeTeamName || 'الفريق الأول';
            const homeLogo = m.homeTeam?.logo || pm.homeTeamLogo;
            const awayName = m.awayTeam?.name || pm.awayTeamName || 'الفريق الثاني';
            const awayLogo = m.awayTeam?.logo || pm.awayTeamLogo;
            const pts = pm.pointsPerMatch || 2;

            return (
              <div
                key={pm.id}
                className="bg-slate-800/80 hover:bg-slate-800 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/80 flex flex-col justify-between gap-3 transition-all group"
              >
                <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold border-b border-slate-700/60 pb-2">
                  <span className="truncate max-w-[110px]">{league}</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Target className="w-3 h-3 text-amber-400" />
                    <span>{pts === 1 ? '⭐ 1 نقطة' : `⭐ ${pts} نقاط`}</span>
                  </span>
                </div>

                {/* Teams Display */}
                <div className="flex items-center justify-around my-1">
                  <div className="flex flex-col items-center gap-1 text-center w-5/12">
                    <div className="w-9 h-9 rounded-full bg-slate-900 p-1.5 border border-slate-700 flex items-center justify-center">
                      <img
                        loading="lazy"
                        src={homeLogo}
                        alt={homeName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-100 truncate w-full">
                      {getArabicTeamName(homeName)}
                    </span>
                  </div>

                  <span className="text-xs font-black text-amber-400">VS</span>

                  <div className="flex flex-col items-center gap-1 text-center w-5/12">
                    <div className="w-9 h-9 rounded-full bg-slate-900 p-1.5 border border-slate-700 flex items-center justify-center">
                      <img
                        loading="lazy"
                        src={awayLogo}
                        alt={awayName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-100 truncate w-full">
                      {getArabicTeamName(awayName)}
                    </span>
                  </div>
                </div>

                <Link
                  to="/predictions"
                  className="w-full text-center bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-extrabold text-xs py-1.5 rounded-xl border border-amber-500/30 transition-colors"
                >
                  توقع النتيجة الآن
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        /* Call To Action Banner when no open matches right now */
        <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/60 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-right">
            <Sparkles className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-200">
                انضم الآن لمسابقة توقعات KoraNews وتحدّ أصدقاءك في معرفة نتائج المباريات القادمة!
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                نقاط إضافية للمتوقع الصحيح وترتيب أسبوعي لأفضل المتوقعين.
              </p>
            </div>
          </div>
          <Link
            to="/predictions"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shrink-0"
          >
            صفحة التوقعات والترتيب
          </Link>
        </div>
      )}
    </div>
  );
}

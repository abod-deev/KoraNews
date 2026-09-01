import React, { useState } from 'react';
import { Standing } from '../../services/sportsApi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Trophy, ShieldCheck, Flame } from 'lucide-react';
import { getArabicTeamName } from '../../utils/teamTranslations';

interface TeamStatsChartProps {
  standings: Standing[];
}

export default function TeamStatsChart({ standings }: TeamStatsChartProps) {
  const [teamCount, setTeamCount] = useState<number>(10);
  const [chartMode, setChartMode] = useState<'results' | 'goals' | 'winrate'>('results');

  if (!standings || standings.length === 0) {
    return null;
  }

  // Slice standings by selected teamCount
  const displayData = standings.slice(0, teamCount).map((item) => {
    const winRate = item.played > 0 ? Math.round((item.won / item.played) * 100) : 0;
    const arabicName = getArabicTeamName(item.team.name);
    return {
      name: arabicName,
      shortName: arabicName.length > 12 ? arabicName.substring(0, 10) + '..' : arabicName,
      logo: item.team.logo,
      rank: item.rank,
      played: item.played,
      won: item.won,
      drawn: item.drawn,
      lost: item.lost,
      goalsFor: item.goalsFor,
      goalsAgainst: item.goalsAgainst,
      goalDifference: item.goalDifference,
      points: item.points,
      winRate: winRate,
    };
  });

  // Insights calculation
  const topAttacking = [...standings].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const topDefensive = [...standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const highestWinRate = [...standings].sort((a, b) => (b.played > 0 ? b.won / b.played : 0) - (a.played > 0 ? a.won / a.played : 0))[0];

  // Colors
  const COLOR_WIN = '#10B981';   // Green
  const COLOR_DRAW = '#F59E0B';  // Amber
  const COLOR_LOSS = '#EF4444';  // Red
  const COLOR_GF = '#3B82F6';    // Blue
  const COLOR_GA = '#F43F5E';    // Rose

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl border border-gray-700 text-right text-xs space-y-1.5 min-w-[160px]">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-1.5 font-bold text-sm">
            {data.logo && <img loading="lazy" src={data.logo} alt={label} className="w-5 h-5 object-contain" />}
            <span>#{data.rank} - {label}</span>
          </div>
          {chartMode === 'results' && (
            <>
              <div className="flex justify-between text-emerald-400">
                <span>فوز:</span>
                <span className="font-bold">{data.won} مباراة</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>تعادل:</span>
                <span className="font-bold">{data.drawn} مباراة</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>خسارة:</span>
                <span className="font-bold">{data.lost} مباراة</span>
              </div>
              <div className="flex justify-between text-gray-300 border-t border-gray-800 pt-1">
                <span>إجمالي النقاط:</span>
                <span className="font-black text-brand-400 text-sm">{data.points}</span>
              </div>
            </>
          )}

          {chartMode === 'goals' && (
            <>
              <div className="flex justify-between text-blue-400">
                <span>أهداف له:</span>
                <span className="font-bold">{data.goalsFor}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>أهداف عليه:</span>
                <span className="font-bold">{data.goalsAgainst}</span>
              </div>
              <div className="flex justify-between text-emerald-400 border-t border-gray-800 pt-1">
                <span>فارق الأهداف:</span>
                <span className="font-bold" dir="ltr">{data.goalDifference > 0 ? `+${data.goalDifference}` : data.goalDifference}</span>
              </div>
            </>
          )}

          {chartMode === 'winrate' && (
            <>
              <div className="flex justify-between text-emerald-400">
                <span>نسبة الفوز:</span>
                <span className="font-bold text-sm">{data.winRate}%</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>النقاط:</span>
                <span className="font-bold">{data.points} نقطة</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>المباريات:</span>
                <span className="font-bold">{data.played}</span>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">إحصائيات الفرق التنافسية</h3>
            <p className="text-xs text-gray-500 font-medium">تحليل سريعي لنتائج الفوز، التعادل، الخسارة والأهداف</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex items-center text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setChartMode('results')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${chartMode === 'results' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              النتائج
            </button>
            <button
              onClick={() => setChartMode('goals')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${chartMode === 'goals' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              الأهداف
            </button>
            <button
              onClick={() => setChartMode('winrate')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${chartMode === 'winrate' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              نسبة الفوز %
            </button>
          </div>

          {/* Count Selector */}
          <select
            value={teamCount}
            onChange={(e) => setTeamCount(Number(e.target.value))}
            className="bg-gray-100 dark:bg-gray-800 border-0 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <option value={5}>أفضل 5 فرق</option>
            <option value={10}>أفضل 10 فرق</option>
            <option value={standings.length}>جميع الفرق ({standings.length})</option>
          </select>
        </div>
      </div>

      {/* Top Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topAttacking && (
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">أقوى هجوم</span>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>{topAttacking.team.name}</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-black">({topAttacking.goalsFor} هدف)</span>
              </div>
            </div>
          </div>
        )}

        {topDefensive && (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">أقوى دفاع</span>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>{topDefensive.team.name}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-black">({topDefensive.goalsAgainst} عليه)</span>
              </div>
            </div>
          </div>
        )}

        {highestWinRate && (
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">أعلى نسبة فوز</span>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>{highestWinRate.team.name}</span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-black">
                  ({highestWinRate.played > 0 ? Math.round((highestWinRate.won / highestWinRate.played) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Display Area */}
      <div className="h-[340px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'results' ? (
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="shortName"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {value === 'won' ? 'فوز' : value === 'drawn' ? 'تعادل' : 'خسارة'}
                  </span>
                )}
              />
              <Bar dataKey="won" name="won" stackId="a" fill={COLOR_WIN} radius={[0, 0, 4, 4]} />
              <Bar dataKey="drawn" name="drawn" stackId="a" fill={COLOR_DRAW} />
              <Bar dataKey="lost" name="lost" stackId="a" fill={COLOR_LOSS} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartMode === 'goals' ? (
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="shortName"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {value === 'goalsFor' ? 'أهداف له' : 'أهداف عليه'}
                  </span>
                )}
              />
              <Bar dataKey="goalsFor" name="goalsFor" fill={COLOR_GF} radius={[4, 4, 0, 0]} />
              <Bar dataKey="goalsAgainst" name="goalsAgainst" fill={COLOR_GA} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="shortName"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis
                yAxisId="left"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="%"
                domain={[0, 100]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {value === 'winRate' ? 'نسبة الفوز (%)' : 'إجمالي النقاط'}
                  </span>
                )}
              />
              <Bar yAxisId="left" dataKey="winRate" name="winRate" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="points" name="points" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

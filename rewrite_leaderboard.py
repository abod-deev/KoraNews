import re

with open('src/components/predictions/PredictionsLeaderboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the return statement
idx1 = content.find('return (')
if idx1 != -1:
    idx2 = content.rfind(');') + 2
    
    new_ui = """return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث عن متسابق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand shadow-sm transition-all"
          />
        </div>
        {currentUserRank > 0 && !searchQuery && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>ترتيبك الحالي:</span>
            <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-lg font-black text-sm">
              #{currentUserRank}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <p className="mt-4 text-xs font-bold text-slate-500">جاري تحميل لوحة الشرف...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <div className="text-sm text-slate-500 font-bold">
            {searchQuery ? 'لا يوجد متسابق يطابق بحثك.' : 'لا يوجد مشاركون حتى الآن. كن أول من يتوقع!'}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium (Only show if not searching to maintain context) */}
          {!searchQuery && filtered.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-8 pb-4">
              {/* Second Place */}
              {filtered.find(u => u.rank === 2) && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 p-1 rounded-full overflow-hidden border-4 border-slate-300 dark:border-slate-600 shadow-lg">
                      {filtered.find(u => u.rank === 2)?.avatar ? (
                        <img loading="lazy" src={filtered.find(u => u.rank === 2)?.avatar} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xl">
                          {filtered.find(u => u.rank === 2)?.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-3 -right-2 bg-slate-400 text-white w-7 h-7 rounded-full flex items-center justify-center font-black border-2 border-white dark:border-slate-900 shadow-sm">2</div>
                  </div>
                  <div className="text-center">
                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">{filtered.find(u => u.rank === 2)?.name}</div>
                    <div className="font-black text-brand text-xs sm:text-sm mt-0.5">{filtered.find(u => u.rank === 2)?.totalPoints} <span className="text-[10px] text-slate-400">نقطة</span></div>
                  </div>
                </div>
              )}

              {/* First Place */}
              {filtered.find(u => u.rank === 1) && (
                <div className="flex flex-col items-center -translate-y-6">
                  <div className="relative mb-3">
                    <Crown className="w-6 h-6 text-amber-500 absolute -top-7 left-1/2 -translate-x-1/2 drop-shadow-sm" />
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-amber-200 p-1.5 rounded-full overflow-hidden border-4 border-amber-400 dark:border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                      {filtered.find(u => u.rank === 1)?.avatar ? (
                        <img loading="lazy" src={filtered.find(u => u.rank === 1)?.avatar} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-amber-50 flex items-center justify-center font-black text-amber-500 text-3xl">
                          {filtered.find(u => u.rank === 1)?.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-3 -right-2 bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 border-white dark:border-slate-900 shadow-sm">1</div>
                  </div>
                  <div className="text-center">
                    <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">{filtered.find(u => u.rank === 1)?.name}</div>
                    <div className="font-black text-amber-600 dark:text-amber-500 text-sm sm:text-lg mt-0.5">{filtered.find(u => u.rank === 1)?.totalPoints} <span className="text-[10px] sm:text-xs text-slate-400">نقطة</span></div>
                  </div>
                </div>
              )}

              {/* Third Place */}
              {filtered.find(u => u.rank === 3) && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-700/30 p-1 rounded-full overflow-hidden border-4 border-amber-700/50 shadow-lg">
                      {filtered.find(u => u.rank === 3)?.avatar ? (
                        <img loading="lazy" src={filtered.find(u => u.rank === 3)?.avatar} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-amber-900/10 flex items-center justify-center font-black text-amber-800/50 text-xl">
                          {filtered.find(u => u.rank === 3)?.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-3 -right-2 bg-amber-700/80 text-white w-7 h-7 rounded-full flex items-center justify-center font-black border-2 border-white dark:border-slate-900 shadow-sm">3</div>
                  </div>
                  <div className="text-center">
                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">{filtered.find(u => u.rank === 3)?.name}</div>
                    <div className="font-black text-brand text-xs sm:text-sm mt-0.5">{filtered.find(u => u.rank === 3)?.totalPoints} <span className="text-[10px] text-slate-400">نقطة</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List View */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-4 px-6 w-20">الترتيب</th>
                    <th className="py-4 px-6">المتسابق</th>
                    <th className="py-4 px-6 text-center">التوقعات الصحيحة</th>
                    <th className="py-4 px-6 text-center">الذهبية</th>
                    <th className="py-4 px-6 text-center">الدقة</th>
                    <th className="py-4 px-6 text-left">النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isCurrentUser
                          ? 'bg-brand/5'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-4 px-6 font-black text-slate-500 dark:text-slate-400">
                        {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                            {item.avatar ? (
                              <img loading="lazy" src={item.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {item.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className={`font-black truncate ${item.isCurrentUser ? 'text-brand' : 'text-slate-900 dark:text-white'}`}>
                            {item.name}
                          </span>
                          {item.isCurrentUser && (
                            <span className="px-2 py-0.5 rounded border border-brand/20 bg-brand/10 text-brand text-[10px] font-black shrink-0">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-600 dark:text-slate-300">
                        {item.correctPredictions}
                      </td>
                      <td className="py-4 px-6 text-center font-black text-amber-600 dark:text-amber-400">
                        {item.goldenPredictions > 0 ? (
                           <span className="flex items-center justify-center gap-1"><Crown className="w-3.5 h-3.5" /> {item.goldenPredictions}</span>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-500">
                        {item.successRate}%
                      </td>
                      <td className="py-4 px-6 text-left font-black text-sm text-slate-900 dark:text-white">
                        {item.totalPoints} <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col gap-3 transition-colors ${
                    item.isCurrentUser
                      ? 'bg-brand/5 border-l-4 border-brand'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-black text-slate-400 text-sm w-5 shrink-0 text-center">
                         {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                      </span>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                        {item.avatar ? (
                          <img loading="lazy" src={item.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-sm font-black text-slate-500">
                            {item.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                           <span className={`font-black text-sm truncate ${item.isCurrentUser ? 'text-brand' : 'text-slate-900 dark:text-white'}`}>
                             {item.name}
                           </span>
                           {item.isCurrentUser && (
                             <span className="px-1.5 py-0.5 rounded bg-brand text-white text-[9px] font-black shrink-0">أنت</span>
                           )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">دقة {item.successRate}%</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-left">
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {item.totalPoints}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-1">نقطة</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 ml-8 pl-6 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                    <span>صحيحة: <span className="text-slate-700 dark:text-slate-300 font-black">{item.correctPredictions}</span></span>
                    {item.goldenPredictions > 0 && (
                       <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" /> ذهبية: {item.goldenPredictions}
                       </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
"""
    content = content[:idx1] + new_ui

with open('src/components/predictions/PredictionsLeaderboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

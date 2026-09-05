import re

with open('src/pages/GoldenLeaderboardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace JSX
idx1 = content.find('return (')
if idx1 != -1:
    idx2 = content.rfind(');') + 2
    
    new_ui = """return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 font-sans pb-16">
      <Helmet>
        <title>الترتيب الذهبي | KoraNews</title>
        <meta name="description" content="لوحة شرف الترتيب الذهبي لمسابقة التوقعات" />
      </Helmet>

      {/* Hero Header */}
      <div className="bg-slate-900 text-white pt-10 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-[100px]" />
           <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-400/10 rounded-full blur-[80px]" />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_30px_rgba(251,191,36,0.3)] mb-6">
            <Crown className="w-8 h-8 text-white drop-shadow-sm" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight">
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">الترتيب الذهبي</span>
          </h1>
          <p className="text-slate-300 font-medium max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            لوحة شرف مخصصة لأصحاب التوقعات الذهبية. المتسابقون الذين ينفردون بتوقع النتيجة الصحيحة لمباراة ما يحصلون على تاج التوقع الذهبي ونقاط مضاعفة.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl sm:rounded-full shadow-lg border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link to="/predictions/leaderboard" className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl sm:rounded-full font-bold text-xs sm:text-sm transition-colors w-full sm:w-auto">
              <ChevronRight className="w-4 h-4" />
              <span>الترتيب العام</span>
            </Link>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث عن بطل ذهبي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            <p className="mt-4 text-sm font-bold text-slate-500">جاري تحميل السجل الذهبي...</p>
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Crown className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 mb-2">
              {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد توقعات ذهبية مسجلة بعد'}
            </h3>
            <p className="text-xs text-slate-500 font-bold max-w-sm">
              {searchQuery ? 'جرب البحث باسم آخر.' : 'كن أول من ينفرد بتوقع دقيق لمباراة قادمة لاكتمال سجل التوقعات الذهبية والحصول على التاج!'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top 3 Podium */}
            {!searchQuery && filteredLeaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-8 pb-4">
                {/* Second Place */}
                {filteredLeaderboard.find(u => u.rank === 2) && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 p-1 overflow-hidden border-4 border-slate-300 dark:border-slate-600 shadow-lg">
                        {filteredLeaderboard.find(u => u.rank === 2)?.avatar ? (
                          <img loading="lazy" src={filteredLeaderboard.find(u => u.rank === 2)?.avatar} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xl">
                            {filteredLeaderboard.find(u => u.rank === 2)?.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-3 -right-2 bg-slate-400 text-white w-7 h-7 rounded-full flex items-center justify-center font-black border-2 border-slate-50 dark:border-slate-950 shadow-sm">2</div>
                    </div>
                    <div className="text-center">
                      <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">{filteredLeaderboard.find(u => u.rank === 2)?.name}</div>
                      <div className="font-black text-amber-500 text-xs sm:text-sm mt-0.5 flex items-center justify-center gap-1"><Crown className="w-3 h-3"/> {filteredLeaderboard.find(u => u.rank === 2)?.goldenPredictions}</div>
                    </div>
                  </div>
                )}

                {/* First Place */}
                {filteredLeaderboard.find(u => u.rank === 1) && (
                  <div className="flex flex-col items-center -translate-y-6 relative z-10">
                    <div className="relative mb-3">
                      <Crown className="w-8 h-8 text-amber-500 absolute -top-9 left-1/2 -translate-x-1/2 drop-shadow-md" />
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-amber-200 p-1.5 overflow-hidden border-4 border-amber-400 dark:border-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                        {filteredLeaderboard.find(u => u.rank === 1)?.avatar ? (
                          <img loading="lazy" src={filteredLeaderboard.find(u => u.rank === 1)?.avatar} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-amber-50 flex items-center justify-center font-black text-amber-500 text-3xl">
                            {filteredLeaderboard.find(u => u.rank === 1)?.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-3 -right-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 border-slate-50 dark:border-slate-950 shadow-sm">1</div>
                    </div>
                    <div className="text-center">
                      <div className="font-black text-sm sm:text-lg text-slate-900 dark:text-white line-clamp-1">{filteredLeaderboard.find(u => u.rank === 1)?.name}</div>
                      <div className="font-black text-amber-600 dark:text-amber-500 text-sm sm:text-base mt-0.5 flex items-center justify-center gap-1"><Crown className="w-4 h-4"/> {filteredLeaderboard.find(u => u.rank === 1)?.goldenPredictions} <span className="text-[10px] text-slate-500 font-bold">ذهبية</span></div>
                    </div>
                  </div>
                )}

                {/* Third Place */}
                {filteredLeaderboard.find(u => u.rank === 3) && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-900/30 p-1 overflow-hidden border-4 border-amber-700/50 shadow-lg">
                        {filteredLeaderboard.find(u => u.rank === 3)?.avatar ? (
                          <img loading="lazy" src={filteredLeaderboard.find(u => u.rank === 3)?.avatar} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-amber-900/10 flex items-center justify-center font-black text-amber-800/50 text-xl">
                            {filteredLeaderboard.find(u => u.rank === 3)?.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-3 -right-2 bg-amber-700/80 text-white w-7 h-7 rounded-full flex items-center justify-center font-black border-2 border-slate-50 dark:border-slate-950 shadow-sm">3</div>
                    </div>
                    <div className="text-center">
                      <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">{filteredLeaderboard.find(u => u.rank === 3)?.name}</div>
                      <div className="font-black text-amber-500 text-xs sm:text-sm mt-0.5 flex items-center justify-center gap-1"><Crown className="w-3 h-3"/> {filteredLeaderboard.find(u => u.rank === 3)?.goldenPredictions}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List View */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-4 px-6 w-20">الترتيب</th>
                      <th className="py-4 px-6">المتسابق</th>
                      <th className="py-4 px-6 text-center">التوقعات الذهبية</th>
                      <th className="py-4 px-6 text-center">النقاط الذهبية</th>
                      <th className="py-4 px-6 text-left">إجمالي النقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredLeaderboard.map((user) => (
                      <tr
                        key={user.id}
                        className={`transition-colors ${
                          user.isCurrentUser
                            ? 'bg-amber-500/5'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-4 px-6 font-black text-slate-500 dark:text-slate-400">
                          {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                              {user.avatar ? (
                                <img loading="lazy" src={user.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                  {user.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className={`font-black truncate ${user.isCurrentUser ? 'text-amber-600 dark:text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                              {user.name}
                            </span>
                            {user.isCurrentUser && (
                              <span className="px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black shrink-0">
                                أنت
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black">
                            <Crown className="w-4 h-4" />
                            {user.goldenPredictions}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-slate-600 dark:text-slate-300">
                          +{user.goldenPoints}
                        </td>
                        <td className="py-4 px-6 text-left font-black text-sm text-slate-900 dark:text-white">
                          {user.totalPoints} <span className="text-[10px] text-slate-400 font-normal">نقطة</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLeaderboard.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 flex flex-col gap-3 transition-colors ${
                      user.isCurrentUser
                        ? 'bg-amber-500/5 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-black text-slate-400 text-sm w-5 shrink-0 text-center">
                           {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                        </span>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                          {user.avatar ? (
                            <img loading="lazy" src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-sm font-black text-slate-500">
                              {user.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                             <span className={`font-black text-sm truncate ${user.isCurrentUser ? 'text-amber-600 dark:text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                               {user.name}
                             </span>
                             {user.isCurrentUser && (
                               <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black shrink-0">أنت</span>
                             )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 mt-0.5">نقاط الترتيب: {user.totalPoints}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <span className="inline-flex items-center justify-center gap-1 w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-black text-lg border border-amber-200 dark:border-amber-800/50 shadow-sm">
                          {user.goldenPredictions}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
"""
    content = content[:idx1] + new_ui

with open('src/pages/GoldenLeaderboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

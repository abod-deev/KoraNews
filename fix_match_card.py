import re

with open('src/components/predictions/PredictionMatchCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to redesign the JSX return statement.
# Find the start of the return statement
idx1 = content.find('return (')
if idx1 != -1:
    idx2 = content.rfind(');') + 2
    
    new_ui = """return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 ${
        isCalculated && userPred?.pointsEarned && userPred.pointsEarned > 0
          ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
          : isLive
          ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
          : 'border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand/30'
      }`}
    >
      {/* Top Banner indicating status */}
      <div className={`px-4 py-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wider ${
        isCalculated ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-500' :
        isLive ? 'bg-rose-500 text-white' :
        isOpen ? 'bg-brand text-white' :
        'bg-slate-100 dark:bg-slate-800 text-slate-500'
      }`}>
        <div className="flex items-center gap-1.5">
          {isCalculated ? <CheckCircle2 className="w-3.5 h-3.5" /> :
           isLive ? <Radio className="w-3.5 h-3.5 animate-pulse" /> :
           isOpen ? <Unlock className="w-3.5 h-3.5" /> :
           <Lock className="w-3.5 h-3.5" />}
           
          <span>
            {isCalculated ? 'انتهت وحُسبت النقاط' :
             isFinished ? 'انتهت (بانتظار النتيجة)' :
             isLive ? 'جارية الآن' :
             isOpen ? 'متاحة للتوقع' :
             'مغلقة'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {match.league && (
            <span className="flex items-center gap-1 opacity-90">
              <Trophy className="w-3.5 h-3.5" />
              {match.league}
            </span>
          )}
          <span className="opacity-75">•</span>
          <span className="opacity-90">{formattedDate}</span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Teams and Score/Prediction Area */}
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 relative flex items-center justify-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              {match.homeTeamLogo ? (
                <img loading="lazy" src={match.homeTeamLogo} alt={match.homeTeam} className="max-w-full max-h-full object-contain" />
              ) : (
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              {match.homeTeam}
            </span>
          </div>

          {/* Center Area: Score or Inputs */}
          <div className="flex-[1.2] flex flex-col items-center justify-center">
            {(isCalculated || isFinished || isLive) ? (
              <div className="flex flex-col items-center gap-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">النتيجة الرسمية</div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center bg-slate-900 dark:bg-black rounded-xl border-b-4 border-slate-800 text-2xl sm:text-3xl font-black text-white font-mono shadow-inner">
                    {match.homeScore ?? '-'}
                  </div>
                  <span className="text-lg font-bold text-slate-300">:</span>
                  <div className="w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center bg-slate-900 dark:bg-black rounded-xl border-b-4 border-slate-800 text-2xl sm:text-3xl font-black text-white font-mono shadow-inner">
                    {match.awayScore ?? '-'}
                  </div>
                </div>
              </div>
            ) : isOpen && isLoggedIn && isApprovedParticipant ? (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={homeScore}
                    onChange={(e) => handleScoreChange('home', e.target.value)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black font-mono bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-slate-900 dark:text-white"
                  />
                  <span className="text-lg font-bold text-slate-400">-</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={awayScore}
                    onChange={(e) => handleScoreChange('away', e.target.value)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black font-mono bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                 <div className="text-3xl font-black text-slate-300 dark:text-slate-700">VS</div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 relative flex items-center justify-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              {match.awayTeamLogo ? (
                <img loading="lazy" src={match.awayTeamLogo} alt={match.awayTeam} className="max-w-full max-h-full object-contain" />
              ) : (
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              {match.awayTeam}
            </span>
          </div>
        </div>

        {/* Actions & Status Area */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
          
          {/* Active input state */}
          {isOpen && isLoggedIn && isApprovedParticipant && (
            <div className="flex items-center justify-between gap-4">
              {userPred && (
                <div className="text-[11px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  تم الحفظ
                </div>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || homeScore === '' || awayScore === ''}
                className={`ml-auto px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm ${
                  isSaving || homeScore === '' || awayScore === ''
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-brand text-white hover:bg-emerald-600 hover:shadow-brand/20 hover:-translate-y-0.5'
                }`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {userPred ? 'تحديث التوقع' : 'تأكيد التوقع'}
              </button>
            </div>
          )}

          {/* Not logged in or not participant */}
          {isOpen && (!isLoggedIn || !isApprovedParticipant) && (
             <div className="flex justify-center">
                <button
                  type="button"
                  onClick={!isLoggedIn ? onRequestLogin : onRequestRegister}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  {!isLoggedIn ? 'سجل الدخول للتوقع' : 
                   userParticipationStatus === 'pending' ? 'طلبك قيد المراجعة' :
                   userParticipationStatus === 'rejected' ? 'عذراً، طلبك مرفوض' :
                   userParticipationStatus === 'blocked' ? 'حسابك محظور' :
                   'طلب الاشتراك للتوقع'}
                </button>
             </div>
          )}

          {/* Closed State Info */}
          {!isOpen && (
            <div className="space-y-3">
              {/* User Prediction Summary */}
              {userPred ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-500">توقعك:</span>
                    <div className="font-mono text-lg font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-3 py-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                      {userPred.homeScore} - {userPred.awayScore}
                    </div>
                  </div>
                  
                  <div>
                    {isCalculated ? (
                      userPred.isGolden ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800/50">
                          <Crown className="w-4 h-4" />
                          <span className="text-xs font-black">توقع ذهبي (+{userPred.pointsEarned})</span>
                        </div>
                      ) : userPred.pointsEarned > 0 ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-black">صحيح (+{userPred.pointsEarned})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-xl">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs font-black">خاطئ (0)</span>
                        </div>
                      )
                    ) : isPendingAdmin ? (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> بانتظار النتيجة
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">التوقع مغلق</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  {isCalculated ? 'لم تشارك بتوقع لهذه المباراة.' : 'أغلقت التوقعات.'}
                </div>
              )}

              {/* Extras: Winners & Share */}
              <div className="flex items-center justify-between pt-1">
                {isCalculated && predictionMatch.correctPredictorsCount !== undefined ? (
                  <button
                    onClick={() => setShowWinnersList(!showWinnersList)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-black text-brand hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    أصحاب التوقع الصحيح ({predictionMatch.correctPredictorsCount})
                    {showWinnersList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                ) : <div />}

                {(isCalculated || isFinished || isLive) && (
                  <button
                    onClick={handleShareResult}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition-colors"
                  >
                    {copiedShare ? (
                      <><Check className="w-3 h-3 text-emerald-500" /> تم النسخ</>
                    ) : (
                      <><Share2 className="w-3 h-3" /> مشاركة</>
                    )}
                  </button>
                )}
              </div>

              {/* Winners List Expandable */}
              <AnimatePresence>
                {showWinnersList && isCalculated && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                      {predictionMatch.correctPredictors && predictionMatch.correctPredictors.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {predictionMatch.correctPredictors.map(winner => (
                            <div key={winner.id} className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                              {winner.isGolden && <Crown className="w-3 h-3 text-amber-500" />}
                              <span>{winner.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-center text-slate-500 font-bold">لا يوجد متسابقين توقعوا النتيجة بدقة.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
"""
    content = content[:idx1] + new_ui

with open('src/components/predictions/PredictionMatchCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

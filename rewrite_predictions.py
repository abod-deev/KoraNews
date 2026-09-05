import re

with open('src/pages/Predictions.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's replace the User Stats Dashboard with a cleaner, more premium design
idx1 = content.find('{/* 3. Approved User Stats Dashboard */}')
if idx1 != -1:
    idx1 = content.find('{user && isParticipant && stats && (', idx1)
    
    # find the end of this block
    # It ends before {/* Tabs Navigation */}
    idx2 = content.find('{/* Tabs Navigation */}', idx1)
    
    new_stats_ui = """{user && isParticipant && stats && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">إحصائياتك الشخصية</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-100 dark:divide-slate-800/60">
              {/* 1. Total Points */}
              <div className="p-5 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs mb-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>إجمالي النقاط</span>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {stats.totalPoints}
                </div>
              </div>
              
              {/* 2. Total Predictions */}
              <div className="p-5 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span>توقعاتك</span>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {stats.totalPredictions}
                </div>
              </div>

              {/* 3. Correct Predictions */}
              <div className="p-5 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>توقعات صحيحة</span>
                </div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  {stats.correctPredictions}
                </div>
              </div>

              {/* 4. Golden Predictions */}
              <div className="p-5 flex flex-col justify-center bg-amber-50/30 dark:bg-amber-950/10">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs mb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>توقعات ذهبية</span>
                </div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                  {stats.goldenPredictions}
                </div>
              </div>

              {/* 5. Golden Points */}
              <div className="p-5 flex flex-col justify-center bg-amber-50/30 dark:bg-amber-950/10">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs mb-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>نقاط ذهبية</span>
                </div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                  {stats.goldenPoints}
                </div>
              </div>
            </div>
          </div>
        )}
        """
    
    # We need to make sure Activity icon is imported
    if 'Activity' not in content[:1000]:
        content = content.replace('import {', 'import {\n  Activity,', 1)
        
    content = content[:idx1] + new_stats_ui + content[idx2:]

with open('src/pages/Predictions.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

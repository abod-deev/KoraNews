import re

# 1. Fix PredictionMatchCard
with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    mc = f.read()
mc = mc.replace('import { Unlock, Lock,  PredictionMatchInfo }', 'import { PredictionMatchInfo }')
mc = mc.replace('import { Unlock, Clock,', 'import { Clock,')
mc = mc.replace('import { motion, AnimatePresence }', 'import { motion, AnimatePresence }') # clean
mc = re.sub(r'import\s*{\s*Unlock,\s*Lock,\s*PredictionMatchInfo', 'import { PredictionMatchInfo', mc)
mc = re.sub(r'import\s*{\s*Unlock,\s*Lock,\s*Clock', 'import { Clock', mc)
mc = re.sub(r'import\s*{\s*Unlock,\s*Lock,\s*motion', 'import { motion', mc)

if 'Shield,' not in mc:
    mc = mc.replace('from \'lucide-react\';', '  Shield,\n  Send,\n} from \'lucide-react\';')
if 'Send,' not in mc:
    pass

mc = mc.replace('const isCalculated =', 'const match = m;\n  const isPendingAdmin = m.status === "FINISHED" && predictionMatch.pointsPerMatch === undefined;\n  const isCalculated =')
mc = mc.replace('setIsSubmitting', 'setIsSaving')
mc = mc.replace('isSubmitting', 'isSaving')
mc = mc.replace('const [isSaving, setIsSaving] = useState(false);', 'const [isSaving, setIsSaving] = useState(false);')

# Fix string cast in onSavePrediction
mc = mc.replace('onSavePrediction(m.id, homeScore, awayScore);', 'onSavePrediction(m.id, homeScore as number, awayScore as number);')

with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
    f.write(mc)


# 2. Fix PredictionsLeaderboard
with open('src/components/predictions/PredictionsLeaderboard.tsx', 'r') as f:
    pl = f.read()

pl = pl.replace('currentUserRank > 0', '(currentUserRank?.rank || 0) > 0')
pl = pl.replace('{currentUserRank}', '{currentUserRank?.rank}')

if 'const filtered =' not in pl:
    pl = pl.replace('  return (', '  const filtered = leaderboard.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));\n  return (')

with open('src/components/predictions/PredictionsLeaderboard.tsx', 'w') as f:
    f.write(pl)


# 3. Fix GoldenLeaderboardPage
with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()

if 'ChevronRight' not in gl:
    gl = gl.replace('import {', 'import { ChevronRight, Loader2, ', 1)
gl = gl.replace('import { ChevronRight, Loader2, Loader2, ChevronRight', 'import { ChevronRight, Loader2')

with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)


# 4. Fix Predictions.tsx
with open('src/pages/Predictions.tsx', 'r') as f:
    pr = f.read()

pr = pr.replace('Activity,', '')

with open('src/pages/Predictions.tsx', 'w') as f:
    f.write(pr)


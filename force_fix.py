# Fix GoldenLeaderboard
with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()

gl = gl.replace('import {  Sparkles,', 'import { ChevronRight, Loader2, Sparkles,')

with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)

# Fix PredictionMatchCard
with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    mc = f.read()

mc = mc.replace('import { Clock, Unlock, Lock,  CheckCircle2,  Lock,', 'import { Clock, Unlock, Lock,  CheckCircle2,')

# Wait, if there's multiple Lock in lucide imports
import re
mc = re.sub(r'\bLock,\s*', '', mc)
mc = mc.replace('import { Clock, Unlock,', 'import { Clock, Unlock, Lock,')

mc = mc.replace('m.league?.name', 'm.leagueName')
mc = mc.replace('m.league?.logo', 'm.leagueLogo')
mc = mc.replace('m.league.name', 'm.leagueName')
mc = mc.replace('m.league.logo', 'm.leagueLogo')
mc = mc.replace('match.league?.name', 'm.leagueName')
mc = mc.replace('match.league?.logo', 'm.leagueLogo')
mc = mc.replace('match.league.name', 'm.leagueName')
mc = mc.replace('match.league.logo', 'm.leagueLogo')

with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
    f.write(mc)

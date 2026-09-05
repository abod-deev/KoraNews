with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    mc = f.read()
mc = mc.replace('match.league', 'm.leagueName')
mc = mc.replace('await onSavePrediction(m.id, homeScore as unknown as number, awayScore as unknown as number)', 'await onSavePrediction(Number(m.id), Number(homeScore), Number(awayScore))')

with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
    f.write(mc)

with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()
gl = gl.replace('import {  Sparkles,', 'import { ChevronRight, Loader2, Sparkles,')

with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)

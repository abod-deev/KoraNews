import re

# MatchCard
with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    mc = f.read()

mc = re.sub(r'm\.league\?\.name', 'm.leagueName', mc)
mc = re.sub(r'm\.league\?\.logo', 'm.leagueLogo', mc)
mc = re.sub(r'm\.league\.name', 'm.leagueName', mc)
mc = re.sub(r'm\.league\.logo', 'm.leagueLogo', mc)
mc = re.sub(r'match\.league\?\.name', 'm.leagueName', mc)
mc = re.sub(r'match\.league\?\.logo', 'm.leagueLogo', mc)
mc = re.sub(r'match\.league\.name', 'm.leagueName', mc)
mc = re.sub(r'match\.league\.logo', 'm.leagueLogo', mc)

mc = mc.replace('onSavePrediction(m.id, homeScore, awayScore)', 'onSavePrediction(m.id, homeScore as unknown as number, awayScore as unknown as number)')
mc = mc.replace('onSavePrediction(m.id, homeScore as number, awayScore as number)', 'onSavePrediction(m.id, homeScore as unknown as number, awayScore as unknown as number)')

with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
    f.write(mc)

# Golden Leaderboard
with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()

gl = gl.replace('import { ChevronLeft,', 'import { ChevronRight, Loader2, ChevronLeft,')
gl = gl.replace('import { ChevronRight, Loader2, Loader2,', 'import { ChevronRight, Loader2,')
gl = gl.replace('import { ChevronRight, Loader2, ChevronRight,', 'import { ChevronRight, Loader2,')

with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)

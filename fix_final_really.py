import re

with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    mc = f.read()

mc = re.sub(r'import\s*{\s*Clock,\s*Unlock,\s*Lock,\s*Unlock,\s*Lock,\s*Clock', 'import { Clock, Unlock, Lock', mc)
mc = re.sub(r'match\.league\?\.name', 'match.leagueName', mc)
mc = re.sub(r'match\.league\?\.logo', 'match.leagueLogo', mc)
mc = re.sub(r'match\.league\.name', 'match.leagueName', mc)
mc = re.sub(r'match\.league\.logo', 'match.leagueLogo', mc)

mc = re.sub(r'onSavePrediction\(m\.id, homeScore, awayScore\)', 'onSavePrediction(m.id, homeScore as unknown as number, awayScore as unknown as number)', mc)

with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
    f.write(mc)


with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()

gl = gl.replace('import { ChevronRight, Loader2,  useAuth }', 'import { useAuth }')
if 'import { ChevronRight, Loader2' not in gl:
    gl = gl.replace('import {  Sparkles,', 'import { ChevronRight, Loader2, Sparkles,')
    
with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)

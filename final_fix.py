import re

# Fix PredictionMatchCard
with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    text = f.read()

text = text.replace('import { Clock', 'import { Clock, Unlock, Lock')
text = text.replace('onSavePrediction(m.id, homeScore as number, awayScore as number)', 'onSavePrediction(m.id, homeScore as unknown as number, awayScore as unknown as number)')

# The errors might be from an old version of the card or I need to fix property names.
text = text.replace('match.league?.name', 'match.leagueName')
text = text.replace('match.league?.logo', 'match.leagueLogo')
text = text.replace('match.homeTeamLogo', 'match.homeTeam.logo')
text = text.replace('match.awayTeamLogo', 'match.awayTeam.logo')

with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
    f.write(text)

# Fix GoldenLeaderboardPage
with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()

gl = gl.replace('import { ChevronRight, Loader2', 'import { ChevronRight, Loader2, ')
if 'import { ChevronRight' not in gl:
    gl = gl.replace('import {', 'import { ChevronRight, Loader2, ', 1)

with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)


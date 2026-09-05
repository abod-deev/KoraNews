import re

# 1. MatchCard
with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    text = f.read()

# Fix duplicate Lock
text = text.replace('import { Clock, Unlock, Lock,  CheckCircle2,  Lock,', 'import { Clock, Unlock, Lock,  CheckCircle2,')

# Fix league properties (line 179, 182)
# We can just replace all `match.league?.name` or `m.league?.name` since `m` is `predictionMatch.match`. Wait, the error said property 'league' does not exist on type...
text = re.sub(r'\w+\.league\?\.name', 'm.leagueName', text)
text = re.sub(r'\w+\.league\?\.logo', 'm.leagueLogo', text)
text = re.sub(r'\w+\.league\.name', 'm.leagueName', text)
text = re.sub(r'\w+\.league\.logo', 'm.leagueLogo', text)

with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
    f.write(text)

# 2. GoldenLeaderboard
with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()

# Add ChevronRight and Loader2 to lucide-react imports if missing
if 'ChevronRight' not in gl and 'Loader2' not in gl:
    gl = gl.replace('import {  Sparkles,', 'import { ChevronRight, Loader2, Sparkles,')
elif 'ChevronRight' not in gl:
    gl = gl.replace('import {', 'import { ChevronRight,', 1)
elif 'Loader2' not in gl:
    gl = gl.replace('import {', 'import { Loader2,', 1)

with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)

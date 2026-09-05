import re
with open('src/pages/GoldenLeaderboardPage.tsx', 'r') as f:
    gl = f.read()

gl = re.sub(r'import\s*{\s*Sparkles,', 'import { ChevronRight, Loader2, Sparkles,', gl)

with open('src/pages/GoldenLeaderboardPage.tsx', 'w') as f:
    f.write(gl)

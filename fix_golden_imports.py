with open('src/pages/GoldenLeaderboardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove <Helmet> ... </Helmet>
import re
content = re.sub(r'<Helmet>.*?</Helmet>', '', content, flags=re.DOTALL)

# Add ChevronRight, Loader2 to imports if not there
if 'Loader2' not in content:
    content = content.replace('import {', 'import { Loader2, ChevronRight,', 1)
    
with open('src/pages/GoldenLeaderboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

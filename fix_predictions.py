import re
with open('src/pages/Predictions.tsx', 'r') as f:
    pr = f.read()

if 'Activity' not in pr.split('from \'lucide-react\'')[0]:
    pr = pr.replace('import { Trophy,', 'import { Activity, Trophy,')

with open('src/pages/Predictions.tsx', 'w') as f:
    f.write(pr)

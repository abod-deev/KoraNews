with open('src/pages/Predictions.tsx', 'r') as f:
    pr = f.read()

pr = pr.replace('import {  Trophy,', 'import { Activity, Trophy,')

with open('src/pages/Predictions.tsx', 'w') as f:
    f.write(pr)

with open('src/components/predictions/PredictionsLeaderboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { Loader2,  motion }', 'import { motion }')

with open('src/components/predictions/PredictionsLeaderboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

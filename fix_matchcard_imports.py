with open('src/components/predictions/PredictionMatchCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { Unlock, Lock,  PredictionMatchInfo }', 'import { PredictionMatchInfo }')
content = content.replace('import { Unlock, Lock,   Clock', 'import { Unlock, Clock')
content = content.replace('import { Unlock, Lock,  motion, AnimatePresence }', 'import { motion, AnimatePresence }')

with open('src/components/predictions/PredictionMatchCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

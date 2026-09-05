import re
with open('src/pages/Predictions.tsx', 'r') as f:
    text = f.read()

text = text.replace('{/* 3. Approved User Stats Dashboard {user && isParticipant && stats && (', '{/* 3. Approved User Stats Dashboard */}\n        {user && isParticipant && stats && (')

with open('src/pages/Predictions.tsx', 'w') as f:
    f.write(text)

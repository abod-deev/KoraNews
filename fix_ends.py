def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if not content.strip().endswith('}'):
        content = content.strip() + '\n}\n'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

fix_file('src/components/predictions/PredictionMatchCard.tsx')
fix_file('src/components/predictions/PredictionsLeaderboard.tsx')
fix_file('src/pages/GoldenLeaderboardPage.tsx')

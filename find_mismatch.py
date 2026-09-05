with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    print(f"{i+1}: ( {line.count('(')} ) {line.count(')')} | {{ {line.count('{')} }} {line.count('}')}")

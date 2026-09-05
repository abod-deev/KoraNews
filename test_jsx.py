with open('src/pages/Predictions.tsx', 'r') as f:
    text = f.read()

def count_tags(text):
    import re
    open_tags = re.findall(r'<([a-zA-Z0-9]+)[^>]*?(?<!/)>', text)
    close_tags = re.findall(r'</([a-zA-Z0-9]+)>', text)
    
    counts = {}
    for tag in open_tags:
        counts[tag] = counts.get(tag, 0) + 1
    for tag in close_tags:
        counts[tag] = counts.get(tag, 0) - 1
        
    for tag, count in counts.items():
        if count != 0:
            print(tag, count)

count_tags(text[text.find('return ('):])

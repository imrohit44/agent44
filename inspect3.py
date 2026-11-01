import sys
sys.path.insert(0, 'src')

with open('src/agent44/proxy.py') as f:
    lines = f.readlines()

print("=" * 80)
print("Lines 240-350 (provenance context):")
print("=" * 80)
for i in range(239, min(350, len(lines))):
    print(f"{i+1:4d}: {lines[i].rstrip()}")
import sys
sys.path.insert(0, 'src')

with open('src/agent44/proxy.py') as f:
    lines = f.readlines()

print("=" * 80)
print("Lines 420-700 (rest of call_tool):")
print("=" * 80)
for i in range(419, min(700, len(lines))):
    print(f"{i+1:4d}: {lines[i].rstrip()}")
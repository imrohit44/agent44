import sys
sys.path.insert(0, 'src')

with open('src/agent44/proxy.py') as f:
    lines = f.readlines()

# Print lines 170-420 (tool call handler)
print("=" * 80)
print("Tool call handler (lines 170-420):")
print("=" * 80)
for i in range(169, min(420, len(lines))):
    print(f"{i+1:4d}: {lines[i].rstrip()}")
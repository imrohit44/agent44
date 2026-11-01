import sys
sys.path.insert(0, 'src')

with open('src/agent44/proxy.py') as f:
    lines = f.readlines()

print("=" * 80)
print("Lines 490-640 (forwarding and transfer export):")
print("=" * 80)
for i in range(489, min(640, len(lines))):
    print(f"{i+1:4d}: {lines[i].rstrip()}")
#!/usr/bin/env python3
"""Fix asyncio.run wrapping for evaluate calls in test file."""
with open('d:\\Agent44\\test_eval_runner.py', 'r') as f:
    lines = f.readlines()

# Find lines with 'asyncio.run(evaluate(' and ensure the next line has '))'
# Instead of just ')'
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    if 'asyncio.run(evaluate(' in line:
        # This line starts an evaluate call with asyncio.run
        # Check if the next line has ')' that needs to become '))'
        if i + 1 < len(lines) and 'adapter_deadline=5.0,' in lines[i+1]:
            # The next line has adapter_deadline=5.0, and likely ends with )
            # We need to check if it ends with ) or ))
            next_line = lines[i+1]
            if next_line.rstrip().endswith(')') and not next_line.rstrip().endswith('))'):
                # Replace trailing ) with ))
                lines[i+1] = next_line.rstrip()[:-1] + '))' + '\n'
    i += 1

with open('d:\\Agent44\\test_eval_runner.py', 'w') as f:
    f.writelines(lines)

print('Fixed closing parentheses!')
import os

# Read the current file
with open('d:\\Agent44\\test_eval_runner.py', 'r') as f:
    content = f.read()

# Add asyncio import if not present (it already should be)
if 'import asyncio' not in content:
    content = content.replace('import json', 'import asyncio\nimport json', 1)

# Replace all 'report = evaluate(' with 'report = asyncio.run(evaluate('
# But we need to also fix the closing parenthesis
# The original has: report = evaluate(\n    ... \n)
# We need: report = asyncio.run(evaluate(\n    ... \n))

# Actually, let's just replace the evaluate( calls and handle the closing separately
# First, let's find and replace evaluate( calls that are followed by specific parameters

# Simple approach: replace 'report = evaluate(' with 'report = asyncio.run(evaluate('
content = content.replace('report = evaluate(', 'report = asyncio.run(evaluate(')

# Now we need to add the extra closing parenthesis at the end of each evaluate call
# The original calls end with: adapter_deadline=5.0,\n)
# We need: adapter_deadline=5.0,\n))

# Let's find the pattern and replace
old_pattern = 'adapter_deadline=5.0,\\n)'
new_pattern = 'adapter_deadline=5.0,\\n))'
content = content.replace(old_pattern, new_pattern)

# Write back
with open('d:\\Agent44\\test_eval_runner.py', 'w') as f:
    f.write(content)

print('Fixed!')
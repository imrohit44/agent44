#!/usr/bin/env python3
import re

# Read the file
with open('d:\\Agent44\\test_eval_runner.py', 'r') as f:
    content = f.read()

# Replace 'report = evaluate(' with 'report = asyncio.run(evaluate('
# But we need to be careful - only replace the specific pattern
content = content.replace('report = evaluate(', 'report = asyncio.run(evaluate(')

# Now fix the closing parentheses - replace adapter_deadline=5.0,\n) with adapter_deadline=5.0,\n))
content = content.replace('adapter_deadline=5.0,\\n)', 'adapter_deadline=5.0,\\n))')

# Write back
with open('d:\\Agent44\\test_eval_runner.py', 'w') as f:
    f.write(content)

print('Done fixing')
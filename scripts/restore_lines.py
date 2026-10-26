#!/usr/bin/env python3
# Restore original \r\n line endings
with open('test_eval_runner.py', 'rb') as f:
    content = f.read()
# Replace \n with \r\n
content = content.replace(b'\n', b'\r\n')
with open('test_eval_runner.py', 'wb') as f:
    f.write(content)
print("Done")
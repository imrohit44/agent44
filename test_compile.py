#!/usr/bin/env python3
import sys

with open('test_eval_runner.py', 'r') as f:
    lines = f.readlines()

# Try compiling first 125 lines only (indices 0-124)
first_part = ''.join(lines[:125])
try:
    compile(first_part, 'test_eval_runner.py', 'exec')
    print("First 125 lines compile OK")
except SyntaxError as e:
    print(f"First 125 lines error: {e}")

# Try compiling lines 125-131 (indices 124-131 inclusive)
middle_part = ''.join(lines[124:132])
try:
    compile(middle_part, 'test_eval_runner.py', 'exec')
    print("Lines 125-131 compile OK")
except SyntaxError as e:
    print(f"Lines 125-131 error: {e}")
    print(f"Error at line {e.lineno}")
    print(f"Text: {e.text}")
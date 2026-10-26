#!/usr/bin/env python3
import sys

# Read the file
with open('test_eval_runner.py', 'r') as f:
    code = f.read()

# Try to compile
try:
    compile(code, 'test_eval_runner.py', 'exec')
    print("Compilation succeeded!")
except SyntaxError as e:
    print(f"Syntax error: {e}")
    print(f"Error at line {e.lineno}")
    print(f"Text: {e.text}")
    print(f"Offset: {e.offset}")
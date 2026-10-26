import pathlib

with open("test_eval_runner.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the problematic sys.path.insert line
old = r'sys.path.insert(0, r"d:\Agent44\\")'
new = r'sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))'

print("Looking for:", repr(old))
print("In content:", old in content)

if old in content:
    content = content.replace(old, new)
    with open("test_eval_runner.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replacement done!")
else:
    print("Old text not found - trying regex")
    import re
    # Try to find the line with sys.path.insert
    for i, line in enumerate(content.split("\n")):
        if "sys.path.insert" in line and "Agent44" in line:
            print(f"Line {i+1}: {repr(line)}")
            # Replace this line
            new_line = "sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))"
            lines = content.split("\n")
            lines[i] = new_line
            content = "\n".join(lines)
            with open("test_eval_runner.py", "w", encoding="utf-8") as f:
                f.write(content)
            print("Replacement via line done!")
            break
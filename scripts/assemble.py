from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent


def rd(name):
    with open(SCRIPT_DIR / name, encoding="utf-8") as source:
        return source.read().splitlines(keepends=True)


def rw(name, text):
    with open(REPO_ROOT / name, "w", encoding="utf-8") as destination:
        destination.write(text)


# bench_S3a: drop the premature tuple-closing ')' (bench_S3b continues the tuple).
s3a = rd("bench_S3a.py")
assert s3a[-1].strip() == ")", s3a[-1]
s3a = s3a[:-1]

parts = [
    rd("bench_S1.py"),
    rd("bench_S2.py"),
    s3a,
    rd("bench_S3b.py"),
    rd("bench_S4.py"),
    rd("bench_S5.py"),
    rd("bench_S6a.py"),
    rd("bench_S6b.py"),
    rd("bench_S7a.py"),
    rd("bench_S7b.py"),
    rd("bench_S8.py"),
    rd("bench_S9a.py"),
    rd("bench_S9b.py"),
]
out = "".join(x for p in parts for x in p)
rw("src/agent44/benchmark.py", out)
print("written", out.count("\n") + 1, "lines")

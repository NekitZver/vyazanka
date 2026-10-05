"""Check ml/manifest.csv and write ml/dataset/{train,val}/<label>/ (copies) with a deterministic split.

    python ml/split.py [--val 0.15]
"""
import argparse
import csv
import hashlib
import shutil
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent


def split_of(path: str, val_fraction: float) -> str:
    # hash of the path, so a file keeps its split when more photos are added later
    bucket = int(hashlib.sha1(path.encode()).hexdigest(), 16) % 1000
    return "val" if bucket < val_fraction * 1000 else "train"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--val", type=float, default=0.15)
    args = ap.parse_args()
    with (HERE / "manifest.csv").open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    shutil.rmtree(HERE / "dataset", ignore_errors=True)  # copies of photos deleted from raw must not survive
    counts = Counter()
    for row in rows:
        src = HERE / row["path"]
        if not src.exists():
            print("missing file, skipped:", row["path"].encode("ascii", "replace").decode())  # Windows consoles choke on some names
            continue
        part = split_of(row["path"], args.val)
        dest = HERE / "dataset" / part / row["label"] / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
        counts[(part, row["label"])] += 1
    for (part, label), n in sorted(counts.items()):
        print(f"{part:5} {label:12} {n}")
    small = [label for label in {l for _, l in counts} if counts[("train", label)] < 100]
    if small:
        print("fewer than 100 train images (too few for a reliable classifier):", ", ".join(sorted(small)))


if __name__ == "__main__":
    main()

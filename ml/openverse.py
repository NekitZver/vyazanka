"""Download Creative Commons photos (CC0, public domain, CC BY, CC BY-SA) from Openverse, which indexes Flickr and other
photo sites, into ml/raw/<label>/ and ml/manifest.csv with source page, license and author. Standard library only.

    python ml/openverse.py [--pages 3]

Anonymous access is rate limited (small pages, a few hundred requests a day). Search results are noisy: review the photos by hand.
"""
import argparse
import csv
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from commons import safe_name

API = "https://api.openverse.org/v1/images/"
UA = "vyazanka-dataset/0.1 (https://github.com/NekitZver/vyazanka)"
HERE = Path(__file__).parent
QUERIES = {
    "hat": ["knitted hat", "knit beanie", "crochet hat"],
    "scarf": ["knitted scarf", "crochet scarf"],
    "snood": ["knitted snood", "knitted cowl", "infinity scarf knit"],
    "sweater": ["hand knitted sweater", "cable knit sweater", "knitted pullover"],
    "dog_sweater": ["dog in knitted sweater", "knitted dog sweater"],
}


def search(query: str, page: int) -> list[dict]:
    params = {"q": query, "license": "by,by-sa,cc0,pdm", "page_size": 20, "page": page, "mature": "false"}
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("results", [])


def license_name(item: dict) -> str:
    """Openverse says "by-sa" 4.0; commons.allowed() expects "CC BY-SA 4.0"."""
    code = item.get("license", "").lower()
    if code == "pdm":
        return "Public domain"
    return f"CC {code} {item.get('license_version', '')}".upper().strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3, help="result pages (20 photos) per query")
    args = ap.parse_args()
    manifest = HERE / "manifest.csv"
    seen = set()
    if manifest.exists():
        with manifest.open(newline="", encoding="utf-8") as f:
            seen = {row["source_url"] for row in csv.DictReader(f)}
    new_file = not manifest.exists()
    with manifest.open("a", newline="", encoding="utf-8") as f:
        out = csv.DictWriter(f, fieldnames=["path", "label", "source_url", "license", "author"])
        if new_file:
            out.writeheader()
        for label, queries in QUERIES.items():
            found = 0
            for q in queries:
                for page in range(1, args.pages + 1):
                    try:
                        items = search(q, page)
                    except Exception as e:
                        print("stopped", q, page, e)  # usually the daily limit
                        break
                    for it in items:
                        src, url = it.get("foreign_landing_url") or it.get("url", ""), it.get("thumbnail") or it.get("url", "")
                        if not url or src in seen:
                            continue
                        dest = HERE / "raw" / label / safe_name("ov" + str(it["id"])[:8], url.split("?")[0] + ".jpg")
                        try:
                            req = urllib.request.Request(url, headers={"User-Agent": UA})
                            with urllib.request.urlopen(req, timeout=60) as r:
                                data = r.read()
                        except Exception as e:
                            print("skipped", url, e)
                            continue
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(data)
                        out.writerow({"path": dest.relative_to(HERE).as_posix(), "label": label, "source_url": src,
                                      "license": license_name(it), "author": it.get("creator") or ""})
                        seen.add(src)
                        found += 1
                        time.sleep(1)
                    time.sleep(1)
            f.flush()
            print(f"{label:12} {found} new files")


if __name__ == "__main__":
    main()

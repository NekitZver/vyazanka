"""Download freely licensed photos from Wikimedia Commons into ml/raw/<label>/ and record
source, license and author of every photo in ml/manifest.csv. Standard library only.

    python ml/commons.py [--limit 200]
"""
import argparse
import csv
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
UA = "vyazanka-dataset/0.1 (https://github.com/NekitZver/vyazanka)"  # Wikimedia asks for a descriptive agent
ALLOWED = re.compile(r"(cc0.*|public domain.*|pd.*|cc[ -]by(-sa)?([ -]\d.*)?)")  # no NC or ND variants
HERE = Path(__file__).parent


def safe_name(page_id, url: str) -> str:
    """File name from a thumbnail URL: no query string, no characters Windows rejects, unique per page."""
    name = urllib.parse.unquote(urllib.parse.urlparse(url).path.rsplit("/", 1)[-1])
    return f"{page_id}_" + re.sub(r'[<>:"/\\|?*]', "_", name)


def allowed(license_name: str) -> bool:
    return bool(ALLOWED.fullmatch(license_name.lower().strip()))


def api(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
        return json.load(r)


def list_files(category: str, limit: int):
    """Yield (page_id, thumb_url, page_url, license, author) for image files in a category."""
    params = {
        "action": "query", "generator": "categorymembers", "gcmtitle": category, "gcmtype": "file",
        "gcmlimit": min(limit, 50), "prop": "imageinfo", "iiprop": "url|extmetadata|mime",
        "iiurlwidth": 512, "iiextmetadatafilter": "LicenseShortName|Artist",
    }
    for page in api(params).get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        if info.get("mime") not in ("image/jpeg", "image/png"):
            continue
        meta = info.get("extmetadata", {})
        yield (
            page["pageid"], info.get("thumburl", ""), info.get("descriptionurl", ""),
            meta.get("LicenseShortName", {}).get("value", ""), meta.get("Artist", {}).get("value", ""),
        )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50, help="files per category (max 50 per request)")
    args = ap.parse_args()
    categories = {k: v for k, v in json.loads((HERE / "categories.json").read_text()).items() if not k.startswith("_")}
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
        for label, cats in categories.items():
            for cat in cats:
                found = 0
                for page_id, thumb, page_url, lic, author in list_files(cat, args.limit):
                    if not thumb or page_url in seen or not allowed(lic):
                        continue
                    dest = HERE / "raw" / label / safe_name(page_id, thumb)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    req = urllib.request.Request(thumb, headers={"User-Agent": UA})
                    with urllib.request.urlopen(req, timeout=60) as r:
                        dest.write_bytes(r.read())
                    out.writerow({"path": dest.relative_to(HERE).as_posix(), "label": label, "source_url": page_url,
                                  "license": lic, "author": author})
                    seen.add(page_url)
                    found += 1
                    time.sleep(1)  # be polite to Commons
                print(f"{label:12} {cat}: {found} new files" + ("  <- check this category name" if found == 0 else ""))


if __name__ == "__main__":
    main()

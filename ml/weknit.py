"""Collect photos from the free pattern pages of weknit.ru into ml/raw/<label>/ and ml/manifest.csv.
Standard library only. The label comes from keywords in the pattern's title.

    python ml/weknit.py [--pages 5] [--max-pages 200]

These photos are copyrighted by the site and its authors: they are for training the local model only.
Do not commit or redistribute them (ml/raw is git-ignored), and drop them from the manifest if the app is ever published.
Respects robots.txt and waits between requests. ponytail: guesses the page layout; the script prints what it finds, fix the selectors here if it finds nothing.
"""
import argparse
import csv
import re
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path

START = "https://weknit.ru/besplatnye-opisaniya-vyazaniya/"
UA = "vyazanka-dataset/0.1 (personal research, https://github.com/NekitZver/vyazanka)"
LICENSE = "all rights reserved (weknit.ru), personal training use only"
HERE = Path(__file__).parent
# first match wins: dog before sweater, so "свитер для собаки" is a dog sweater; sweater before snood, because
# "кокетка-хомут" (a yoke) appears in sweater names. Latin forms match the site's transliterated URLs (/sviter-.../).
KEYWORDS = [
    ("dog_sweater", r"собак|пес\b|песик|питомц|sobak|pitomc"),
    ("sweater", r"свитер|пуловер|джемпер|кофт|кардиган|sviter|pulover|dzhemper|koft|kardigan"),
    ("snood", r"снуд|хомут|snud|homut|xomut"),
    ("scarf", r"шарф|sharf"),
    ("hat", r"шапк|берет|ушанк|колпак|shapk|beret|ushank|kolpak"),
]
BAD_IMG = re.compile(r"logo|icon|avatar|banner|sprite|\.svg|\.gif|pixel", re.I)


def label_of(text: str) -> str | None:
    for label, pattern in KEYWORDS:
        if re.search(pattern, text.lower()):
            return label
    return None


class Page(HTMLParser):
    """Collects links, image URLs and the page title."""

    def __init__(self, base: str):
        super().__init__()
        self.base, self.links, self.images, self.title, self._in_title = base, [], [], "", False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and a.get("href"):
            self.links.append(urllib.parse.urljoin(self.base, a["href"].split("#")[0]))
        elif tag == "img":
            src = a.get("data-src") or a.get("data-lazy-src") or a.get("src") or ""
            small = any(str(a.get(k, "")).isdigit() and int(a[k]) < 200 for k in ("width", "height"))
            if src and not small and not BAD_IMG.search(src):
                self.images.append(urllib.parse.urljoin(self.base, src))
        elif tag == "title":
            self._in_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def parse(html: str, base: str) -> Page:
    p = Page(base)
    p.feed(html)
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=5, help="listing pages to read")
    ap.add_argument("--max-pages", type=int, default=200, help="pattern pages to read")
    ap.add_argument("--delay", type=float, default=2.0)
    args = ap.parse_args()

    robots = urllib.robotparser.RobotFileParser(urllib.parse.urljoin(START, "/robots.txt"))
    robots.read()
    host = urllib.parse.urlparse(START).netloc

    def get(url: str) -> bytes:
        if not robots.can_fetch(UA, url):
            raise PermissionError("robots.txt disallows " + url)
        for attempt in range(3):  # the site sometimes times out on the TLS handshake
            time.sleep(args.delay * (attempt + 1))
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                    return r.read()
            except OSError:  # URLError and timeouts
                if attempt == 2:
                    raise

    # 1. listing pages -> pattern links whose slug or link text names one of our items
    candidates, todo, seen_listing = {}, [START], set()
    while todo and len(seen_listing) < args.pages:
        url = todo.pop(0)
        if url in seen_listing:
            continue
        seen_listing.add(url)
        page = parse(get(url).decode("utf-8", "replace"), url)
        for link in page.links:
            if urllib.parse.urlparse(link).netloc != host:
                continue
            if link.startswith(START) and re.search(r"page/\d+|[?&]page=|PAGEN", link):
                todo.append(link)
            elif not link.startswith(START) and label_of(urllib.parse.unquote(link)):  # category listings are not patterns
                candidates[link] = label_of(urllib.parse.unquote(link))
    print(f"{len(seen_listing)} listing pages, {len(candidates)} pattern links with a known item")

    # 2. pattern pages -> photos
    manifest = HERE / "manifest.csv"
    seen = set()
    if manifest.exists():
        with manifest.open(newline="", encoding="utf-8") as f:
            seen = {row["source_url"] for row in csv.DictReader(f)}
    new_file = not manifest.exists()
    counts = {}
    with manifest.open("a", newline="", encoding="utf-8") as f:
        out = csv.DictWriter(f, fieldnames=["path", "label", "source_url", "license", "author"])
        if new_file:
            out.writeheader()
        for url, label in list(candidates.items())[: args.max_pages]:
            try:
                page = parse(get(url).decode("utf-8", "replace"), url)
            except Exception as e:
                print("skipped", url, e)
                continue
            label = label_of(page.title) or label  # the page title is more reliable than the URL
            for i, img in enumerate(dict.fromkeys(page.images)):
                if img in seen:
                    continue
                ext = Path(urllib.parse.urlparse(img).path).suffix.lower()
                if ext not in (".jpg", ".jpeg", ".png", ".webp"):
                    continue
                name = re.sub(r"[^A-Za-z0-9._-]", "_", urllib.parse.urlparse(url).path.strip("/").rsplit("/", 1)[-1])[:60]
                dest = HERE / "raw" / label / f"weknit_{name}_{i}{ext}"
                try:
                    data = get(img)
                except Exception as e:
                    print("skipped", img, e)
                    continue
                if len(data) < 15_000:  # thumbnails and decorations
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                out.writerow({"path": dest.relative_to(HERE).as_posix(), "label": label, "source_url": img, "license": LICENSE, "author": url})
                seen.add(img)
                counts[label] = counts.get(label, 0) + 1
            f.flush()
    print("new photos:", counts or "none, check the selectors in ml/weknit.py")


if __name__ == "__main__":
    main()

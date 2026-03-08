"""
download_commentaries.py
Downloads all mefarshim (Rashi, Ramban, Ibn Ezra, Sforno, Or HaChaim, Kli Yakar, Chizkuni)
for all 5 books of the Torah from the Sefaria API.
Saves JSON files to src/data/sefaria/.

Usage:
    python scripts/download_commentaries.py [commentator_id]
    
    # Download everything:
    python scripts/download_commentaries.py

    # Download only one commentator:
    python scripts/download_commentaries.py Ramban

Requirements: pip install requests
"""
import json
import time
import os
import sys
import re
import requests
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data" / "sefaria"

BOOKS = [
    (1, "Genesis"),
    (2, "Exodus"),
    (3, "Leviticus"),
    (4, "Numbers"),
    (5, "Deuteronomy"),
]

# Sefaria text refs for each commentator + book
# Format: (commentator_id, sefer_id, english_book, sefaria_ref)
COMMENTARIES = []
for sefer_id, book_en in BOOKS:
    for commentator_id, sefaria_name_tmpl, out_name_tmpl in [
        # Standard "X_on_Book" format
        ("Rashi",       "Rashi_on_{book}",      "Rashi_on_{book}"),
        ("Ramban",      "Ramban_on_{book}",      "Ramban_on_{book}"),
        ("Ibn_Ezra",    "Ibn_Ezra_on_{book}",    "Ibn_Ezra_on_{book}"),
        ("Sforno",      "Sforno_on_{book}",      "Sforno_on_{book}"),
        ("Or_HaChaim",  "Or_HaChaim_on_{book}",  "Or_HaChaim_on_{book}"),
        ("Kli_Yakar",   "Kli_Yakar_on_{book}",   "Kli_Yakar_on_{book}"),
        ("Malbim",      "Malbim_on_{book}",      "Malbim_on_{book}"),
        # Chizkuni uses "Chizkuni,_Book" format on Sefaria
        ("Chizkuni",    "Chizkuni%2C_{book}",    "Chizkuni_on_{book}"),
    ]:
        sefaria_ref = sefaria_name_tmpl.format(book=book_en)
        out_filename = out_name_tmpl.format(book=book_en)
        COMMENTARIES.append((commentator_id, sefer_id, book_en, sefaria_ref, out_filename))


def clean_html(text) -> str:
    """Strip HTML tags from text (str or nested list)."""
    if isinstance(text, list):
        return " ".join(clean_html(item) for item in text)
    if not isinstance(text, str):
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def fetch_text(sefaria_ref: str) -> list | None:
    """
    Fetch Hebrew text from Sefaria API.
    Returns the Hebrew text array (list-of-lists) or None on failure.
    """
    url = f"https://www.sefaria.org/api/texts/{sefaria_ref}?context=0&pad=0&commentary=0&langue=he"
    print(f"    GET {url}")
    try:
        r = requests.get(url, timeout=90)
        if r.status_code == 404:
            print(f"    Not found (404) — skipping.")
            return None
        r.raise_for_status()
        data = r.json()
        # Prefer Hebrew text
        text = data.get("he") or data.get("text")
        if not text:
            print(f"    Empty text — skipping.")
            return None
        return text
    except requests.exceptions.Timeout:
        print(f"    TIMEOUT — skipping.")
        return None
    except Exception as e:
        print(f"    ERROR: {e} — skipping.")
        return None


def has_content(text_arr) -> bool:
    """Return True if there's any non-empty text in the array."""
    for perek in text_arr:
        if not isinstance(perek, list):
            continue
        for pasuk in perek:
            cleaned = clean_html(pasuk)
            if cleaned:
                return True
    return False


def save_json(path: Path, commentator_id: str, sefaria_ref: str, text_arr: list):
    output = {
        "text": text_arr,
        "versionTitle": "Sefaria",
        "language": "he",
        "title": sefaria_ref.replace("_", " "),
        "commentator": commentator_id,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    size_kb = path.stat().st_size // 1024
    print(f"    Saved → {path.name}  ({size_kb} KB)")


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None

    tasks = [c for c in COMMENTARIES if target is None or c[0] == target]
    if not tasks:
        print(f"Unknown commentator: {target}")
        print("Available:", sorted(set(c[0] for c in COMMENTARIES)))
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    skipped_existing = 0
    downloaded = 0
    failed = []

    for commentator_id, sefer_id, book_en, sefaria_ref, out_filename in tasks:
        out_path = OUTPUT_DIR / f"{out_filename}.json"

        if out_path.exists():
            print(f"[skip] {out_filename}.json — already downloaded")
            skipped_existing += 1
            continue

        print(f"[{sefer_id}] {commentator_id} on {book_en} ...")
        text_arr = fetch_text(sefaria_ref)

        if text_arr is None:
            failed.append(f"{commentator_id}_on_{book_en}")
            time.sleep(1)
            continue

        if not has_content(text_arr):
            print(f"    No Hebrew content found — skipping.")
            failed.append(f"{commentator_id}_on_{book_en} (empty)")
            time.sleep(1)
            continue

        save_json(out_path, commentator_id, sefaria_ref, text_arr)
        downloaded += 1
        time.sleep(1.5)  # be polite to Sefaria

    print(f"\n{'='*60}")
    print(f"Downloaded : {downloaded}")
    print(f"Skipped    : {skipped_existing} (already existed)")
    if failed:
        print(f"Failed     : {len(failed)}")
        for f in failed:
            print(f"             {f}")
    print(f"Output dir : {OUTPUT_DIR}")
    print("Done!")


if __name__ == "__main__":
    main()

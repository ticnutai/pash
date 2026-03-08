"""
download_rashi.py
Downloads Rashi commentary for all 5 books of the Torah from the Sefaria API
and saves them as JSON files in src/data/sefaria/

Usage:
    python scripts/download_rashi.py

Requirements: requests  (pip install requests)
"""
import json
import time
import os
import requests

BOOKS = [
    (1, "Genesis",     "Rashi_on_Genesis"),
    (2, "Exodus",      "Rashi_on_Exodus"),
    (3, "Leviticus",   "Rashi_on_Leviticus"),
    (4, "Numbers",     "Rashi_on_Numbers"),
    (5, "Deuteronomy", "Rashi_on_Deuteronomy"),
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "data", "sefaria")

def fetch_rashi(sefaria_name: str) -> dict | None:
    """Fetch entire Rashi text from Sefaria API."""
    url = f"https://www.sefaria.org/api/texts/{sefaria_name}?context=0&pad=0&commentary=0&langue=he"
    print(f"  Fetching {url} ...")
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        data = r.json()
        return data
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for sefer_id, book_en, sefaria_name in BOOKS:
        out_path = os.path.join(OUTPUT_DIR, f"{sefaria_name}.json")

        if os.path.exists(out_path):
            print(f"[{sefer_id}] {sefaria_name} — already exists, skipping.")
            continue

        print(f"[{sefer_id}] Downloading {sefaria_name} ...")
        data = fetch_rashi(sefaria_name)

        if data is None:
            print(f"  FAILED to download {sefaria_name}")
            continue

        # Keep only the Hebrew text array + metadata
        output = {
            "text": data.get("he", data.get("text", [])),
            "versionTitle": data.get("heVersionTitle", "Mikraot Gedolot"),
            "language": "he",
            "title": sefaria_name.replace("_", " "),
        }

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        size_kb = os.path.getsize(out_path) // 1024
        print(f"  Saved {out_path}  ({size_kb} KB)")
        time.sleep(1)  # be polite to Sefaria

    print("\nDone! All Rashi files downloaded.")

if __name__ == "__main__":
    main()

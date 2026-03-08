"""
download_tehillim.py
Downloads all 150 Psalm chapters from Sefaria in Hebrew.
Output: src/data/tehillim.json
  {
    "1":  {"chapter": 1, "title": "תהלים פרק א׃", "lines": ["verse1", ...]},
    ...
    "150": {...}
  }
"""
import json, time, requests
from pathlib import Path

BASE_URL   = "https://www.sefaria.org/api/texts"
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "tehillim.json"
HEADERS = {"User-Agent": "TorahApp/1.0"}


def flatten_text(data) -> list[str]:
    result = []
    if isinstance(data, str):
        s = data.strip()
        if s:
            result.append(s)
    elif isinstance(data, list):
        for item in data:
            result.extend(flatten_text(item))
    return result


def main():
    print("Downloading Tehillim — 150 chapters\n" + "=" * 50)
    chapters: dict = {}

    for ch in range(1, 151):
        url = f"{BASE_URL}/Psalms.{ch}?context=0&pad=0&language=he"
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            d = r.json()
            lines = flatten_text(d.get("he", []))
            he_title = d.get("heTitle") or f"תהלים פרק {ch}"
            chapters[str(ch)] = {
                "chapter": ch,
                "title":   he_title,
                "lines":   [line.replace("<[^>]*>", "") for line in lines],
            }
            print(f"  {ch:3d}. {he_title:30s}  {len(lines)} פסוקים")
        except Exception as e:
            print(f"  {ch:3d}. ERROR: {e}")
        time.sleep(0.15)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(chapters, f, ensure_ascii=False, indent=2)

    total = sum(len(c["lines"]) for c in chapters.values())
    print(f"\nSaved {len(chapters)} chapters, {total} verses → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

"""
download_neviim.py
Downloads 6 Nevi'im books from Sefaria in the same JSON format as esther.json.
Output: src/data/{book}.json  (e.g. yehoshua.json, shoftim.json, ...)

Format:
{
  "sefer_id": 102,
  "sefer_name": "יהושע",
  "english_name": "Joshua",
  "parshiot": [
    {
      "parsha_id": 1021,
      "parsha_name": "פרק א",
      "perakim": [
        {
          "perek_num": 1,
          "pesukim": [
            { "id": 102001001, "pasuk_num": 1, "text": "...", "text_en": "...", "content": [] },
            ...
          ]
        }
      ]
    },
    ...
  ]
}
"""
import json, time, requests
from pathlib import Path

BASE_URL   = "https://www.sefaria.org/api/texts"
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
HEADERS    = {"User-Agent": "TorahApp/1.0"}

NEVIIM_BOOKS = [
    # (sefer_id, he_name, en_name, sefaria_slug, num_chapters)
    (102, "יהושע",   "Joshua",    "Joshua",   24),
    (103, "שופטים",  "Judges",    "Judges",   21),
    (104, "שמואל א", "I Samuel",  "I_Samuel", 31),
    (105, "שמואל ב", "II Samuel", "II_Samuel",24),
    (106, "מלכים א", "I Kings",   "I_Kings",  22),
    (107, "מלכים ב", "II Kings",  "II_Kings", 25),
]


def fetch_chapter(sefaria_slug: str, chapter: int) -> tuple[list[str], list[str]]:
    """Return (hebrew_verses, english_verses) for a single chapter."""
    url = f"{BASE_URL}/{sefaria_slug}.{chapter}?context=0&pad=0"
    r   = requests.get(url, headers=HEADERS, timeout=20)
    d   = r.json()

    def flatten(val) -> list[str]:
        if isinstance(val, str):
            return [val.strip()] if val.strip() else []
        if isinstance(val, list):
            out = []
            for item in val:
                out.extend(flatten(item))
            return out
        return []

    he_verses = flatten(d.get("he", []))
    en_verses = flatten(d.get("text", []))
    return he_verses, en_verses


def download_sefer(sefer_id: int, he_name: str, en_name: str,
                   slug: str, num_chapters: int) -> dict:
    print(f"\n{'='*55}")
    print(f"  {he_name} ({en_name})  — {num_chapters} פרקים")
    print(f"{'='*55}")

    parshiot = []
    for ch in range(1, num_chapters + 1):
        try:
            he_verses, en_verses = fetch_chapter(slug, ch)
            pesukim = []
            for i, he in enumerate(he_verses, start=1):
                pasuk_id = sefer_id * 1_000_000 + ch * 1000 + i
                en = en_verses[i - 1] if i <= len(en_verses) else ""
                pesukim.append({
                    "id":       pasuk_id,
                    "pasuk_num": i,
                    "text":     he,
                    "text_en":  en,
                    "content":  [],
                })
            parshiot.append({
                "parsha_id":   sefer_id * 100 + ch,
                "parsha_name": f"פרק {ch}",
                "perakim": [{
                    "perek_num": ch,
                    "pesukim":   pesukim,
                }],
            })
            print(f"  פרק {ch:2d}: {len(pesukim)} פסוקים")
        except Exception as e:
            print(f"  פרק {ch:2d}: ERROR – {e}")
        time.sleep(0.15)

    sefer = {
        "sefer_id":    sefer_id,
        "sefer_name":  he_name,
        "english_name": en_name,
        "parshiot":    parshiot,
    }
    total = sum(len(p["perakim"][0]["pesukim"]) for p in parshiot)
    print(f"\n  סה\"כ: {total} פסוקים ב-{len(parshiot)} פרקים")
    return sefer


def main():
    for sefer_id, he_name, en_name, slug, num_ch in NEVIIM_BOOKS:
        out_path = OUTPUT_DIR / f"{slug.lower()}.json"
        if out_path.exists():
            print(f"כבר קיים: {out_path.name} — מדלג")
            continue
        data = download_sefer(sefer_id, he_name, en_name, slug, num_ch)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  נשמר: {out_path}")

    print("\n✓ הורדת כל הנביאים הסתיימה!")


if __name__ == "__main__":
    main()

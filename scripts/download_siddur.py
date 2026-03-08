"""
download_siddur.py  (v2 - correct refs from Sefaria index)
Downloads Siddur prayers from Sefaria for Ashkenaz, Sefard, Edot HaMizrach.
Chabad = copy of Sefard (same base nusach).
"""
import json, time, requests, shutil
from pathlib import Path

TEXT_URL = "https://www.sefaria.org/api/texts"
INDEX_URL = "https://www.sefaria.org/api/v2/raw/index"
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data" / "siddur"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
HEADERS = {"User-Agent": "TorahApp/1.0"}

CATEGORY_MAP = {
    "Shacharit": {"id": "shacharit", "name": "שחרית"},
    "Mincha":    {"id": "mincha",    "name": "מנחה"},
    "Maariv":    {"id": "arvit",     "name": "ערבית"},
    "Weekday Shacharit": {"id": "shacharit", "name": "שחרית"},
    "Weekday Mincha":    {"id": "mincha",    "name": "מנחה"},
    "Weekday Maariv":    {"id": "arvit",     "name": "ערבית"},
    "Kabbalat Shabbat":  {"id": "shabbat_kabbalat", "name": "קבלת שבת"},
    "Shabbat Maariv":    {"id": "shabbat_arvit",    "name": "ערבית שבת"},
    "Shabbat Shacharit": {"id": "shabbat_shacharit","name": "שחרית שבת"},
    "Musaf":             {"id": "shabbat_musaf",    "name": "מוסף שבת"},
    "Shabbat Mincha":    {"id": "shabbat_mincha",   "name": "מנחה שבת"},
    "Blessings":         {"id": "brachot", "name": "ברכות"},
}

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

def get_all_leaf_refs(siddur_name: str) -> dict:
    r = requests.get(f"{INDEX_URL}/{siddur_name}", headers=HEADERS, timeout=30)
    if r.status_code != 200:
        print(f"ERROR: index {siddur_name}: {r.status_code}")
        return {}
    schema = r.json().get("schema", {})
    categories = {}
    def walk(nodes, path_parts):
        for n in nodes:
            key = n.get("key", "")
            new_path = path_parts + [key]
            if "nodes" in n:
                walk(n["nodes"], new_path)
            else:
                full_ref = f"{siddur_name}, " + ", ".join(new_path)
                cat_id, cat_name = "other", "אחר"
                for part in new_path:
                    if part in CATEGORY_MAP:
                        cat_id = CATEGORY_MAP[part]["id"]
                        cat_name = CATEGORY_MAP[part]["name"]
                        break
                if cat_id not in categories:
                    categories[cat_id] = {"name": cat_name, "refs": [], "he_titles": []}
                categories[cat_id]["refs"].append(full_ref)
                he_title = key
                for t in n.get("titles", []):
                    if t.get("lang") == "he" and t.get("primary"):
                        he_title = t["text"]
                        break
                categories[cat_id]["he_titles"].append(he_title)
    walk(schema.get("nodes", []), [])
    return categories

def download_ref(ref: str) -> list[str]:
    encoded = ref.replace(" ", "%20").replace(",", "%2C")
    url = f"{TEXT_URL}/{encoded}?context=0&pad=0&commentary=0&language=he"
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return []
        return flatten_text(r.json().get("he", []))
    except:
        return []

def download_nusach(siddur_name: str, nusach_id: str):
    print(f"\n{'='*60}\nIndexing {siddur_name}...")
    categories = get_all_leaf_refs(siddur_name)
    if not categories:
        print("  No categories found!")
        return {}
    print(f"  Found {len(categories)} categories, {sum(len(c['refs']) for c in categories.values())} refs")
    
    priority = ["shacharit", "mincha", "arvit", "shabbat_kabbalat", "shabbat_arvit",
                "shabbat_shacharit", "shabbat_musaf", "shabbat_mincha", "brachot", "other"]
    result = {}
    all_cats = list(dict.fromkeys(priority + list(categories.keys())))
    
    for cat_id in all_cats:
        if cat_id not in categories:
            continue
        cat = categories[cat_id]
        print(f"\n  {cat['name']} ({cat_id}) — {len(cat['refs'])} sections")
        sections = []
        for i, ref in enumerate(cat["refs"]):
            he_title = cat["he_titles"][i] if i < len(cat["he_titles"]) else ""
            lines = download_ref(ref)
            status = f"{len(lines)} lines" if lines else "SKIP"
            print(f"    {he_title}: {status}")
            if lines:
                sections.append({"title": he_title, "lines": lines})
            time.sleep(0.25)
        total = sum(len(s["lines"]) for s in sections)
        result[cat_id] = {"name": cat["name"], "sections": sections, "total_lines": total}
        print(f"  → {total} lines")
    
    out_path = OUTPUT_DIR / f"siddur_{nusach_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    grand = sum(c["total_lines"] for c in result.values())
    print(f"\n  SAVED: {out_path} ({grand} lines)")
    return result

def main():
    print("Siddur Download v2\n" + "=" * 60)
    for name, nid in [("Siddur_Ashkenaz","ashkenaz"),("Siddur_Sefard","sefard"),("Siddur_Edot_HaMizrach","edot_hamizrach")]:
        download_nusach(name, nid)
    sf = OUTPUT_DIR / "siddur_sefard.json"
    ch = OUTPUT_DIR / "siddur_chabad.json"
    if sf.exists():
        shutil.copy2(sf, ch)
        print(f"\n  Chabad: copied from Sefard → {ch}")
    print(f"\n{'='*60}\nDONE!")

if __name__ == "__main__":
    main()

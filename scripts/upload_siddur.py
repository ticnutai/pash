"""
upload_siddur.py
Uploads all 4 nusachim from src/data/siddur/ to Supabase 'siddur' table.
Uses UPSERT on (nusach, category, section_idx) - safe to re-run.

Usage:
    .venv-1/Scripts/python.exe scripts/upload_siddur.py            # all 4 nusachim
    .venv-1/Scripts/python.exe scripts/upload_siddur.py sefard     # one nusach only
    .venv-1/Scripts/python.exe scripts/upload_siddur.py --force    # re-upload existing

Requirements (already in .venv-1): pip install requests
"""
import json
import os
import sys
import time
import requests
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://mocukhvfqqzkekphifsr.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY3VraHZmcXF6a2VrcGhpZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODQ5MDgsImV4cCI6MjA4MDE2MDkwOH0"
    ".7whrGNQK4_ByacsLF4qWn3lObBL9bQyhy1vk6C4KxQw"
)

API_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not API_KEY:
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
if not API_KEY:
    print("ℹ️  No SERVICE_ROLE_KEY found — using anon key.")
    API_KEY = ANON_KEY

HEADERS = {
    "apikey":        API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",
}

DATA_DIR = Path(__file__).parent.parent / "src" / "data" / "siddur"
BATCH_SIZE = 200

NUSACHIM = ["sefard", "ashkenaz", "edot_hamizrach", "chabad"]

# Preferred category ordering
CATEGORIES_ORDER = [
    "shacharit", "mincha", "arvit",
    "shabbat_kabbalat", "shabbat_arvit", "shabbat_shacharit",
    "shabbat_musaf", "shabbat_mincha", "brachot", "other",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def insert_batch(rows: list[dict]) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/siddur"
    r = requests.post(url, headers=HEADERS, json=rows, timeout=60)
    if r.status_code not in (200, 201):
        print(f"    ✗ Insert error {r.status_code}: {r.text[:300]}")
        return False
    return True


def count_existing(nusach: str) -> int:
    url = f"{SUPABASE_URL}/rest/v1/siddur?nusach=eq.{nusach}&select=id"
    h = dict(HEADERS)
    h["Prefer"] = "count=exact"
    r = requests.get(url, headers=h, timeout=30)
    try:
        return int(r.headers.get("content-range", "0/0").split("/")[1])
    except Exception:
        return 0


def upload_nusach(nusach: str, force: bool = False):
    path = DATA_DIR / f"siddur_{nusach}.json"
    if not path.exists():
        print(f"  ✗ File not found: {path}")
        return

    print(f"\n{'='*50}")
    print(f"  Nusach: {nusach}  ← {path.name}  ({path.stat().st_size // 1024}KB)")

    existing = count_existing(nusach)
    if existing > 0 and not force:
        print(f"  Already in DB: {existing} rows — skipping. (use --force to re-upload)")
        return

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    # Sort categories by preferred order
    cat_keys = sorted(data.keys(), key=lambda k: CATEGORIES_ORDER.index(k) if k in CATEGORIES_ORDER else 99)

    rows = []
    total = 0

    for cat_id in cat_keys:
        cat = data[cat_id]
        cat_name = cat.get("name", cat_id)
        sections = cat.get("sections", [])
        print(f"    {cat_id}: {len(sections)} sections...")

        for idx, section in enumerate(sections):
            title = section.get("title", "")
            lines = section.get("lines", [])
            rows.append({
                "nusach":      nusach,
                "category":    cat_id,
                "cat_name":    cat_name,
                "section_idx": idx,
                "title":       title,
                "lines":       lines,
            })
            total += 1

            if len(rows) >= BATCH_SIZE:
                if not insert_batch(rows):
                    print("    FAILED — aborting this nusach.")
                    return
                rows = []
                time.sleep(0.15)

    if rows:
        if not insert_batch(rows):
            print("    Final batch FAILED.")
            return

    print(f"  ✓ Done: {total} sections uploaded.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = [a for a in sys.argv[1:] if a != "--force"]
    force = "--force" in sys.argv

    target = args[0] if args else None
    nusachim_to_upload = [target] if target else NUSACHIM

    print("Siddur Upload")
    print("=" * 50)
    for nusach in nusachim_to_upload:
        if nusach not in NUSACHIM:
            print(f"Unknown nusach: {nusach}. Valid: {NUSACHIM}")
            continue
        upload_nusach(nusach, force=force)

    print("\n✓ Upload complete.")
    print("Now you can remove the large JSON files from the bundle if desired.")


if __name__ == "__main__":
    main()

"""
upload_rashi.py
Uploads all Rashi commentary JSON files to the Supabase rashi_commentary table.

Usage:
    python scripts/upload_rashi.py

Requirements:
    pip install requests
    
    Set SUPABASE_SERVICE_ROLE_KEY in .env or as environment variable.
    (Get it from: https://supabase.com/dashboard/project/mocukhvfqqzkekphifsr/settings/api)

The table must already exist — run the migration first:
    supabase db push   OR   apply supabase/migrations/20260306000000_rashi_commentary.sql
"""
import json
import os
import re
import sys
import time
import requests
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://mocukhvfqqzkekphifsr.supabase.co"

# Requires service_role key — get from dashboard > project > settings > API
API_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not API_KEY:
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not API_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY is required (RLS restricts writes to service_role).")
    print("Set it via:  $env:SUPABASE_SERVICE_ROLE_KEY='eyJ...'")
    print("Get it from: https://supabase.com/dashboard/project/mocukhvfqqzkekphifsr/settings/api")
    sys.exit(1)

DATA_DIR = Path(__file__).parent.parent / "src" / "data" / "sefaria"

BOOKS = [
    (1, "Rashi_on_Genesis"),
    (2, "Rashi_on_Exodus"),
    (3, "Rashi_on_Leviticus"),
    (4, "Rashi_on_Numbers"),
    (5, "Rashi_on_Deuteronomy"),
]

HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

BATCH_SIZE = 500

# ── Helpers ───────────────────────────────────────────────────────────────────

def clean_text(text) -> str:
    """Strip HTML tags and normalize whitespace. Accepts str or list."""
    if isinstance(text, list):
        # Recursively join list sub-entries
        text = " ".join(clean_text(item) for item in text)
    if not isinstance(text, str):
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()

def insert_batch(rows: list[dict]) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/rashi_commentary"
    r = requests.post(url, headers=HEADERS, json=rows, timeout=30)
    if r.status_code not in (200, 201):
        print(f"    Insert error {r.status_code}: {r.text[:200]}")
        return False
    return True

# ── Main ──────────────────────────────────────────────────────────────────────

def clear_sefer(sefer_id: int):
    """Delete existing rows for this sefer before re-inserting."""
    url = f"{SUPABASE_URL}/rest/v1/rashi_commentary?sefer_id=eq.{sefer_id}"
    r = requests.delete(url, headers=HEADERS, timeout=30)
    if r.status_code not in (200, 204):
        print(f"  ERROR: could not clear sefer {sefer_id}: {r.status_code} — aborting to prevent duplicates")
        sys.exit(1)

def upload_sefer(sefer_id: int, filename: str):
    path = DATA_DIR / f"{filename}.json"
    if not path.exists():
        print(f"  File not found: {path}")
        print(f"  Run  python scripts/download_rashi.py  first.")
        return

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    text_data = data.get("text", [])
    print(f"  Sefer {sefer_id}: {len(text_data)} perakim found. Clearing old rows ...")
    clear_sefer(sefer_id)

    rows = []
    total = 0
    empty = 0

    for perek_idx, perek_arr in enumerate(text_data):
        perek_num = perek_idx + 1
        if not isinstance(perek_arr, list):
            continue
        for pasuk_idx, raw_text in enumerate(perek_arr):
            cleaned = clean_text(raw_text)
            if not cleaned:
                empty += 1
                continue
            rows.append({
                "sefer_id": sefer_id,
                "perek": perek_num,
                "pasuk": pasuk_idx + 1,
                "text": cleaned,
            })
            total += 1

            if len(rows) >= BATCH_SIZE:
                ok = insert_batch(rows)
                if ok:
                    print(f"    Inserted batch up to perek {perek_num} pasuk {pasuk_idx+1} ...")
                else:
                    print(f"    Batch FAILED - aborting sefer {sefer_id}")
                    return
                rows = []
                time.sleep(0.2)

    if rows:
        insert_batch(rows)

    print(f"  Done. {total} rows inserted ({empty} empty skipped).")

def main():
    print(f"Uploading Rashi to Supabase: {SUPABASE_URL}\n")
    for sefer_id, filename in BOOKS:
        print(f"[{sefer_id}] {filename} ...")
        upload_sefer(sefer_id, filename)
        time.sleep(0.5)
    print("\nAll done!")

if __name__ == "__main__":
    main()

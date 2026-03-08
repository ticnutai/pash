"""
upload_commentaries.py
Uploads all mefarshim JSON files from src/data/sefaria/ to the
Supabase 'commentaries' table (created by migration 20260308000000_commentaries_unified.sql).

Uses UPSERT on (commentator, sefer_id, perek, pasuk) so it is safe to re-run.

Usage:
    python scripts/upload_commentaries.py              # upload everything
    python scripts/upload_commentaries.py Rashi        # upload only Rashi
    python scripts/upload_commentaries.py Ramban 1     # upload Ramban Genesis only

Requirements: pip install requests
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
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY3VraHZmcXF6a2VrcGhpZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODQ5MDgsImV4cCI6MjA4MDE2MDkwOH0.7whrGNQK4_ByacsLF4qWn3lObBL9bQyhy1vk6C4KxQw"

# Try service role key (has more permissions)
API_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not API_KEY:
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not API_KEY:
    print("ℹ️  No SERVICE_ROLE_KEY found — using anon key (public insert must be enabled).")
    API_KEY = ANON_KEY

HEADERS = {
    "apikey":        API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",
}

DATA_DIR   = Path(__file__).parent.parent / "src" / "data" / "sefaria"
BATCH_SIZE = 500

BOOK_IDS = {
    "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
}

# All known commentator_id → (sefer_id → filename) mappings
ALL_FILES: list[tuple[str, int, Path]] = []
for commentator_dir_like_prefix in [
    "Rashi", "Ramban", "Ibn_Ezra", "Sforno",
    "Or_HaChaim", "Kli_Yakar", "Chizkuni", "Malbim",
]:
    for book_en, sefer_id in BOOK_IDS.items():
        p = DATA_DIR / f"{commentator_dir_like_prefix}_on_{book_en}.json"
        if p.exists():
            ALL_FILES.append((commentator_dir_like_prefix, sefer_id, p))


# ── Helpers ───────────────────────────────────────────────────────────────────

def clean_text(text) -> str:
    if isinstance(text, list):
        return " ".join(clean_text(t) for t in text)
    if not isinstance(text, str):
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def insert_batch(rows: list[dict]) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/commentaries"
    r = requests.post(url, headers=HEADERS, json=rows, timeout=60)
    if r.status_code not in (200, 201):
        print(f"    ✗ Insert error {r.status_code}: {r.text[:300]}")
        return False
    return True


def count_existing(commentator: str, sefer_id: int) -> int:
    url = f"{SUPABASE_URL}/rest/v1/commentaries?commentator=eq.{commentator}&sefer_id=eq.{sefer_id}&select=id"
    h = dict(HEADERS)
    h["Prefer"] = "count=exact"
    r = requests.get(url, headers=h, timeout=30)
    try:
        return int(r.headers.get("content-range", "0/0").split("/")[1])
    except Exception:
        return 0


def upload_file(commentator: str, sefer_id: int, path: Path, force: bool = False):
    print(f"\n  [{sefer_id}] {commentator} ← {path.name}")

    existing = count_existing(commentator, sefer_id)
    if existing > 0 and not force:
        print(f"      Already in DB: {existing} rows — skipping. (use --force to re-upload)")
        return

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    text_data = data.get("text", [])
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
                "commentator": commentator,
                "sefer_id":    sefer_id,
                "perek":       perek_num,
                "pasuk":       pasuk_idx + 1,
                "text":        cleaned,
            })
            total += 1

            if len(rows) >= BATCH_SIZE:
                ok = insert_batch(rows)
                if ok:
                    print(f"      Inserted batch up to {perek_num}:{pasuk_idx+1} ...")
                else:
                    print(f"      Batch FAILED — aborting this file.")
                    return
                rows = []
                time.sleep(0.2)

    if rows:
        ok = insert_batch(rows)
        if not ok:
            print(f"      Final batch FAILED.")

    print(f"      ✓ Done: {total} rows inserted, {empty} empty skipped.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = [a for a in sys.argv[1:] if a != "--force"]
    force = "--force" in sys.argv

    # Filter by optional args: [commentator] [sefer_id]
    target_commentator = args[0] if len(args) >= 1 else None
    target_sefer       = int(args[1]) if len(args) >= 2 else None

    tasks = ALL_FILES
    if target_commentator:
        tasks = [t for t in tasks if t[0] == target_commentator]
    if target_sefer:
        tasks = [t for t in tasks if t[1] == target_sefer]

    if not tasks:
        print("No matching files found.")
        print("Available commentators:", sorted(set(t[0] for t in ALL_FILES)))
        sys.exit(1)

    print(f"Uploading {len(tasks)} file(s) to {SUPABASE_URL}")
    print(f"Using key: {'SERVICE_ROLE' if API_KEY != ANON_KEY else 'ANON'}")
    print(f"Force re-upload: {force}\n")

    for commentator, sefer_id, path in tasks:
        upload_file(commentator, sefer_id, path, force=force)
        time.sleep(0.3)

    print(f"\n{'='*60}")
    print("All done!")


if __name__ == "__main__":
    main()

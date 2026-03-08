"""
upload_tehillim_db.py
Uploads all 150 Psalm chapters from src/data/tehillim.json to Supabase 'tehillim' table.
Uses UPSERT on chapter - safe to re-run.

Usage:
    .venv-1/Scripts/python.exe scripts/upload_tehillim_db.py

Requirements (already in .venv-1): pip install requests
"""
import json
import os
import requests
import sys
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

TEHILLIM_PATH = Path(__file__).parent.parent / "src" / "data" / "tehillim.json"


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not TEHILLIM_PATH.exists():
        print(f"✗ File not found: {TEHILLIM_PATH}")
        print("  Run: .venv-1\\Scripts\\python.exe scripts\\download_tehillim.py")
        sys.exit(1)

    print("Tehillim Upload")
    print("=" * 50)

    with open(TEHILLIM_PATH, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for ch_str, ch_data in data.items():
        rows.append({
            "chapter": int(ch_str),
            "title":   ch_data.get("title", f"תהלים פרק {ch_str}"),
            "lines":   ch_data.get("lines", []),
        })

    rows.sort(key=lambda r: r["chapter"])
    print(f"  Uploading {len(rows)} chapters ...")

    url = f"{SUPABASE_URL}/rest/v1/tehillim"
    r = requests.post(url, headers=HEADERS, json=rows, timeout=120)
    if r.status_code not in (200, 201):
        print(f"✗ Insert error {r.status_code}: {r.text[:400]}")
        sys.exit(1)

    print(f"✓ Done: {len(rows)} chapters uploaded to Supabase.")


if __name__ == "__main__":
    main()

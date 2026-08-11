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
import subprocess
import sys
import time
from pathlib import Path

try:
    import requests  # type: ignore
except ModuleNotFoundError:
    requests = None
    from urllib.error import HTTPError
    from urllib.request import Request, urlopen

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

class SimpleResponse:
    """Minimal requests-compatible response for the standard-library path."""

    def __init__(self, status_code: int, body: bytes, headers):
        self.status_code = status_code
        self.text = body.decode("utf-8", errors="replace")
        self.headers = headers


def http_request(method: str, url: str, *, headers: dict, payload=None, timeout: int = 60):
    if requests is not None:
        if method == "GET":
            return requests.get(url, headers=headers, timeout=timeout)
        return requests.post(url, headers=headers, json=payload, timeout=timeout)

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            return SimpleResponse(response.status, response.read(), response.headers)
    except HTTPError as error:
        return SimpleResponse(error.code, error.read(), error.headers)


def read_env_value(name: str) -> str:
    value = os.environ.get(name, "")
    if value:
        return value
    for filename in (".env.migrations.local", ".env"):
        path = Path(__file__).parent.parent / filename
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    if os.name == "nt":
        try:
            result = subprocess.run(
                ["reg.exe", "query", r"HKCU\Environment", "/v", name],
                capture_output=True,
                text=True,
                timeout=10,
                check=True,
            )
            match = __import__("re").search(rf"{name}\s+REG_(?:SZ|EXPAND_SZ)\s+(.+)$", result.stdout, __import__("re").MULTILINE)
            if match:
                return match.group(1).strip()
        except (OSError, subprocess.SubprocessError):
            pass
    return ""


def authenticate_admin_for_upload() -> bool:
    """Use the configured migration admin instead of permitting public writes."""
    if API_KEY != ANON_KEY:
        return True
    email = read_env_value("MIGRATION_ADMIN_EMAIL")
    password = read_env_value("MIGRATION_ADMIN_PASSWORD")
    if not email or not password:
        print("  ✗ Migration admin credentials are not configured.")
        return False
    response = http_request(
        "POST",
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        payload={"email": email, "password": password},
        timeout=30,
    )
    try:
        access_token = json.loads(response.text).get("access_token", "")
    except json.JSONDecodeError:
        access_token = ""
    if response.status_code != 200 or not access_token:
        print(f"  ✗ Admin login failed (HTTP {response.status_code}).")
        return False
    HEADERS["Authorization"] = f"Bearer {access_token}"
    print(f"  ✓ Authenticated upload administrator: {email}")
    return True


def insert_batch(rows: list[dict]) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/siddur?on_conflict=nusach,category,section_idx"
    r = http_request("POST", url, headers=HEADERS, payload=rows, timeout=60)
    if r.status_code not in (200, 201):
        print(f"    ✗ Insert error {r.status_code}: {r.text[:300]}")
        return False
    return True


def count_existing(nusach: str) -> int:
    url = f"{SUPABASE_URL}/rest/v1/siddur?nusach=eq.{nusach}&select=id"
    h = dict(HEADERS)
    h["Prefer"] = "count=exact"
    r = http_request("GET", url, headers=h, timeout=30)
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
    if not authenticate_admin_for_upload():
        sys.exit(1)
    for nusach in nusachim_to_upload:
        if nusach not in NUSACHIM:
            print(f"Unknown nusach: {nusach}. Valid: {NUSACHIM}")
            continue
        upload_nusach(nusach, force=force)

    print("\n✓ Upload complete.")
    print("Now you can remove the large JSON files from the bundle if desired.")


if __name__ == "__main__":
    main()

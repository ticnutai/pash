"""
Run a SQL migration file against Supabase using the exec_sql RPC.
Usage: python scripts/run_migration.py <path-to-sql-file>
"""
import requests
import sys
from pathlib import Path

URL = "https://mocukhvfqqzkekphifsr.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY3VraHZmcXF6a2VrcGhpZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODQ5MDgsImV4cCI6MjA4MDE2MDkwOH0"
    ".7whrGNQK4_ByacsLF4qWn3lObBL9bQyhy1vk6C4KxQw"
)

def login():
    r = requests.post(
        f"{URL}/auth/v1/token?grant_type=password",
        json={"email": "jj1212t@gmail.com", "password": "543211"},
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        timeout=15,
    )
    if r.status_code != 200:
        print(f"❌ Login failed: {r.text[:300]}")
        sys.exit(1)
    data = r.json()
    print(f"✅ Logged in as: {data['user']['email']}")
    return data["access_token"]

def run_sql(token: str, sql: str):
    r = requests.post(
        f"{URL}/rest/v1/rpc/exec_sql",
        json={"query": sql},
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=60,
    )
    return r.status_code, r.text

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/run_migration.py <sql-file>")
        sys.exit(1)

    sql_path = Path(sys.argv[1])
    if not sql_path.exists():
        print(f"❌ File not found: {sql_path}")
        sys.exit(1)

    sql = sql_path.read_text(encoding="utf-8")
    print(f"📄 Migration file: {sql_path.name}")
    print(f"📏 SQL size: {len(sql)} chars")
    print()

    print("══════════════════════════════════════════════════")
    print("   🔧 Migration Runner")
    print("══════════════════════════════════════════════════")

    token = login()
    print()
    print(f"🚀 Running migration: {sql_path.stem}")
    print("──────────────────────────────────────────────────")

    status, text = run_sql(token, sql)

    if status == 200:
        print("✅ Migration completed successfully!")
    else:
        print(f"❌ Migration failed (HTTP {status})")
        print(f"   {text[:500]}")
        sys.exit(1)

    print()
    print("🏁 Done!")

if __name__ == "__main__":
    main()

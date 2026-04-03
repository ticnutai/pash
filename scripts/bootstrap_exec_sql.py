"""
Apply exec_sql function to Supabase using pg-meta API.
This bootstraps the exec_sql function so the in-app migration runner works.
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

SERVICE_KEY = None  # Will try env var
import os
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Read the SQL migration
sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260309000000_exec_sql_function.sql"
sql = sql_path.read_text(encoding="utf-8")
# Strip comment-only lines for cleaner execution
lines = [l for l in sql.splitlines() if not l.strip().startswith("--")]
# Actually, keep as-is — Postgres handles comments fine

print("=== Bootstrap exec_sql function ===")
print()

# Method 1: Try service_role key if available
if SERVICE_KEY:
    print("Trying service_role key approach...")
    # With service_role, we can use pg-meta or just run via RPC
    # But exec_sql doesn't exist yet, so we need another way
    # Try the Supabase Management API /query endpoint
    pass

# Method 2: Try Supabase CLI local approach
# Method 3: Try direct psycopg2 connection
db_password = os.environ.get("SUPABASE_DB_PASSWORD", "")
if db_password:
    print("Trying direct database connection...")
    try:
        import psycopg2
        conn_str = f"postgresql://postgres.mocukhvfqqzkekphifsr:{db_password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        conn = psycopg2.connect(conn_str, connect_timeout=15)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        print("SUCCESS — exec_sql function created via direct DB connection!")
        sys.exit(0)
    except Exception as e:
        print(f"Direct DB failed: {e}")

# Method 4: Try Supabase Management API with access token
access_token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
if access_token:
    print("Trying Management API...")
    r = requests.post(
        "https://api.supabase.com/v1/projects/mocukhvfqqzkekphifsr/database/query",
        json={"query": sql},
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    if r.status_code in (200, 201):
        print("SUCCESS — exec_sql function created via Management API!")
        sys.exit(0)
    else:
        print(f"Management API failed ({r.status_code}): {r.text[:300]}")

print()
print("=" * 60)
print("Could not auto-apply. Please do ONE of:")
print()
print("Option A: Set SUPABASE_DB_PASSWORD and re-run:")
print('  $env:SUPABASE_DB_PASSWORD="your-db-password"')
print("  .venv-1\\Scripts\\python.exe scripts\\bootstrap_exec_sql.py")
print()
print("Option B: Set SUPABASE_ACCESS_TOKEN and re-run:")
print('  $env:SUPABASE_ACCESS_TOKEN="sbp_..."')
print("  .venv-1\\Scripts\\python.exe scripts\\bootstrap_exec_sql.py")
print()
print("Option C: Paste SQL manually in Supabase SQL Editor:")
print("  https://supabase.com/dashboard/project/mocukhvfqqzkekphifsr/sql/new")
print()
print("The SQL to paste:")
print("-" * 60)
print(sql)
print("-" * 60)

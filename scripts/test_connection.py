"""Quick test: authenticate to Supabase and check exec_sql function."""
import requests
import json
import sys

URL = "https://mocukhvfqqzkekphifsr.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY3VraHZmcXF6a2VrcGhpZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODQ5MDgsImV4cCI6MjA4MDE2MDkwOH0"
    ".7whrGNQK4_ByacsLF4qWn3lObBL9bQyhy1vk6C4KxQw"
)

# Step 1: Login
print("=== Step 1: Login ===")
r = requests.post(
    f"{URL}/auth/v1/token?grant_type=password",
    json={"email": "jj1212t@gmail.com", "password": "543211"},
    headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
    timeout=15,
)
print(f"Status: {r.status_code}")
if r.status_code != 200:
    print(f"Login failed: {r.text[:300]}")
    sys.exit(1)

data = r.json()
token = data.get("access_token", "")
email = data.get("user", {}).get("email", "?")
print(f"Login OK - user: {email}")
print(f"Token: {token[:30]}...")

# Step 2: Test exec_sql
print()
print("=== Step 2: Test exec_sql RPC ===")
r2 = requests.post(
    f"{URL}/rest/v1/rpc/exec_sql",
    json={"query": "SELECT 1"},
    headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    timeout=15,
)
print(f"Status: {r2.status_code}")
print(f"Response: {r2.text[:500]}")

if r2.status_code == 200:
    print()
    print("=== SUCCESS - exec_sql is working! ===")
else:
    print()
    print("=== exec_sql not available yet ===")

print("DONE")

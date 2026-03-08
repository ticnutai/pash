"""
apply_siddur_migration.py
Creates the `siddur` and `tehillim` tables in Supabase.

Same auth options as apply_migration.py:

  Option A (personal access token):
    $env:SUPABASE_ACCESS_TOKEN='sbp_...'
    .venv-1/Scripts/python.exe scripts/apply_siddur_migration.py

  Option B (database password):
    $env:SUPABASE_DB_PASSWORD='your-password'
    .venv-1/Scripts/python.exe scripts/apply_siddur_migration.py

  Option C (full postgres URL):
    $env:DATABASE_URL='postgresql://...'
    .venv-1/Scripts/python.exe scripts/apply_siddur_migration.py

  Option D (manual - Supabase SQL editor):
    https://supabase.com/dashboard/project/mocukhvfqqzkekphifsr/sql/new
"""
import os
import sys
import requests
from pathlib import Path

SUPABASE_PROJECT_REF = "mocukhvfqqzkekphifsr"

MIGRATION_SQL = """
-- ── siddur table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.siddur (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nusach      text    NOT NULL,      -- sefard | ashkenaz | edot_hamizrach | chabad
  category    text    NOT NULL,      -- shacharit | mincha | ...
  cat_name    text    NOT NULL,      -- Hebrew display name
  section_idx integer NOT NULL,      -- ordering within category
  title       text    NOT NULL,      -- section title
  lines       jsonb   NOT NULL,      -- array of text lines
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT siddur_unique UNIQUE (nusach, category, section_idx)
);

CREATE INDEX IF NOT EXISTS idx_siddur_lookup
  ON public.siddur (nusach, category, section_idx);

CREATE INDEX IF NOT EXISTS idx_siddur_nusach_cat
  ON public.siddur (nusach, category);

ALTER TABLE public.siddur ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='siddur' AND policyname='siddur_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY siddur_public_read ON public.siddur FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='siddur' AND policyname='siddur_public_insert'
  ) THEN
    EXECUTE 'CREATE POLICY siddur_public_insert ON public.siddur FOR INSERT WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='siddur' AND policyname='siddur_public_update'
  ) THEN
    EXECUTE 'CREATE POLICY siddur_public_update ON public.siddur FOR UPDATE USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='siddur' AND policyname='siddur_public_delete'
  ) THEN
    EXECUTE 'CREATE POLICY siddur_public_delete ON public.siddur FOR DELETE USING (true)';
  END IF;
END $$;

-- ── tehillim table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tehillim (
  chapter    integer PRIMARY KEY,
  title      text    NOT NULL,
  lines      jsonb   NOT NULL,    -- array of verse strings
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tehillim ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tehillim' AND policyname='tehillim_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY tehillim_public_read ON public.tehillim FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tehillim' AND policyname='tehillim_public_insert'
  ) THEN
    EXECUTE 'CREATE POLICY tehillim_public_insert ON public.tehillim FOR INSERT WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tehillim' AND policyname='tehillim_public_update'
  ) THEN
    EXECUTE 'CREATE POLICY tehillim_public_update ON public.tehillim FOR UPDATE USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tehillim' AND policyname='tehillim_public_delete'
  ) THEN
    EXECUTE 'CREATE POLICY tehillim_public_delete ON public.tehillim FOR DELETE USING (true)';
  END IF;
END $$;
"""


def get_access_token() -> str | None:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if token:
        return token
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("SUPABASE_ACCESS_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def apply_via_management_api(access_token: str) -> bool:
    url = f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/database/query"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    print("Applying migration via Management API ...")
    try:
        r = requests.post(url, json={"query": MIGRATION_SQL}, headers=headers, timeout=30)
        if r.status_code in (200, 201):
            print("✓ Migration applied successfully via Management API!")
            return True
        else:
            print(f"✗ Management API returned {r.status_code}: {r.text[:300]}")
            return False
    except Exception as e:
        print(f"✗ Management API error: {e}")
        return False


def get_db_url() -> str | None:
    url = os.environ.get("DATABASE_URL", "")
    if url:
        return url
    password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    if password:
        return (
            f"postgresql://postgres.{SUPABASE_PROJECT_REF}:{password}"
            f"@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        )
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("SUPABASE_DB_PASSWORD="):
                password = line.split("=", 1)[1].strip().strip('"').strip("'")
                return (
                    f"postgresql://postgres.{SUPABASE_PROJECT_REF}:{password}"
                    f"@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
                )
    return None


def main():
    print("=" * 60)
    print("Siddur + Tehillim Migration")
    print("=" * 60)

    access_token = get_access_token()
    if access_token:
        if apply_via_management_api(access_token):
            print()
            print("Next steps — upload data:")
            print("  .venv-1\\Scripts\\python.exe scripts\\upload_siddur.py")
            print("  .venv-1\\Scripts\\python.exe scripts\\upload_tehillim_db.py")
            return
        print("Management API failed. Falling back to psycopg2 ...")

    db_url = get_db_url()
    if not db_url:
        print("ERROR: No credentials found.")
        print()
        print("Option A — personal access token:")
        print("  $env:SUPABASE_ACCESS_TOKEN='sbp_...'")
        print("  .venv-1\\Scripts\\python.exe scripts\\apply_siddur_migration.py")
        print()
        print("Option B — DB password:")
        print("  $env:SUPABASE_DB_PASSWORD='your-password'")
        print("  .venv-1\\Scripts\\python.exe scripts\\apply_siddur_migration.py")
        print()
        print("Option C — paste SQL manually:")
        print(f"  https://supabase.com/dashboard/project/{SUPABASE_PROJECT_REF}/sql/new")
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print("psycopg2 not found. Install with: pip install psycopg2-binary")
        sys.exit(1)

    print(f"Connecting to Supabase ...")
    try:
        conn = psycopg2.connect(db_url, connect_timeout=30)
        conn.autocommit = True
        cursor = conn.cursor()
        print("Connected! Applying migration ...")
        cursor.execute(MIGRATION_SQL)
        cursor.close()
        conn.close()
        print("✓ Migration applied successfully!")
        print()
        print("Next steps — upload data:")
        print("  .venv-1\\Scripts\\python.exe scripts\\upload_siddur.py")
        print("  .venv-1\\Scripts\\python.exe scripts\\upload_tehillim_db.py")
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

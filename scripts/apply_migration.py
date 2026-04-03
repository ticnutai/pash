"""
apply_migration.py
Applies the commentaries + rashi_commentary table migrations to Supabase.
Also locks down RLS policies (public read only, writes require service_role).

Tries multiple auth methods in order:
  1. SUPABASE_ACCESS_TOKEN env var  - uses Management API (easiest)
  2. DATABASE_URL env var           - connects via psycopg2
  3. SUPABASE_DB_PASSWORD env var   - builds DATABASE_URL then psycopg2
  4. Same credentials read from .env file

Usage - pick ONE option:

  Option A (personal access token - get from supabase.com/dashboard/account/tokens):
    $env:SUPABASE_ACCESS_TOKEN='sbp_...'
    .venv-1/Scripts/python.exe scripts/apply_migration.py

  Option B (database password - get from dashboard > project > settings > database):
    $env:SUPABASE_DB_PASSWORD='your-password'
    .venv-1/Scripts/python.exe scripts/apply_migration.py

  Option C (full postgres URL):
    $env:DATABASE_URL='postgresql://postgres.mocukhvfqqzkekphifsr:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
    .venv-1/Scripts/python.exe scripts/apply_migration.py

  Option D (manual - paste SQL in Supabase dashboard):
    https://supabase.com/dashboard/project/mocukhvfqqzkekphifsr/sql/new
    Then run: .venv-1/Scripts/python.exe scripts/upload_commentaries.py

Requirements: pip install requests psycopg2-binary  (both already in .venv-1)
"""
import os
import sys
import requests
from pathlib import Path

SUPABASE_PROJECT_REF = "mocukhvfqqzkekphifsr"

MIGRATION_SQL = """
-- ═══════════════════════════════════════════════════════════
-- 1. COMMENTARIES TABLE (unified, all mefarshim)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.commentaries (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  commentator  text    NOT NULL,
  sefer_id     integer NOT NULL,
  perek        integer NOT NULL,
  pasuk        integer NOT NULL,
  text         text    NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT commentaries_unique UNIQUE (commentator, sefer_id, perek, pasuk)
);

CREATE INDEX IF NOT EXISTS idx_commentaries_lookup
  ON public.commentaries (commentator, sefer_id, perek, pasuk);

CREATE INDEX IF NOT EXISTS idx_commentaries_chapter
  ON public.commentaries (commentator, sefer_id, perek);

ALTER TABLE public.commentaries ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist (security fix)
DROP POLICY IF EXISTS commentaries_public_insert ON public.commentaries;
DROP POLICY IF EXISTS commentaries_public_delete ON public.commentaries;
DROP POLICY IF EXISTS commentaries_public_update ON public.commentaries;

-- Create correct policies (read = public, writes = service_role only)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='commentaries' AND policyname='commentaries_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY commentaries_public_read ON public.commentaries FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='commentaries' AND policyname='commentaries_service_insert'
  ) THEN
    EXECUTE 'CREATE POLICY commentaries_service_insert ON public.commentaries FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='commentaries' AND policyname='commentaries_service_delete'
  ) THEN
    EXECUTE 'CREATE POLICY commentaries_service_delete ON public.commentaries FOR DELETE USING (auth.role() = ''service_role'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='commentaries' AND policyname='commentaries_service_update'
  ) THEN
    EXECUTE 'CREATE POLICY commentaries_service_update ON public.commentaries FOR UPDATE USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 2. RASHI_COMMENTARY TABLE (legacy, kept for backward compat)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rashi_commentary (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sefer_id   integer NOT NULL,
  perek      integer NOT NULL,
  pasuk      integer NOT NULL,
  text       text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add UNIQUE constraint if missing (prevents duplicate rows on re-upload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rashi_unique'
  ) THEN
    -- Remove any duplicate rows first (keep the newest)
    DELETE FROM public.rashi_commentary a USING public.rashi_commentary b
      WHERE a.sefer_id = b.sefer_id AND a.perek = b.perek AND a.pasuk = b.pasuk
        AND a.created_at < b.created_at;
    ALTER TABLE public.rashi_commentary ADD CONSTRAINT rashi_unique UNIQUE (sefer_id, perek, pasuk);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rashi_sefer_perek_pasuk
  ON public.rashi_commentary (sefer_id, perek, pasuk);

ALTER TABLE public.rashi_commentary ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist (security fix)
DROP POLICY IF EXISTS "Allow public insert of rashi" ON public.rashi_commentary;
DROP POLICY IF EXISTS "Allow public delete of rashi" ON public.rashi_commentary;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='rashi_commentary' AND policyname='Allow public read of rashi'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read of rashi" ON public.rashi_commentary FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='rashi_commentary' AND policyname='rashi_service_insert'
  ) THEN
    EXECUTE 'CREATE POLICY rashi_service_insert ON public.rashi_commentary FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='rashi_commentary' AND policyname='rashi_service_delete'
  ) THEN
    EXECUTE 'CREATE POLICY rashi_service_delete ON public.rashi_commentary FOR DELETE USING (auth.role() = ''service_role'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='rashi_commentary' AND policyname='rashi_service_update'
  ) THEN
    EXECUTE 'CREATE POLICY rashi_service_update ON public.rashi_commentary FOR UPDATE USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 3. EXEC_SQL FUNCTION (dev tool — run migrations from the app)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  t_start      timestamptz;
  t_end        timestamptz;
  row_count    bigint;
  stmt_type    text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF caller_email IS NULL OR caller_email NOT IN ('jj1212t@gmail.com') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  stmt_type := upper(split_part(ltrim(regexp_replace(query, '/\\*.*?\\*/', '', 'g')), ' ', 1));

  t_start := clock_timestamp();
  EXECUTE query;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  t_end := clock_timestamp();

  RETURN json_build_object(
    'success', true,
    'rows_affected', row_count,
    'duration_ms', round(extract(epoch from (t_end - t_start)) * 1000),
    'statement_type', stmt_type
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE,
      'hint', concat('Statement type: ', upper(split_part(ltrim(query), ' ', 1)))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
"""


def get_access_token() -> str | None:
    """Look for a Supabase personal access token."""
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
    """Apply migration using Supabase Management API (needs personal access token)."""
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
    """Try to find database connection URL from environment or .env file."""
    url = os.environ.get("DATABASE_URL", "")
    if url:
        return url

    # 2. Build from SUPABASE_DB_PASSWORD
    password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    if password:
        # Supabase transaction pooler (IPv6 compatible, use port 6543)
        return (
            f"postgresql://postgres.{SUPABASE_PROJECT_REF}:{password}"
            f"@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        )

    # 3. Try .env file
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
    # Try option 1: Personal access token → Management API
    access_token = get_access_token()
    if access_token:
        if apply_via_management_api(access_token):
            print()
            print("Next step — upload the commentary data:")
            print("  .venv-1\\Scripts\\python.exe scripts\\upload_commentaries.py")
            return
        print("Management API failed. Falling back to psycopg2 ...")

    # Try option 2: Direct postgres connection
    db_url = get_db_url()

    if not db_url:
        print("=" * 60)
        print("ERROR: No database credentials found.")
        print()
        print("To apply the migration, pick ONE of these options:")
        print()
        print("Option A — personal access token (supabase.com/dashboard/account/tokens):")
        print("  $env:SUPABASE_ACCESS_TOKEN='sbp_...'")
        print("  .venv-1\\Scripts\\python.exe scripts\\apply_migration.py")
        print()
        print("Option B — database password (dashboard > project > settings > database):")
        print("  $env:SUPABASE_DB_PASSWORD='your-password'")
        print("  .venv-1\\Scripts\\python.exe scripts\\apply_migration.py")
        print()
        print("Option C — paste SQL manually in Supabase SQL Editor:")
        print(f"  https://supabase.com/dashboard/project/{SUPABASE_PROJECT_REF}/sql/new")
        print("  (paste: supabase/migrations/20260308000000_commentaries_unified.sql)")
        print("  then run: .venv-1\\Scripts\\python.exe scripts\\upload_commentaries.py")
        print("=" * 60)
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print("psycopg2 not found. Install with: pip install psycopg2-binary")
        sys.exit(1)

    print(f"Connecting to Supabase (project: {SUPABASE_PROJECT_REF}) ...")
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
        print("Next step — upload the commentary data:")
        print("  .venv-1\\Scripts\\python.exe scripts\\upload_commentaries.py")
    except psycopg2.OperationalError as e:
        print(f"✗ Connection failed: {e}")
        print()
        print("If the connection failed, try applying manually via the Supabase SQL Editor:")
        print("  https://supabase.com/dashboard/project/mocukhvfqqzkekphifsr/sql/new")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

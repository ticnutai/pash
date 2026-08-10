-- Portable Supabase migration runner bootstrap.
-- Run this file ONCE in the Supabase SQL Editor of each project.
-- The authorized email must already exist in Authentication > Users.
-- Never store the user's password in SQL.

CREATE TABLE IF NOT EXISTS public.migration_runner_admins (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_runner_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.migration_runner_admins FROM PUBLIC, anon, authenticated;

INSERT INTO public.migration_runner_admins (email)
VALUES (lower('jj1212t@gmail.com'))
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.migration_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  sql_content text,
  executed_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error text,
  executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.migration_logs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_migration_runner_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS u
    JOIN public.migration_runner_admins AS a
      ON a.email = lower(u.email)
    WHERE u.id = auth.uid()
  );
$function$;

REVOKE ALL ON FUNCTION public.is_migration_runner_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_migration_runner_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.execute_safe_migration(
  p_migration_name text,
  p_migration_sql text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_clean_sql text;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_migration_runner_admin() THEN
    RAISE EXCEPTION 'Migration runner admin access required';
  END IF;

  IF coalesce(btrim(p_migration_name), '') = '' THEN
    RAISE EXCEPTION 'Migration name is required';
  END IF;

  IF coalesce(btrim(p_migration_sql), '') = '' THEN
    RAISE EXCEPTION 'Migration SQL is required';
  END IF;

  -- The outer RPC call already runs transactionally. Strip standalone wrappers
  -- so migration files copied from other tools can still be executed.
  v_clean_sql := regexp_replace(
    p_migration_sql,
    '^\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\s*;\s*$',
    '',
    'gim'
  );

  -- Deliberately unrestricted DDL/DML execution. Access is restricted above
  -- to the allow-listed, authenticated migration administrator.
  EXECUTE v_clean_sql;

  INSERT INTO public.migration_logs
    (name, sql_content, success, executed_by)
  VALUES
    (p_migration_name, p_migration_sql, true, v_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'name', p_migration_name,
    'executed_by', v_user_id
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.migration_logs
    (name, sql_content, success, error, executed_by)
  VALUES
    (p_migration_name, p_migration_sql, false, SQLERRM, v_user_id);

  RETURN jsonb_build_object(
    'success', false,
    'name', p_migration_name,
    'error', SQLERRM
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.execute_safe_migration(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_safe_migration(text, text)
  TO authenticated;

DROP FUNCTION IF EXISTS public.get_migration_history();

CREATE OR REPLACE FUNCTION public.get_migration_history()
RETURNS TABLE (
  id text,
  name text,
  executed_at timestamptz,
  success boolean,
  error text,
  executed_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_migration_runner_admin() THEN
    RAISE EXCEPTION 'Migration runner admin access required';
  END IF;

  RETURN QUERY
  SELECT
    ml.id::text,
    ml.name,
    ml.executed_at,
    ml.success,
    ml.error,
    ml.executed_by
  FROM public.migration_logs AS ml
  ORDER BY ml.executed_at DESC
  LIMIT 200;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_migration_history()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_migration_history()
  TO authenticated;

COMMENT ON FUNCTION public.execute_safe_migration(text, text) IS
  'Runs unrestricted project migrations for allow-listed authenticated admins.';

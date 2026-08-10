CREATE TABLE IF NOT EXISTS public.migration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sql_content text,
  executed_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error text,
  executed_by uuid REFERENCES auth.users

ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.migration_logs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.execute_safe_migration(
  p_migration_name text,
  p_migration_sql text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_sql text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_uid IS NULL OR v_email IS DISTINCT FROM 'jj1212t@gmail.com' THEN
    RAISE EXCEPTION 'Migration admin access required';
  END IF;
  IF coalesce(btrim(p_migration_name), '') = '' OR
     coalesce(btrim(p_migration_sql), '') = '' THEN
    RAISE EXCEPTION 'Migration name and SQL are required';
  END IF;
  v_sql := regexp_replace(
    p_migration_sql,
    '^\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\s*;\s*$',
    '',
    'gim'
  );
  EXECUTE v_sql;
  INSERT INTO public.migration_logs
    (name, sql_content, success, executed_by)
  VALUES (p_migration_name, p_migration_sql, true, v_uid);
  RETURN jsonb_build_object('success', true, 'name', p_migration_name);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.migration_logs
    (name, sql_content, success, error, executed_by)
  VALUES (p_migration_name, p_migration_sql, false, SQLERRM, v_uid);
  RETURN jsonb_build_object(
    'success', false,
    'name', p_migration_name,
    'error', SQLERRM
  );
END;
$$;

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
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS DISTINCT FROM 'jj1212t@gmail.com' THEN
    RAISE EXCEPTION 'Migration admin access required';
  END IF;
  RETURN QUERY
  SELECT
    ml.id::text,
    ml.name,
    ml.executed_at,
    ml.success,
    ml.error
  FROM public.migration_logs ml
  ORDER BY ml.executed_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.get_migration_history()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_migration_history()
TO authenticated;

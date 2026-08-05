CREATE TABLE IF NOT EXISTS public.migration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sql_content text,
  executed_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error text,
  executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view migration logs" ON public.migration_logs;
CREATE POLICY "Admins can view migration logs"
  ON public.migration_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.migration_logs FROM anon;
GRANT SELECT ON TABLE public.migration_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.execute_safe_migration(
  p_migration_name text,
  p_migration_sql text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_clean_sql text;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_clean_sql := regexp_replace(
    p_migration_sql,
    '^\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\s*;\s*$',
    '',
    'gim'
  );
  EXECUTE v_clean_sql;

  INSERT INTO public.migration_logs (name, sql_content, success, executed_by)
  VALUES (p_migration_name, p_migration_sql, true, v_user_id);

  RETURN jsonb_build_object('success', true, 'name', p_migration_name);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.migration_logs (name, sql_content, success, error, executed_by)
  VALUES (p_migration_name, p_migration_sql, false, SQLERRM, v_user_id);
  RETURN jsonb_build_object('success', false, 'name', p_migration_name, 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.execute_safe_migration(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_safe_migration(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_migration_history()
RETURNS TABLE (id uuid, name text, executed_at timestamptz, success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT ml.id, ml.name, ml.executed_at, ml.success, ml.error
  FROM public.migration_logs ml
  ORDER BY ml.executed_at DESC
  LIMIT 100;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_migration_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_migration_history() TO authenticated;


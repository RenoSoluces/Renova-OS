DO $migration$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = ANY (ARRAY[
          'prospects','dossiers','devis','devis_aides','devis_lignes',
          'interactions','simulations','tasks','visites','notifications'
        ])
        AND policyname ~ '^(authenticated|anon)_(select|insert|update|delete)_')
        OR (tablename = 'planning_events' AND policyname ~ '^(authenticated|anon)_')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END
$migration$;

CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles actor
       WHERE actor.id = (SELECT auth.uid())
         AND actor.role IN ('admin', 'manager')
     )
  THEN
    RAISE EXCEPTION 'Seuls les administrateurs et managers peuvent modifier un rôle.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profile_role_change ON public.profiles;
CREATE TRIGGER guard_profile_role_change
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role_change();

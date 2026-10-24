-- Supabase Edge Functions using the service role have no auth.uid(). Permit trusted
-- service-role profile assignment while preserving checks for authenticated clients.
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
     AND NEW.role IS DISTINCT FROM OLD.role
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

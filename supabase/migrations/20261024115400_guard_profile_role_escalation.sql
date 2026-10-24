-- Managers may adjust staff roles, but must never grant administrative or
-- managerial privileges. Service-role invitation flows have no auth.uid() and
-- remain trusted to apply the validated role server-side.
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor_role text;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  SELECT actor.role
  INTO actor_role
  FROM public.profiles actor
  WHERE actor.id = (SELECT auth.uid());

  IF actor_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF actor_role = 'manager'
     AND NEW.role IN ('commercial', 'apporteur', 'teleconseiller')
     AND OLD.role NOT IN ('admin', 'manager', 'partner_admin', 'company_admin', 'commercial_manager')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Vous ne pouvez pas attribuer ce rôle.'
    USING ERRCODE = '42501';
END;
$function$;

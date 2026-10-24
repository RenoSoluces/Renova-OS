-- Follow-up hardening for profile directory RLS.
-- The profile SELECT policy must not query public.profiles directly, or Postgres
-- recursively evaluates the same policy. Use SECURITY DEFINER helper functions.
DROP POLICY IF EXISTS organisations_select_scoped ON public.organisations;

DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles
FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR public.is_super_admin()
  OR public.can_manage_profile(id)
);

DROP POLICY IF EXISTS profiles_update_objectifs_admin ON public.profiles;
CREATE POLICY profiles_update_objectifs_admin ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_super_admin() OR public.can_manage_profile(id))
WITH CHECK (public.is_super_admin() OR public.can_manage_profile(id));

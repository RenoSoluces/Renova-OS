DROP POLICY IF EXISTS profiles_select_team ON public.profiles;
CREATE POLICY profiles_select_scoped
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_admin_ou_manager());

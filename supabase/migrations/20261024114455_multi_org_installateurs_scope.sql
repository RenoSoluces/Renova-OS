-- The installer directory is internal to Reno Soluces for now. Partner accounts
-- must not be able to enumerate internal installer contacts until installers have
-- their own organisation_id and partner-specific management workflow.
DROP POLICY IF EXISTS installateurs_select ON public.installateurs;
CREATE POLICY installateurs_select ON public.installateurs
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.organisations org ON org.id = me.organisation_id
    WHERE me.id = (SELECT auth.uid())
      AND me.role IN ('manager', 'commercial_manager')
      AND org.type = 'interne'
  )
);

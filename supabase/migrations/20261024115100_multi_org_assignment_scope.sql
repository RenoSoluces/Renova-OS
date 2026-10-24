-- Do not let a manager reassign a prospect to a profile in another organisation.
DROP POLICY IF EXISTS prospects_update_scope ON public.prospects;
CREATE POLICY prospects_update_scope ON public.prospects
FOR UPDATE TO authenticated
USING (public.prospect_visible(id))
WITH CHECK (
  public.is_super_admin()
  OR (
    commercial_id = (SELECT auth.uid())
    AND prospects.organisation_id = public.current_organisation_id()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles assigned
    WHERE assigned.id = prospects.commercial_id
      AND assigned.manager_id = (SELECT auth.uid())
      AND assigned.organisation_id = prospects.organisation_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = (SELECT auth.uid())
      AND me.role IN ('partner_admin', 'company_admin')
      AND me.organisation_id = prospects.organisation_id
  )
  OR EXISTS (
    SELECT 1 FROM public.prospect_shares s
    WHERE s.prospect_id = prospects.id
      AND s.organisation_id = public.current_organisation_id()
  )
);

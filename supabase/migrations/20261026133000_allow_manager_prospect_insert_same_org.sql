-- Allow managers to create prospects assigned within their own organisation.
-- Keep the organisation boundary enforced by both the creator and assigned profile.
ALTER POLICY prospects_insert_scope ON public.prospects
WITH CHECK (
  is_super_admin()
  OR (
    commercial_id = (SELECT auth.uid())
    AND organisation_id = current_organisation_id()
  )
  OR (
    commercial_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles me
      JOIN public.profiles assigned ON assigned.id = prospects.commercial_id
      WHERE me.id = (SELECT auth.uid())
        AND me.role = ANY (ARRAY['manager'::text, 'partner_admin'::text, 'company_admin'::text])
        AND assigned.organisation_id = me.organisation_id
        AND prospects.organisation_id = me.organisation_id
    )
  )
);

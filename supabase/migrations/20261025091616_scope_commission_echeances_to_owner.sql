-- Commercial users may read only their own commercial commission schedules.
-- Company schedules remain limited to administrators/managers.
DROP POLICY IF EXISTS commission_echeances_select_scope ON public.commission_echeances;
CREATE POLICY commission_echeances_select_scope
ON public.commission_echeances
FOR SELECT TO authenticated
USING (
  public.is_admin_ou_manager()
  OR (
    beneficiaire = 'commercial'
    AND EXISTS (
      SELECT 1
      FROM public.commissions c
      WHERE c.id = commission_echeances.commission_id
        AND c.commercial_id = (SELECT auth.uid())
    )
  )
);

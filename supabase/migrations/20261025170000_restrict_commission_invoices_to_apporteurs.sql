DROP POLICY IF EXISTS commission_factures_insert_owner ON public.commission_factures;
CREATE POLICY commission_factures_insert_apporteur_only
ON public.commission_factures FOR INSERT TO authenticated
WITH CHECK (
  commercial_id = (SELECT auth.uid())
  AND organisation_id = public.current_organisation_id()
  AND statut = 'a_preparer'
  AND EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = (SELECT auth.uid())
      AND me.role = 'apporteur'
      AND me.organisation_id = commission_factures.organisation_id
  )
  AND EXISTS (
    SELECT 1 FROM public.commissions c
    WHERE c.id = commission_factures.commission_id
      AND c.commercial_id = (SELECT auth.uid())
      AND c.organisation_id = commission_factures.organisation_id
      AND c.statut <> 'annulee'
      AND c.montant_commercial = commission_factures.montant_ht
  )
);

CREATE OR REPLACE FUNCTION public.soumettre_facture_commission(p_facture_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'apporteur'
      AND p.organisation_id = public.current_organisation_id()
  ) THEN
    RAISE EXCEPTION 'Seuls les apporteurs d’affaires peuvent soumettre une facture de commission';
  END IF;

  UPDATE public.commission_factures f
     SET statut = 'deposee',
         motif_refus = NULL,
         date_validation = NULL,
         validee_par = NULL,
         updated_at = now()
   WHERE f.id = p_facture_id
     AND f.commercial_id = auth.uid()
     AND f.organisation_id = public.current_organisation_id()
     AND f.statut IN ('a_preparer', 'refusee');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable ou non soumissible';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.soumettre_facture_commission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soumettre_facture_commission(uuid) TO authenticated;
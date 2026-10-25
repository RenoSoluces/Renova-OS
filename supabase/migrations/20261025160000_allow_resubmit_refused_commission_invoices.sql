CREATE OR REPLACE FUNCTION public.soumettre_facture_commission(p_facture_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

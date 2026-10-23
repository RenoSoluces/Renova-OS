CREATE OR REPLACE FUNCTION public.commission_societe_admin_fields(p_commission_id uuid)
RETURNS TABLE (montant_societe numeric, date_paiement_societe timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin_ou_manager() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.montant_societe, c.date_paiement_societe
  FROM public.commissions c
  WHERE c.id = p_commission_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.commission_societe_admin_fields(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commission_societe_admin_fields(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.commissions_safe AS
SELECT
  c.id,
  c.commercial_id,
  c.type,
  c.libelle,
  c.reference_type,
  c.reference_id,
  c.montant_commercial,
  cf.montant_societe,
  c.statut,
  c.date_generation,
  c.date_validation,
  c.notes,
  c.created_at,
  c.date_paiement_commercial,
  cf.date_paiement_societe,
  c.facturee_at,
  c.facture_numero,
  jsonb_build_object('id', p.id, 'nom_complet', p.nom_complet, 'couleur', p.couleur) AS commercial
FROM public.commissions c
LEFT JOIN public.profiles p ON p.id = c.commercial_id
LEFT JOIN LATERAL public.commission_societe_admin_fields(c.id) cf ON true
WHERE public.is_admin_ou_manager() OR c.commercial_id = (SELECT auth.uid());

ALTER VIEW public.commissions_safe SET (security_invoker = true);
REVOKE ALL ON public.commissions_safe FROM PUBLIC, anon;
GRANT SELECT ON public.commissions_safe TO authenticated;

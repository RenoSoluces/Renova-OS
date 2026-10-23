-- Expose a role-filtered commission view. Commercials receive only their own
-- commercial amounts; the company's amount and payment date are NULL to them.
CREATE OR REPLACE VIEW public.commissions_safe AS
SELECT
  c.id,
  c.commercial_id,
  c.type,
  c.libelle,
  c.reference_type,
  c.reference_id,
  c.montant_commercial,
  CASE WHEN public.is_admin_ou_manager() THEN c.montant_societe ELSE NULL::numeric END AS montant_societe,
  c.statut,
  c.date_generation,
  c.date_validation,
  c.notes,
  c.created_at,
  c.date_paiement_commercial,
  CASE WHEN public.is_admin_ou_manager() THEN c.date_paiement_societe ELSE NULL::timestamptz END AS date_paiement_societe,
  c.facturee_at,
  c.facture_numero,
  jsonb_build_object('id', p.id, 'nom_complet', p.nom_complet, 'couleur', p.couleur) AS commercial
FROM public.commissions c
LEFT JOIN public.profiles p ON p.id = c.commercial_id
WHERE public.is_admin_ou_manager() OR c.commercial_id = (SELECT auth.uid());

REVOKE ALL ON public.commissions_safe FROM PUBLIC, anon;
GRANT SELECT ON public.commissions_safe TO authenticated;

-- The base table remains writable according to its existing RLS policies,
-- but the two company-only columns cannot be selected directly via the Data API.
REVOKE SELECT ON TABLE public.commissions FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, commercial_id, type, libelle, reference_type, reference_id,
  montant_commercial, statut, date_generation, date_validation, notes,
  created_at, date_paiement_commercial, facturee_at, facture_numero
) ON TABLE public.commissions TO authenticated;

-- A commercial must not read the company's payment schedules.
DROP POLICY IF EXISTS commission_echeances_select_scope ON public.commission_echeances;
CREATE POLICY commission_echeances_select_scope ON public.commission_echeances
FOR SELECT TO authenticated
USING (
  public.is_admin_ou_manager()
  OR (
    beneficiaire = 'commercial'
    AND EXISTS (
      SELECT 1 FROM public.commissions c
      WHERE c.id = commission_echeances.commission_id
        AND c.commercial_id = (SELECT auth.uid())
    )
  )
);

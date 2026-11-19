ALTER TABLE public.commission_factures
  ADD COLUMN IF NOT EXISTS date_validation timestamptz,
  ADD COLUMN IF NOT EXISTS validee_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_paiement timestamptz,
  ADD COLUMN IF NOT EXISTS motif_refus text;

ALTER TABLE public.commission_factures
  DROP CONSTRAINT IF EXISTS commission_factures_statut_check;

ALTER TABLE public.commission_factures
  ADD CONSTRAINT commission_factures_statut_check
  CHECK (statut IN ('a_preparer', 'deposee', 'validee', 'refusee', 'payee'));

COMMENT ON COLUMN public.commission_factures.date_validation IS 'Date de validation administrative de la facture de commission.';
COMMENT ON COLUMN public.commission_factures.validee_par IS 'Utilisateur ayant traité la facture de commission.';
COMMENT ON COLUMN public.commission_factures.date_paiement IS 'Date du paiement effectif de la facture de commission.';
COMMENT ON COLUMN public.commission_factures.motif_refus IS 'Motif communiqué en cas de refus de la facture.';
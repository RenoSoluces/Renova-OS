/*
  Suivi séparé du paiement des commissions commercial / société.

  Une commission peut désormais être payée au commercial et/ou à la société
  à des dates différentes. L'ancien statut reste conservé pour le workflow.
*/

ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS date_paiement_commercial timestamptz,
  ADD COLUMN IF NOT EXISTS date_paiement_societe timestamptz;

-- Les anciennes commissions déjà marquées "payee" sont considérées comme
-- payées des deux côtés à la date de validation existante.
UPDATE commissions
SET
  date_paiement_commercial = COALESCE(date_paiement_commercial, date_validation),
  date_paiement_societe = COALESCE(date_paiement_societe, date_validation)
WHERE statut = 'payee'
  AND date_validation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commissions_date_paiement_commercial
  ON commissions(date_paiement_commercial);

CREATE INDEX IF NOT EXISTS idx_commissions_date_paiement_societe
  ON commissions(date_paiement_societe);

-- Sécurité : seul un admin/manager peut renseigner ou modifier les paiements.
DROP POLICY IF EXISTS "commissions_update_admin" ON commissions;
CREATE POLICY "commissions_update_admin" ON commissions
  FOR UPDATE TO authenticated
  USING (is_admin_ou_manager())
  WITH CHECK (is_admin_ou_manager());

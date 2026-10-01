/* Facturation des prestations partenaires depuis un dossier.
   Une même commission société peut être découpée en plusieurs échéances
   (ex. 750 € à l'installation + 1 250 € au paiement MaPrimeRénov'). */
CREATE TABLE IF NOT EXISTS dossier_facturation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  montant_ht numeric(12,2) NOT NULL DEFAULT 0,
  taux_tva numeric(5,2) NOT NULL DEFAULT 20,
  declencheur text NOT NULL DEFAULT 'installation',
  statut text NOT NULL DEFAULT 'a_facturer',
  facturee_at timestamptz,
  facture_numero text,
  date_paiement timestamptz,
  ordre integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dossier_facturation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dossier_facturation_select ON dossier_facturation;
CREATE POLICY dossier_facturation_select ON dossier_facturation
  FOR SELECT TO authenticated
  USING (is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM dossiers d JOIN prospects p ON p.id=d.prospect_id
    WHERE d.id=dossier_facturation.dossier_id AND p.commercial_id=auth.uid()
  ));
DROP POLICY IF EXISTS dossier_facturation_write ON dossier_facturation;
CREATE POLICY dossier_facturation_write ON dossier_facturation
  FOR ALL TO authenticated
  USING (is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM dossiers d JOIN prospects p ON p.id=d.prospect_id
    WHERE d.id=dossier_facturation.dossier_id AND p.commercial_id=auth.uid()
  ))
  WITH CHECK (is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM dossiers d JOIN prospects p ON p.id=d.prospect_id
    WHERE d.id=dossier_facturation.dossier_id AND p.commercial_id=auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_dossier_facturation_dossier ON dossier_facturation(dossier_id, ordre);
CREATE INDEX IF NOT EXISTS idx_dossier_facturation_statut ON dossier_facturation(statut, facturee_at);
